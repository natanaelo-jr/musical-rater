import { useId } from "react";

type BaseFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  name?: string;
  autoComplete?: string;
  spellCheck?: boolean;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const inferAutoComplete = (label: string, type: string, provided?: string) => {
  if (provided) {
    return provided;
  }

  const normalizedLabel = label.toLowerCase();
  if (type === "email" || normalizedLabel.includes("email")) {
    return "email";
  }
  if (normalizedLabel.includes("username")) {
    return "username";
  }
  if (normalizedLabel.includes("display name") || normalizedLabel === "name") {
    return "name";
  }
  if (normalizedLabel.includes("avatar")) {
    return "url";
  }
  if (type === "password" || normalizedLabel.includes("password")) {
    return "current-password";
  }
  return "off";
};

const fieldClass =
  "w-full rounded-2xl border border-foreground/14 bg-white/4 px-4 py-[14px] text-foreground/82 placeholder:text-foreground/42 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-panel";

export const Field = ({
  label,
  value,
  onChange,
  type = "text",
  error,
  helperText,
  placeholder,
  name,
  autoComplete,
  spellCheck,
}: BaseFieldProps & {
  type?: string;
}) => {
  const generatedId = useId();
  const inputId = `${generatedId}-${slugify(name ?? label) || "field"}`;
  const helperId = helperText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-2.5">
      <label className="text-sm text-primary" htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={describedBy}
        aria-errormessage={errorId}
        aria-invalid={Boolean(error)}
        autoComplete={inferAutoComplete(label, type, autoComplete)}
        className={fieldClass}
        id={inputId}
        name={name ?? slugify(label)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={spellCheck}
        type={type}
        value={value}
      />
      {helperText ? (
        <small className="leading-6 text-foreground/68" id={helperId}>
          {helperText}
        </small>
      ) : null}
      {error ? (
        <small className="leading-6 text-danger" id={errorId} role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
};

export const TextAreaField = ({
  label,
  value,
  onChange,
  error,
  helperText,
  placeholder,
  name,
  autoComplete,
  spellCheck,
}: BaseFieldProps) => {
  const generatedId = useId();
  const inputId = `${generatedId}-${slugify(name ?? label) || "field"}`;
  const helperId = helperText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-2.5">
      <label className="text-sm text-primary" htmlFor={inputId}>
        {label}
      </label>
      <textarea
        aria-describedby={describedBy}
        aria-errormessage={errorId}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete ?? "off"}
        className={`${fieldClass} min-h-28 resize-y`}
        id={inputId}
        name={name ?? slugify(label)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        spellCheck={spellCheck}
        value={value}
      />
      {helperText ? (
        <small className="leading-6 text-foreground/68" id={helperId}>
          {helperText}
        </small>
      ) : null}
      {error ? (
        <small className="leading-6 text-danger" id={errorId} role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
};

export const focusFirstFieldError = (errors: Record<string, string>) => {
  const fieldName = Object.keys(errors).find((key) => !["form", "credentials"].includes(key));

  if (!fieldName) {
    return;
  }

  const target = document.getElementsByName(fieldName).item(0);
  if (target instanceof HTMLElement) {
    target.focus();
  }
};
