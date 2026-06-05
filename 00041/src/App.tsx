import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import AdminLayout from '@/components/AdminLayout';
import Home from '@/pages/Home';
import Booking from '@/pages/Booking';
import OrderDetail from '@/pages/OrderDetail';
import Review from '@/pages/Review';
import StaffManagement from '@/pages/admin/StaffManagement';
import OrderQuery from '@/pages/admin/OrderQuery';
import Reports from '@/pages/admin/Reports';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/review/:id" element={<Review />} />
        </Route>
        <Route element={<AdminLayout />}>
          <Route path="/admin/staff" element={<StaffManagement />} />
          <Route path="/admin/orders" element={<OrderQuery />} />
          <Route path="/admin/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}
