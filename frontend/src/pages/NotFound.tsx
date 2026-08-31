import { Link } from 'react-router-dom';
export default function NotFound() {
  return <div style={{ padding: 20 }}><h1>404 — Page not found</h1><Link to="/">Go home</Link></div>;
}