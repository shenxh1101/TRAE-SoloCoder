import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Editor } from "@/pages/Editor";
import { Favorites } from "@/pages/Favorites";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Editor />} />
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </Router>
  );
}
