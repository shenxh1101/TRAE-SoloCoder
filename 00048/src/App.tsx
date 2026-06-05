import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Report from "@/pages/Report";
import Rescue from "@/pages/Rescue";
import RescueDetail from "@/pages/RescueDetail";
import AnimalDetail from "@/pages/AnimalDetail";
import Adopt from "@/pages/Adopt";
import AdoptQuestionnaire from "@/pages/AdoptQuestionnaire";
import AdoptMatch from "@/pages/AdoptMatch";
import AdoptAppointment from "@/pages/AdoptAppointment";
import AdoptAgreement from "@/pages/AdoptAgreement";
import FollowUpPage from "@/pages/FollowUpPage";
import Donate from "@/pages/Donate";
import DonateCertificate from "@/pages/DonateCertificate";
import Fundraise from "@/pages/Fundraise";
import FundraiseDetail from "@/pages/FundraiseDetail";
import Profile from "@/pages/Profile";
import VolunteerCert from "@/pages/VolunteerCert";
import Admin from "@/pages/Admin";
import AdminHeatmap from "@/pages/AdminHeatmap";
import AdminReports from "@/pages/AdminReports";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<Report />} />
          <Route path="/rescue" element={<Rescue />} />
          <Route path="/rescue/:id" element={<RescueDetail />} />
          <Route path="/animal/:id" element={<AnimalDetail />} />
          <Route path="/adopt" element={<Adopt />} />
          <Route path="/adopt/questionnaire" element={<AdoptQuestionnaire />} />
          <Route path="/adopt/match" element={<AdoptMatch />} />
          <Route path="/adopt/appointment" element={<AdoptAppointment />} />
          <Route path="/adopt/agreement" element={<AdoptAgreement />} />
          <Route path="/followup" element={<FollowUpPage />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/donate/certificate" element={<DonateCertificate />} />
          <Route path="/fundraise" element={<Fundraise />} />
          <Route path="/fundraise/:id" element={<FundraiseDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/volunteer" element={<VolunteerCert />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/heatmap" element={<AdminHeatmap />} />
          <Route path="/admin/reports" element={<AdminReports />} />
        </Route>
      </Routes>
    </Router>
  );
}
