const toneMap = {
  Active: "active",
  Scheduled: "scheduled",
  Completed: "completed",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${toneMap[status] || "completed"}`}>
      {status}
    </span>
  );
}