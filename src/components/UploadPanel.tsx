"use client";

import { useRef, useState } from "react";
import { AlertIcon, UploadIcon } from "./Icons";
import { Button } from "./ui";
import type { ParseIssue } from "@/lib/types";

interface Props {
  onFile: (text: string, filename: string) => void;
  onSample: () => void;
  issues: ParseIssue[];
  filename: string | null;
  stopCount: number;
  busy: boolean;
}

export default function UploadPanel({
  onFile,
  onSample,
  issues,
  filename,
  stopCount,
  busy,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const read = async (file: File) => {
    setReadError(null);
    if (file.size > 5_000_000) {
      setReadError("That file is over 5 MB. Trim it to the rows you need.");
      return;
    }
    try {
      onFile(await file.text(), file.name);
    } catch {
      setReadError("Could not read that file. Try re-saving it as CSV.");
    }
  };

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <section aria-labelledby="upload-heading">
      <h2 id="upload-heading" className="rf-label mb-2.5">
        Your locations
      </h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void read(file);
        }}
        className={`rounded-xl border border-dashed px-4 py-5 text-center transition-colors duration-150 ${
          dragging
            ? "border-[var(--rf-accent)] bg-[var(--rf-accent-soft)]"
            : "border-rule-strong bg-panel-2"
        }`}
      >
        <UploadIcon size={22} className="mx-auto text-ink-3" />

        {filename ? (
          <p className="mt-2 truncate text-sm font-medium text-ink" title={filename}>
            {filename}
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-2">
            Drop your CSV here, or
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={() => inputRef.current?.click()}
            loading={busy}
            className="!py-1.5"
          >
            {filename ? "Choose another file" : "Choose a file"}
          </Button>
          {!filename && (
            <Button variant="ghost" onClick={onSample} className="!py-1.5">
              Try a sample run
            </Button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void read(file);
            e.target.value = "";
          }}
        />
      </div>

      {stopCount > 0 && (
        <p className="mt-2.5 text-xs text-ink-2">
          <span className="rf-num text-ink">{stopCount - 1}</span> stops from one
          storage house.
        </p>
      )}

      {readError && <Notice tone="bad">{readError}</Notice>}

      {errors.length > 0 && (
        <Notice tone="bad">
          <strong className="font-medium">
            {errors.length === 1
              ? "1 row could not be used"
              : `${errors.length} rows could not be used`}
          </strong>
          <ul className="mt-1.5 space-y-1">
            {errors.slice(0, 4).map((issue, i) => (
              <li key={i} className="flex gap-1.5">
                {issue.row > 0 && (
                  <span className="rf-num shrink-0 opacity-70">
                    L{issue.row}
                  </span>
                )}
                <span>{issue.message}</span>
              </li>
            ))}
            {errors.length > 4 && (
              <li className="opacity-70">and {errors.length - 4} more</li>
            )}
          </ul>
        </Notice>
      )}

      {warnings.length > 0 && (
        <Notice tone="warn">
          <ul className="space-y-1">
            {warnings.slice(0, 3).map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
            {warnings.length > 3 && (
              <li className="opacity-70">and {warnings.length - 3} more</li>
            )}
          </ul>
        </Notice>
      )}
    </section>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "bad" | "warn";
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "bad" ? "alert" : "status"}
      className="mt-2.5 flex gap-2 rounded-lg border px-3 py-2.5 text-xs leading-relaxed"
      style={{
        borderColor: tone === "bad" ? "var(--rf-bad)" : "var(--rf-rule-strong)",
        background:
          tone === "bad" ? "var(--rf-bad-soft)" : "var(--rf-panel-2)",
        color: tone === "bad" ? "var(--rf-bad)" : "var(--rf-ink-2)",
      }}
    >
      <AlertIcon size={15} className="mt-px shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
