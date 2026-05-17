import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
export default function DashboardPage() {
    const { data: circles = [], isLoading } = useQuery({
        queryKey: ['circles'],
        queryFn: () => api.get('/api/circles'),
    });
    return (_jsxs("div", { className: "stack", children: [_jsxs("div", { className: "row", children: [_jsx("h2", { children: "My Circles" }), _jsx("span", { className: "spacer" }), _jsx(Link, { to: "/circles/new", children: _jsx("button", { className: "accent", style: { padding: '0.5rem 1rem', fontSize: '0.875rem' }, children: "+ New Circle" }) })] }), isLoading && _jsx("p", { className: "muted", children: "Loading\u2026" }), !isLoading && circles.length === 0 && (_jsxs("div", { className: "card", style: { textAlign: 'center', padding: '2rem' }, children: [_jsx("p", { children: "No circles yet." }), _jsx("p", { className: "muted", children: "Create or join a savings circle to get started." })] })), circles.map(c => (_jsx(Link, { to: `/circles/${c.id}`, style: { textDecoration: 'none' }, children: _jsxs("div", { className: "card stack", style: { gap: '0.5rem' }, children: [_jsxs("div", { className: "row", children: [_jsx("strong", { children: c.name }), _jsx("span", { className: "spacer" }), _jsx("span", { className: `badge ${c.status}`, children: c.status })] }), _jsxs("div", { className: "row muted", children: [_jsxs("span", { children: ["Cycle ", c.current_cycle] }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [(c.contribution_amount / 10000000).toFixed(2), " XLM / ", c.cycle_length_days, "d"] }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [c.max_members, " members"] })] })] }) }, c.id)))] }));
}
