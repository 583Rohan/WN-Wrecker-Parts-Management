import { Link } from 'react-router-dom';
export default function AdminHome() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Admin dashboard</h1>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))' }}>
        <Link to="/admin/parts" className="card card-body"><h3>Manage Parts</h3><p className="muted">Add, edit, delete parts and upload photos.</p></Link>
        <Link to="/admin/chats" className="card card-body"><h3>Chat Management</h3><p className="muted">View and reply to customer enquiries, set statuses.</p></Link>
      </div>
    </div>
  );
}