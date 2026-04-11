export const Field = ({
  label,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  placeholder?: string;
}) => (
  <label className="field">
    <span>{label}</span>
    <input
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      value={value}
    />
    {error ? <small>{error}</small> : null}
  </label>
);

export const TextAreaField = ({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) => (
  <label className="field">
    <span>{label}</span>
    <textarea
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
      value={value}
    />
    {error ? <small>{error}</small> : null}
  </label>
);
