"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { SpinnerIcon } from "./Icons";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--rf-accent)] text-[var(--rf-on-accent)] px-4 py-2.5 shadow-[var(--rf-shadow-sm)] hover:bg-[var(--rf-accent-hover)] active:translate-y-px",
  secondary:
    "border border-rule bg-panel text-ink px-3.5 py-2 hover:bg-panel-2 hover:border-rule-strong active:translate-y-px",
  ghost:
    "text-ink-2 px-2.5 py-1.5 hover:bg-panel-2 hover:text-ink active:translate-y-px",
};

export function Button({
  variant = "secondary",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? <SpinnerIcon size={16} /> : icon}
      {children}
    </button>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "time";
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
  id: string;
}

export function Field({
  label,
  hint,
  suffix,
  value,
  onChange,
  type = "number",
  min,
  max,
  step,
  invalid,
  id,
}: FieldProps) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-2">
        {label}
      </label>
      <div
        className={`flex items-center rounded-lg border bg-panel transition-colors duration-150 focus-within:border-[var(--rf-accent)] ${
          invalid ? "border-[var(--rf-bad)]" : "border-rule hover:border-rule-strong"
        }`}
      >
        <input
          id={id}
          type={type}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="rf-num w-full min-w-0 bg-transparent px-2.5 py-2 text-sm text-ink outline-none"
        />
        {suffix && (
          <span className="shrink-0 pr-2.5 text-xs text-ink-3">{suffix}</span>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[11px] leading-snug text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  id: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-xs font-medium text-ink-2">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-ink-3">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-150 ${
          checked
            ? "border-[var(--rf-accent)] bg-[var(--rf-accent)]"
            : "border-rule-strong bg-panel-2"
        }`}
      >
        <span
          className={`absolute top-1/2 block h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-panel shadow-[var(--rf-shadow-sm)] transition-[left] duration-150 ${
            checked ? "left-[18px]" : "left-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-rule bg-panel-2 p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
              active
                ? "bg-panel text-ink shadow-[var(--rf-shadow-sm)]"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
