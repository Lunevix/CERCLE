import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
export default function ReputationPage() {
    const { address } = useAuthStore();
    const { data, isLoading } = useQuery({
        queryKey: ['reputation', address],
        queryFn: () => api.get(`/api/members/${address}/reputation`),
        enabled: !!address,
    });
    if (isLoading)
        return _jsx("p", { className: "muted", children: "Loading\u2026" });
    if (!data)
        return null;
    const score = data.score ?? 500;
    const pct = (score / 1000) * 100;
    const color = score >= 700 ? '#00d4aa' : score >= 400 ? '#6c63ff' : '#ff4757';
    return (_jsxs("div", { className: "stack", children: [_jsx("h2", { children: "Reputation Score" }), _jsxs("div", { className: "card", style: { textAlign: 'center', padding: '2rem' }, children: [_jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsx(RadialBarChart, { innerRadius: "60%", outerRadius: "90%", data: [{ value: pct, fill: color }], startAngle: 180, endAngle: 0, children: _jsx(RadialBar, { dataKey: "value", cornerRadius: 8, background: { fill: '#2a2a4a' } }) }) }), _jsxs("div", { style: { marginTop: '-3rem' }, children: [_jsx("p", { style: { fontSize: '3rem', fontWeight: 700, color }, children: score }), _jsx("p", { className: "muted", children: "out of 1000" })] })] }), _jsxs("div", { className: "card stack", style: { gap: '0.75rem' }, children: [_jsx(Stat, { label: "On-time contributions", value: data.on_time_count ?? 0 }), _jsx(Stat, { label: "Total contributions", value: data.total_contributions ?? 0 }), _jsx(Stat, { label: "Reliability rate", value: data.total_contributions > 0
                            ? `${Math.round((data.on_time_count / data.total_contributions) * 100)}%`
                            : 'N/A' })] }), _jsx("div", { className: "card muted", style: { fontSize: '0.8rem' }, children: _jsx("p", { children: "Score improves with on-time contributions (+10) and decreases with late payments (\u22125) or defaults (\u221250)." }) })] }));
}
function Stat({ label, value }) {
    return (_jsxs("div", { className: "row", children: [_jsx("span", { className: "muted", children: label }), _jsx("span", { className: "spacer" }), _jsx("strong", { children: value })] }));
}
