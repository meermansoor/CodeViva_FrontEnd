import { Route, Routes } from "react-router-dom";
import StudentPortal from "../pages/StudentPortal";

export default function StudentPortalRouter() {
  return (
    <Routes>
      <Route path="/" element={<StudentPortal />} />
    </Routes>
  );
}
