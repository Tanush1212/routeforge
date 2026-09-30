"use client";

import { APIProvider, Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useRef } from "react";
import type { RoutePlan, Stop } from "@/lib/types";

interface Props {
  apiKey: string;
  stops: Stop[];
  after: RoutePlan | null;
  before: RoutePlan | null;
  showBefore: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  drawKey: number;
  themeKey: string;
}

/**
 * Basemap styling is deliberately desaturated: the route is the subject, and
 * a full-color Google basemap competes with it for the same attention.
 */
function mapStyles(dark: boolean): google.maps.MapTypeStyle[] {
  const ground = dark ? "#1b1915" : "#f4f1eb";
  const water = dark ? "#11100d" : "#e4e7e2";
  const road = dark ? "#2a2721" : "#fffdfa";
  const roadEdge = dark ? "#35312a" : "#e6e0d4";
  const label = dark ? "#8a8375" : "#8a8375";
  const labelHalo = dark ? "#14130f" : "#fffdfa";

  return [
    { elementType: "geometry", stylers: [{ color: ground }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: label }] },
    { elementType: "labels.text.stroke", stylers: [{ color: labelHalo }] },
    {
      featureType: "administrative",
      elementType: "geometry.stroke",
      stylers: [{ color: roadEdge }],
    },
    {
      featureType: "poi",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: dark ? "#1f231c" : "#eaeee6" }, { visibility: "on" }],
    },
    { featureType: "road", elementType: "geometry", stylers: [{ color: road }] },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: roadEdge }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: dark ? "#332e26" : "#f6f1e6" }],
    },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: water }] },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: dark ? "#3c4a4a" : "#b9c2bd" }],
    },
  ];
}

function cssVar(name: string): string {
  if (typeof window === "undefined") return "#c6460a";
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    "#c6460a"
  );
}

