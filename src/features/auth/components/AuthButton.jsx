export default function AuthButton({
  children,
  type = "submit",
  disabled = false,
}) {
  return (
    <button className="auth-button" type={type} disabled={disabled}>
      {children}
    </button>
  );
}