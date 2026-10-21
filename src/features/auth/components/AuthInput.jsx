export default function AuthInput({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
  required = true,
}) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
      />
    </div>
  );
}