function stopPin(index: number, accent: string, onAccent: string, panel: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
<circle cx="15" cy="15" r="12" fill="${accent}" stroke="${panel}" stroke-width="2.5"/>
<text x="15" y="15.5" text-anchor="middle" dominant-baseline="central" fill="${onAccent}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="600">${index}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function depotPin(ink: string, panel: string, canvas: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
<rect x="3.5" y="3.5" width="27" height="27" rx="6" fill="${ink}" stroke="${panel}" stroke-width="2.5"/>
<path d="M11 17.5 17 11.5l6 6V24a.9.9 0 0 1-.9.9H11.9A.9.9 0 0 1 11 24z" fill="none" stroke="${canvas}" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function Overlays({
  stops,
  after,
  before,
  showBefore,
  selectedId,
  onSelect,
  drawKey,
  themeKey,
}: Omit<Props, "apiKey">) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const afterLineRef = useRef<google.maps.Polyline | null>(null);
  const beforeLineRef = useRef<google.maps.Polyline | null>(null);
  const rafRef = useRef<number>(0);

  const byId = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);

  const visitIndex = useMemo(() => {
    const order = new Map<string, number>();
    if (!after) {
      stops.forEach((s, i) => order.set(s.id, i));
      return order;
    }
    let n = 0;
    for (const id of after.order) {
      if (order.has(id)) continue;
      order.set(id, n);
      n++;
    }
    return order;
  }, [after, stops]);

  // Markers
  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const accent = cssVar("--rf-accent");
    const onAccent = cssVar("--rf-on-accent");
    const panel = cssVar("--rf-panel");
    const ink = cssVar("--rf-ink");
    const canvas = cssVar("--rf-canvas");

    for (const stop of stops) {
      const isDepot = stop.kind === "depot";
      const index = visitIndex.get(stop.id) ?? 0;
      const selected = selectedId === stop.id;

      const marker = new google.maps.Marker({
        map,
        position: { lat: stop.lat, lng: stop.lng },
        title: isDepot ? `${stop.name} — storage house` : `${index}. ${stop.name}`,
        zIndex: isDepot ? 1000 : selected ? 900 : 100 + index,
        icon: {
          url: isDepot
            ? depotPin(ink, panel, canvas)
            : stopPin(index, accent, onAccent, panel),
          scaledSize: new google.maps.Size(
            isDepot ? 34 : selected ? 36 : 30,
            isDepot ? 34 : selected ? 36 : 30,
          ),
          anchor: new google.maps.Point(
            isDepot ? 17 : selected ? 18 : 15,
            isDepot ? 17 : selected ? 18 : 15,
          ),
        },
      });

      marker.addListener("click", () =>
        onSelect(selectedId === stop.id ? null : stop.id),
      );
      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, stops, visitIndex, selectedId, onSelect, themeKey]);

  // The route the user arrived with, dashed and recessive.
  useEffect(() => {
    if (!map) return;

    beforeLineRef.current?.setMap(null);
    beforeLineRef.current = null;

    if (!before || !showBefore) return;

    const path = before.order
      .map((id) => byId.get(id))
      .filter((s): s is Stop => Boolean(s))
      .map((s) => ({ lat: s.lat, lng: s.lng }));

    beforeLineRef.current = new google.maps.Polyline({
      map,
      path,
      geodesic: true,
      strokeOpacity: 0,
      zIndex: 10,
      icons: [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: 0.6,
            strokeColor: cssVar("--rf-before"),
            strokeWeight: 1.75,
            scale: 3,
          },
          offset: "0",
          repeat: "13px",
        },
      ],
    });

    return () => {
      beforeLineRef.current?.setMap(null);
      beforeLineRef.current = null;
    };
  }, [map, before, showBefore, byId, themeKey]);

  // The optimized route, drawing itself in.
  useEffect(() => {
    if (!map) return;

    cancelAnimationFrame(rafRef.current);
    afterLineRef.current?.setMap(null);
    afterLineRef.current = null;

    if (!after) return;

    const path = after.order
      .map((id) => byId.get(id))
      .filter((s): s is Stop => Boolean(s))
      .map((s) => new google.maps.LatLng(s.lat, s.lng));

    if (path.length < 2) return;

    const line = new google.maps.Polyline({
      map,
      path: [],
      geodesic: true,
      strokeColor: cssVar("--rf-accent"),
      strokeOpacity: 1,
      strokeWeight: 3.5,
      zIndex: 50,
    });
    afterLineRef.current = line;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      line.setPath(path);
      return;
    }

    // Interpolate along the vertex list so the line grows rather than popping.
    const duration = 760;
    const started = performance.now();
    const segments = path.length - 1;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const exact = eased * segments;
      const whole = Math.floor(exact);
      const frac = exact - whole;

      const partial = path.slice(0, whole + 1);
      if (whole < segments) {
        partial.push(
          google.maps.geometry?.spherical
            ? google.maps.geometry.spherical.interpolate(
                path[whole],
                path[whole + 1],
                frac,
              )
            : path[whole],
        );
      }

      line.setPath(partial);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      line.setMap(null);
      afterLineRef.current = null;
    };
  }, [map, after, byId, drawKey, themeKey]);

  // Frame the run whenever the set of locations changes.
  useEffect(() => {
    if (!map || stops.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
    map.fitBounds(bounds, { top: 72, right: 72, bottom: 72, left: 72 });
  }, [map, stops]);

  // Ease to a stop when it is selected in the list.
  useEffect(() => {
    if (!map || !selectedId) return;
    const stop = byId.get(selectedId);
    if (stop) map.panTo({ lat: stop.lat, lng: stop.lng });
  }, [map, selectedId, byId]);

  return null;
}

export default function GoogleMapCanvas({ apiKey, ...rest }: Props) {
  const dark = rest.themeKey === "dark";

  return (
    <APIProvider apiKey={apiKey} libraries={["geometry"]}>
      <GoogleMap
        className="h-full w-full"
        defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
        defaultZoom={11}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        styles={mapStyles(dark)}
        onClick={() => rest.onSelect(null)}
      >
        <Overlays {...rest} />
      </GoogleMap>
    </APIProvider>
  );
}
