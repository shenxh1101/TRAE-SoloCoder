import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { ToastContainer } from "@/components/common/Toast";
import Dashboard from "@/pages/Dashboard";
import TaskList from "@/pages/TaskList";
import CreateTask from "@/pages/CreateTask";
import Visualization from "@/pages/Visualization";
import Monitoring from "@/pages/Monitoring";
import AlertCenter from "@/pages/AlertCenter";
import NoiseReduction from "@/pages/NoiseReduction";
import Approvals from "@/pages/Approvals";
import Reports from "@/pages/Reports";
import Analytics from "@/pages/Analytics";
import Recommendations from "@/pages/Recommendations";

export default function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<TaskList />} />
          <Route path="tasks/new" element={<CreateTask />} />
          <Route path="visualization" element={<Visualization />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="alerts" element={<AlertCenter />} />
          <Route path="solution" element={<NoiseReduction />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="reports" element={<Reports />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="recommendations" element={<Recommendations />} />
        </Route>
      </Routes>
    </Router>
  );
}
