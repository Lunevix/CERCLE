import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
export default function Layout() {
    const { address, logout } = useAuthStore();
    const navigate = useNavigate();
    function handleLogout() {
        logout();
        navigate('/login');
    }
    return (_jsxs("div", { style: { minHeight: '100dvh', display: 'flex', flexDirection: 'column' }, children: [_jsx("header", { style: {
                    background: 'var(--c-surface)',
                    borderBottom: '1px solid var(--c-border)',
                    padding: '0.75rem 1rem',
                }, children: _jsxs("div", { className: "container row", children: [_jsx("span", { style: { fontWeight: 700, fontSize: '1.25rem', color: 'var(--c-primary)' }, children: "\u25CE CERCLE" }), _jsx("span", { className: "spacer" }), _jsxs("span", { className: "muted", style: { fontSize: '0.75rem' }, children: [address?.slice(0, 6), "\u2026", address?.slice(-4)] }), _jsx("button", { className: "ghost", style: { padding: '0.4rem 0.8rem', fontSize: '0.8rem' }, onClick: handleLogout, children: "Logout" })] }) }), _jsx("main", { style: { flex: 1, padding: '1.5rem 0' }, children: _jsx("div", { className: "container", children: _jsx(Outlet, {}) }) }), _jsx("nav", { style: {
                    background: 'var(--c-surface)',
                    borderTop: '1px solid var(--c-border)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '0.75rem 0',
                }, children: [
                    { to: '/', label: '🏠 Home' },
                    { to: '/circles/new', label: '➕ New' },
                    { to: '/reputation', label: '⭐ Rep' },
                ].map(({ to, label }) => (_jsx(NavLink, { to: to, end: true, style: ({ isActive }) => ({
                        color: isActive ? 'var(--c-primary)' : 'var(--c-muted)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                    }), children: label }, to))) })] }));
}
