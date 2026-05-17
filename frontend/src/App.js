import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CircleDetailPage from './pages/CircleDetailPage';
import CreateCirclePage from './pages/CreateCirclePage';
import ReputationPage from './pages/ReputationPage';
function RequireAuth({ children }) {
    const token = useAuthStore(s => s.token);
    return token ? _jsx(_Fragment, { children: children }) : _jsx(Navigate, { to: "/login", replace: true });
}
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsxs(Route, { element: _jsx(RequireAuth, { children: _jsx(Layout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "circles/new", element: _jsx(CreateCirclePage, {}) }), _jsx(Route, { path: "circles/:id", element: _jsx(CircleDetailPage, {}) }), _jsx(Route, { path: "reputation", element: _jsx(ReputationPage, {}) })] })] }));
}
