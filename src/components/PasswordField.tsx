"use client";

import { useId, useState, type ReactNode } from "react";

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  placeholder,
  disabled,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  const genId = useId();
  const showId = `${genId}-show`;
  const [show, setShow] = useState(false);

  return (
    <div>
      {label ? <label className="field-label" htmlFor={id}>{label}</label> : null}
      <div className="relative mt-1.5">
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          className="input-field pr-24"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          id={showId}
          disabled={disabled}
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
