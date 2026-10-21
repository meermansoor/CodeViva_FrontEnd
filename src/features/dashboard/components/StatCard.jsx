export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "purple",
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={19} strokeWidth={1.9} />
      </div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}