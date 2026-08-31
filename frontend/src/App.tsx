import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL;

type Part = {
  id: number;
  name: string;
  make: string;
  model: string;
  year: number;
  price: number;
};

function App() {
  const [parts, setParts] = useState<Part[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/parts`)
      .then(res => res.json())
      .then((data: Part[]) => setParts(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>WN Wrecker — connection test</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <p>{parts.length} part(s) loaded from the API.</p>
      <ul>
        {parts.map(p => (
          <li key={p.id}>{p.name} — {p.make} {p.model} {p.year} — ${p.price}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;