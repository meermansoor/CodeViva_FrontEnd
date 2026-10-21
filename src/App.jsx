import { BrowserRouter } from "react-router-dom";
import AppRouter from "./app/router/AppRouter";

function Placeholder({ title }) {
  return <div style={{ padding: 40, fontFamily: "Inter, sans-serif" }}><h1>{title}</h1><p>This module is ready to be implemented next.</p></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
