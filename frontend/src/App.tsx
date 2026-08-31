import { Routes, Route } from 'react-router-dom';
import CustomerHome from './CustomerHome';
import AdminDashboard from './AdminDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerHome />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}

export default App;