import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Circle {
  id: number;
  name: string;
  status: string;
  current_cycle: number;
  max_members: number;
  contribution_amount: number;
  cycle_length_days: number;
}

export default function DashboardPage() {
  const { data: circles = [], isLoading } = useQuery({
    queryKey: ['circles'],
    queryFn: () => api.get<Circle[]>('/api/circles'),
  });

  return (
    <div className="stack">
      <div className="row">
        <h2>My Circles</h2>
        <span className="spacer" />
        <Link to="/circles/new">
          <button className="accent" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            + New Circle
          </button>
        </Link>
      </div>

      {isLoading && <p className="muted">Loading…</p>}

      {!isLoading && circles.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No circles yet.</p>
          <p className="muted">Create or join a savings circle to get started.</p>
        </div>
      )}

      {circles.map(c => (
        <Link key={c.id} to={`/circles/${c.id}`} style={{ textDecoration: 'none' }}>
          <div className="card stack" style={{ gap: '0.5rem' }}>
            <div className="row">
              <strong>{c.name}</strong>
              <span className="spacer" />
              <span className={`badge ${c.status}`}>{c.status}</span>
            </div>
            <div className="row muted">
              <span>Cycle {c.current_cycle}</span>
              <span>·</span>
              <span>{(c.contribution_amount / 10_000_000).toFixed(2)} XLM / {c.cycle_length_days}d</span>
              <span>·</span>
              <span>{c.max_members} members</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
