import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Orders from '@/pages/Orders';
import OrderCreate from '@/pages/OrderCreate';
import OrderDetail from '@/pages/OrderDetail';
import Quality from '@/pages/Quality';
import Warehouse from '@/pages/Warehouse';
import Suppliers from '@/pages/Suppliers';
import Reports from '@/pages/Reports';
import Messages from '@/pages/Messages';
import { useStore } from '@/store';

export default function App() {
  const { startPolling, stopPolling, fetchOrders, fetchMaterials, fetchSuppliers } = useStore();

  useEffect(() => {
    fetchOrders();
    fetchMaterials();
    fetchSuppliers();
    startPolling();
    return () => stopPolling();
  }, [fetchOrders, fetchMaterials, fetchSuppliers, startPolling, stopPolling]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/create" element={<OrderCreate />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/quality" element={<Quality />} />
          <Route path="/warehouse" element={<Warehouse />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/messages" element={<Messages />} />
        </Route>
      </Routes>
    </Router>
  );
}
