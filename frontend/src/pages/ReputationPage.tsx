import { useQuery } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

export default function ReputationPage() {
  const { address } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['reputation', address],
    queryFn: () => api.get<any>(`/api/members/${address}/reputation`),
    enabled: !!address,
  });

  if (isLoading) return <p className="muted">Loading…</p>;
  if (!data) return null;

  const score = data.score ?? 500;
  const pct = (score / 1000) * 100;
  const color = score >= 700 ? '#00d4aa' : score >= 400 ? '#6c63ff' : '#ff4757';

  return (
    <div className="stack">
      <h2>Reputation Score</h2>

      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart
            innerRadius="60%"
            outerRadius="90%"
            data={[{ value: pct, fill: color }]}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#2a2a4a' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: '-3rem' }}>
          <p style={{ fontSize: '3rem', fontWeight: 700, color }}>{score}</p>
          <p className="muted">out of 1000</p>
        </div>
      </div>

      <div className="card stack" style={{ gap: '0.75rem' }}>
        <Stat label="On-time contributions" value={data.on_time_count ?? 0} />
        <Stat label="Total contributions" value={data.total_contributions ?? 0} />
        <Stat
          label="Reliability rate"
          value={data.total_contributions > 0
            ? `${Math.round((data.on_time_count / data.total_contributions) * 100)}%`
            : 'N/A'}
        />
      </div>

      <div className="card muted" style={{ fontSize: '0.8rem' }}>
        <p>Score improves with on-time contributions (+10) and decreases with late payments (−5) or defaults (−50).</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="row">
      <span className="muted">{label}</span>
      <span className="spacer" />
      <strong>{value}</strong>
    </div>
  );
}
