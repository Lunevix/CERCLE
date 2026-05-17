import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

interface FormState {
  name: string;
  contribution_amount: number;
  cycle_length_days: number;
  max_members: number;
  insurance_bps: number;
}

export default function CreateCirclePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    name: '',
    contribution_amount: 10,
    cycle_length_days: 30,
    max_members: 5,
    insurance_bps: 200,
  });

  const create = useMutation({
    mutationFn: () => api.post<{ id: number }>('/api/circles', {
      ...form,
      contribution_amount: Math.round(form.contribution_amount * 10_000_000),
    }),
    onSuccess: (data) => navigate(`/circles/${data.id}`),
  });

  const set = <K extends keyof FormState>(k: K) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm(f => ({
      ...f,
      [k]: value as FormState[K]
    }));
  };

  return (
    <div className="stack">
      <h2>Create a Circle</h2>

      <div className="card stack">
        <label>
          <p style={{ marginBottom: '0.4rem', fontSize: '0.875rem' }}>Circle Name</p>
          <input value={form.name} onChange={set('name')} placeholder="e.g. Nairobi Women's Group" />
        </label>

        <label>
          <p style={{ marginBottom: '0.4rem', fontSize: '0.875rem' }}>Contribution (XLM)</p>
          <input type="number" min="1" value={form.contribution_amount} onChange={set('contribution_amount')} />
        </label>

        <label>
          <p style={{ marginBottom: '0.4rem', fontSize: '0.875rem' }}>Cycle Length (days)</p>
          <input type="number" min="1" max="365" value={form.cycle_length_days} onChange={set('cycle_length_days')} />
        </label>

        <label>
          <p style={{ marginBottom: '0.4rem', fontSize: '0.875rem' }}>Max Members</p>
          <input type="number" min="2" max="100" value={form.max_members} onChange={set('max_members')} />
        </label>

        <label>
          <p style={{ marginBottom: '0.4rem', fontSize: '0.875rem' }}>Insurance Rate (basis points, 200 = 2%)</p>
          <input type="number" min="0" max="1000" value={form.insurance_bps} onChange={set('insurance_bps')} />
        </label>

        <div className="card" style={{ background: 'var(--c-bg)', fontSize: '0.875rem' }}>
          <p className="muted">Summary</p>
          <p>Pool per cycle: <strong>{(form.contribution_amount * form.max_members).toFixed(2)} XLM</strong></p>
          <p>Insurance per contribution: <strong>{(form.contribution_amount * form.insurance_bps / 10000).toFixed(4)} XLM</strong></p>
        </div>

        {create.error && (
          <p style={{ color: 'var(--c-danger)', fontSize: '0.875rem' }}>
            {(create.error as Error).message}
          </p>
        )}

        <button
          className="primary"
          onClick={() => create.mutate()}
          disabled={create.isPending || !form.name}
        >
          {create.isPending ? 'Creating…' : 'Create Circle'}
        </button>
      </div>
    </div>
  );
}
