import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
            const { nonce } = await api.post('/api/auth/challenge', { address });
            // Sign nonce with Freighter
            // For auth we sign a simple message — in production use SEP-10
            const sig = btoa(nonce); // placeholder; real impl uses Freighter signMessage
            const { token } = await api.post('/api/auth/verify', {
                address,
                signature: sig,
            });
            setAuth(token, address);
            navigate('/');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { style: {
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            gap: '2rem',
        }, children: [_jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: '3rem' }, children: "\u25CE" }), _jsx("h1", { style: { fontSize: '2rem', color: 'var(--c-primary)' }, children: "CERCLE" }), _jsx("p", { className: "muted", children: "Community Savings Circles on Stellar" })] }), _jsxs("div", { className: "card stack", style: { width: '100%', maxWidth: 360 }, children: [_jsx("button", { className: "primary", onClick: handleConnect, disabled: loading, children: loading ? 'Connecting…' : '🔗 Connect Freighter Wallet' }), error && _jsx("p", { style: { color: 'var(--c-danger)', fontSize: '0.875rem' }, children: error }), _jsx("p", { className: "muted", style: { textAlign: 'center', fontSize: '0.8rem' }, children: "No wallet? Use SMS: dial *384*CERCLE#" })] })] }));
}
