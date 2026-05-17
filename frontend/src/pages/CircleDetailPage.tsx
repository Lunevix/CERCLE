import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

export default function CircleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAuthStore();
  const qc = useQueryClient();

  const { data: circle } = useQuery({
    queryKey: ['circle', id],
    queryFn: () => api.get<any>(`/api/circles/${id}`),
  });
  const { data: members = [] } = useQuery({
    queryKey: ['circle-members', id],
    queryFn: () => api.get<any[]>(`/api/circles/${id}/members`),
  });
  const { data: payouts = [] } = useQuery({
    queryKey: ['circle-payouts', id],
    queryFn: () => api.get<any[]>(`/api/circles/${id}/payouts`),
  });

  const contribute = useMutation({
    mutationFn: () => api.post('/api/contributions', { circle_id: Number(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['circle', id] }),
  });

  if (!circle) return <p className="muted">Loading…</p>;

  const isMember = members.some((m: any) => m.address === address);
  const payoutData = members.map((m: any, i: number) => ({
    name: `${m.address.slice(0, 4)}…`,
    cycle: i + 1,
    isPaid: payouts.some((p: any) => p.member_id === m.id),
    isNext: i + 1 === circle.current_cycle,
  }));

  return (
    <div className="stack">
      <div className="row">
        <div>
          <h2>{circle.name}</h2>
          <p className="muted">
            {(circle.contribution_amount / 10_000_000).toFixed(2)} XLM · {circle.cycle_length_days}d cycles
          </p>
        </div>
        <span className="spacer" />
        <span className={`badge ${circle.status}`}>{circle.status}</span>
      </div>

      {/* Payout rotation chart */}
      <div className="card">
        <p style={{ marginBottom: '0.75rem', fontWeight: 600 }}>Payout Rotation</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={payoutData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8888aa' }} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
              formatter={(_: any, __: any, props: any) => [`Cycle ${props.payload.cycle}`, '']}
            />
            <Bar dataKey="cycle" radius={[4, 4, 0, 0]}>
              {payoutData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isPaid ? '#00d4aa' : entry.isNext ? '#6c63ff' : '#2a2a4a'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="row muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
          <span style={{ color: '#00d4aa' }}>■</span> Paid
          <span style={{ color: '#6c63ff' }}>■</span> Next
          <span style={{ color: '#2a2a4a', border: '1px solid #444', padding: '0 2px' }}>■</span> Pending
        </div>
      </div>

      {/* Members list */}
      <div className="card stack" style={{ gap: '0.5rem' }}>
        <p style={{ fontWeight: 600 }}>Members ({members.length}/{circle.max_members})</p>
        {members.map((m: any, i: number) => (
          <div key={m.id} className="row" style={{ fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--c-muted)', width: 20 }}>{i + 1}.</span>
            <span>{m.address.slice(0, 8)}…{m.address.slice(-4)}</span>
            {m.address === address && <span className="badge active">you</span>}
            <span className="spacer" />
            {payouts.find((p: any) => p.member_id === m.id)
              ? <span style={{ color: 'var(--c-accent)', fontSize: '0.75rem' }}>✓ paid</span>
              : null}
          </div>
        ))}
      </div>

      {/* Actions */}
      {isMember && circle.status === 'active' && (
        <button
          className="primary"
          onClick={() => contribute.mutate()}
          disabled={contribute.isPending}
        >
          {contribute.isPending ? 'Submitting…' : `Contribute ${(circle.contribution_amount / 10_000_000).toFixed(2)} XLM`}
        </button>
      )}
      {!isMember && circle.status !== 'closed' && (
        <button
          className="accent"
          onClick={() => api.post('/api/members/join', { circle_id: Number(id) })}
        >
          Join Circle
        </button>
      )}
    </div>
  );
}
