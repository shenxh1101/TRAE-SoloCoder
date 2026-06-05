import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Preprocess from "@/pages/Preprocess";
import Forward from "@/pages/Forward";
import Inversion from "@/pages/Inversion";
import Results from "@/pages/Results";
import Catalog from "@/pages/Catalog";
import Alerts from "@/pages/Alerts";
import Report from "@/pages/Report";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/preprocess" element={<Preprocess />} />
          <Route path="/forward" element={<Forward />} />
          <Route path="/inversion" element={<Inversion />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/report" element={<Report />} />
        </Route>
      </Routes>
    </Router>
  );
}
