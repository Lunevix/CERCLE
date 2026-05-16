import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectWallet } from '../lib/wallet';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleConnect() {
    setLoading(true);
    setError('');
    try {
      const address = await connectWallet();
      const { nonce } = await api.post<{ nonce: string }>('/api/auth/challenge', { address });

      // Sign nonce with Freighter
      const { signTransaction } = await import('@stellar/freighter-api');
      // For auth we sign a simple message — in production use SEP-10
      const sig = btoa(nonce); // placeholder; real impl uses Freighter signMessage

      const { token } = await api.post<{ token: string }>('/api/auth/verify', {
        address,
        signature: sig,
      });
      setAuth(token, address);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      gap: '2rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>◎</div>
        <h1 style={{ fontSize: '2rem', color: 'var(--c-primary)' }}>CERCLE</h1>
        <p className="muted">Community Savings Circles on Stellar</p>
      </div>

      <div className="card stack" style={{ width: '100%', maxWidth: 360 }}>
        <button className="primary" onClick={handleConnect} disabled={loading}>
          {loading ? 'Connecting…' : '🔗 Connect Freighter Wallet'}
        </button>
        {error && <p style={{ color: 'var(--c-danger)', fontSize: '0.875rem' }}>{error}</p>}
        <p className="muted" style={{ textAlign: 'center', fontSize: '0.8rem' }}>
          No wallet? Use SMS: dial *384*CERCLE#
        </p>
      </div>
    </div>
  );
}
