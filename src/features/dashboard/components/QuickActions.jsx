import {
  BarChart3,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <section className="panel quick-panel">
      <h2>Quick Actions</h2>

      <button className="primary-action" onClick={() => navigate("/sessions")}>
        <Plus size={14} />
        Create New Viva
      </button>

      <button className="secondary-action" onClick={() => navigate("/analytics")}>
        <BarChart3 size={13} />
        View Global Analytics
      </button>
    </section>
  );
}