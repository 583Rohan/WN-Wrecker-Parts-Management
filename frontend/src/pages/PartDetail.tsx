import { useParams } from 'react-router-dom';
export default function PartDetail() {
  const { id } = useParams();
  return <div><h1>Part #{id}</h1><p>Part details coming soon.</p></div>;
}