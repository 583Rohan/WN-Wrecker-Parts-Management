import { Link } from 'react-router-dom';

export default function AdminHome() {
  return (
    <div>
      <h1>Admin Home</h1>
      <ul>
        <li><Link to="/admin/parts">Manage Parts</Link></li>
        <li><Link to="/admin/chats">Chat Management</Link></li>
      </ul>
    </div>
  );
}