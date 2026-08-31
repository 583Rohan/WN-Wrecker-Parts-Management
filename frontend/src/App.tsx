import { Routes, Route } from 'react-router-dom';
import CustomerLayout from './components/CustomerLayout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import Parts from './pages/Parts';
import PartDetail from './pages/PartDetail';
import Finder from './pages/Finder';
import Cart from './pages/Cart';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import AdminHome from './pages/Admin/AdminHome';
import ManageParts from './pages/Admin/ManageParts';
import ChatManagement from './pages/Admin/ChatManagement';

function App() {
  return (
    <Routes>
      {/* customer site — shared layout with nav + chat widget */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/parts" element={<Parts />} />
        <Route path="/parts/:id" element={<PartDetail />} />
        <Route path="/finder" element={<Finder />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* admin area — login gate + admin nav */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
        <Route path="parts" element={<ManageParts />} />
        <Route path="chats" element={<ChatManagement />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;