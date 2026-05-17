import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
export default function CircleDetailPage() {
    const { id } = useParams();
    const { address } = useAuthStore();
    const qc = useQueryClient();
    const { data: circle } = useQuery({
        queryKey: ['circle', id],
        queryFn: () => api.get(`/api/circles/${id}`),
    });
    const { data: members = [] } = useQuery({
        queryKey: ['circle-members', id],
        queryFn: () => api.get(`/api/circles/${id}/members`),
    });
    const { data: payouts = [] } = useQuery({
        queryKey: ['circle-payouts', id],
        queryFn: () => api.get(`/api/circles/${id}/payouts`),
    });
    const contribute = useMutation({
        mutationFn: () => api.post('/api/contributions', { circle_id: Number(id) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['circle', id] }),
    });
    if (!circle)
        return _jsx("p", { className: "muted", children: "Loading\u2026" });
    const isMember = members.some((m) => m.address === address);
    const payoutData = members.map((m, i) => ({
        name: `${m.address.slice(0, 4)}…`,
        cycle: i + 1,
        isPaid: payouts.some((p) => p.member_id === m.id),
        isNext: i + 1 === circle.current_cycle,
    }));
    return (_jsxs("div", { className: "stack", children: [_jsxs("div", { className: "row", children: [_jsxs("div", { children: [_jsx("h2", { children: circle.name }), _jsxs("p", { className: "muted", children: [(circle.contribution_amount / 10000000).toFixed(2), " XLM \u00B7 ", circle.cycle_length_days, "d cycles"] })] }), _jsx("span", { className: "spacer" }), _jsx("span", { className: `badge ${circle.status}`, children: circle.status })] }), _jsxs("div", { className: "card", children: [_jsx("p", { style: { marginBottom: '0.75rem', fontWeight: 600 }, children: "Payout Rotation" }), _jsx(ResponsiveContainer, { width: "100%", height: 160, children: _jsxs(BarChart, { data: payoutData, margin: { top: 0, right: 0, left: -20, bottom: 0 }, children: [_jsx(XAxis, { dataKey: "name", tick: { fontSize: 11, fill: '#8888aa' } }), _jsx(YAxis, { hide: true }), _jsx(Tooltip, { contentStyle: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }, formatter: (_, __, props) => [`Cycle ${props.payload.cycle}`, ''] }), _jsx(Bar, { dataKey: "cycle", radius: [4, 4, 0, 0], children: payoutData.map((entry, i) => (_jsx(Cell, { fill: entry.isPaid ? '#00d4aa' : entry.isNext ? '#6c63ff' : '#2a2a4a' }, i))) })] }) }), _jsxs("div", { className: "row muted", style: { fontSize: '0.75rem', marginTop: '0.5rem' }, children: [_jsx("span", { style: { color: '#00d4aa' }, children: "\u25A0" }), " Paid", _jsx("span", { style: { color: '#6c63ff' }, children: "\u25A0" }), " Next", _jsx("span", { style: { color: '#2a2a4a', border: '1px solid #444', padding: '0 2px' }, children: "\u25A0" }), " Pending"] })] }), _jsxs("div", { className: "card stack", style: { gap: '0.5rem' }, children: [_jsxs("p", { style: { fontWeight: 600 }, children: ["Members (", members.length, "/", circle.max_members, ")"] }), members.map((m, i) => (_jsxs("div", { className: "row", style: { fontSize: '0.875rem' }, children: [_jsxs("span", { style: { color: 'var(--c-muted)', width: 20 }, children: [i + 1, "."] }), _jsxs("span", { children: [m.address.slice(0, 8), "\u2026", m.address.slice(-4)] }), m.address === address && _jsx("span", { className: "badge active", children: "you" }), _jsx("span", { className: "spacer" }), payouts.find((p) => p.member_id === m.id)
                                ? _jsx("span", { style: { color: 'var(--c-accent)', fontSize: '0.75rem' }, children: "\u2713 paid" })
                                : null] }, m.id)))] }), isMember && circle.status === 'active' && (_jsx("button", { className: "primary", onClick: () => contribute.mutate(), disabled: contribute.isPending, children: contribute.isPending ? 'Submitting…' : `Contribute ${(circle.contribution_amount / 10000000).toFixed(2)} XLM` })), !isMember && circle.status !== 'closed' && (_jsx("button", { className: "accent", onClick: () => api.post('/api/members/join', { circle_id: Number(id) }), children: "Join Circle" }))] }));
}
