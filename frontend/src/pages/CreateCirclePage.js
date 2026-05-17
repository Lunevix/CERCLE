import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
export default function CreateCirclePage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        contribution_amount: 10,
        cycle_length_days: 30,
        max_members: 5,
        insurance_bps: 200,
    });
    const create = useMutation({
        mutationFn: () => api.post('/api/circles', {
            ...form,
            contribution_amount: Math.round(form.contribution_amount * 10000000),
        }),
        onSuccess: (data) => navigate(`/circles/${data.id}`),
    });
    const set = (k) => (e) => {
        const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
        setForm(f => ({
            ...f,
            [k]: value
        }));
    };
    return (_jsxs("div", { className: "stack", children: [_jsx("h2", { children: "Create a Circle" }), _jsxs("div", { className: "card stack", children: [_jsxs("label", { children: [_jsx("p", { style: { marginBottom: '0.4rem', fontSize: '0.875rem' }, children: "Circle Name" }), _jsx("input", { value: form.name, onChange: set('name'), placeholder: "e.g. Nairobi Women's Group" })] }), _jsxs("label", { children: [_jsx("p", { style: { marginBottom: '0.4rem', fontSize: '0.875rem' }, children: "Contribution (XLM)" }), _jsx("input", { type: "number", min: "1", value: form.contribution_amount, onChange: set('contribution_amount') })] }), _jsxs("label", { children: [_jsx("p", { style: { marginBottom: '0.4rem', fontSize: '0.875rem' }, children: "Cycle Length (days)" }), _jsx("input", { type: "number", min: "1", max: "365", value: form.cycle_length_days, onChange: set('cycle_length_days') })] }), _jsxs("label", { children: [_jsx("p", { style: { marginBottom: '0.4rem', fontSize: '0.875rem' }, children: "Max Members" }), _jsx("input", { type: "number", min: "2", max: "100", value: form.max_members, onChange: set('max_members') })] }), _jsxs("label", { children: [_jsx("p", { style: { marginBottom: '0.4rem', fontSize: '0.875rem' }, children: "Insurance Rate (basis points, 200 = 2%)" }), _jsx("input", { type: "number", min: "0", max: "1000", value: form.insurance_bps, onChange: set('insurance_bps') })] }), _jsxs("div", { className: "card", style: { background: 'var(--c-bg)', fontSize: '0.875rem' }, children: [_jsx("p", { className: "muted", children: "Summary" }), _jsxs("p", { children: ["Pool per cycle: ", _jsxs("strong", { children: [(form.contribution_amount * form.max_members).toFixed(2), " XLM"] })] }), _jsxs("p", { children: ["Insurance per contribution: ", _jsxs("strong", { children: [(form.contribution_amount * form.insurance_bps / 10000).toFixed(4), " XLM"] })] })] }), create.error && (_jsx("p", { style: { color: 'var(--c-danger)', fontSize: '0.875rem' }, children: create.error.message })), _jsx("button", { className: "primary", onClick: () => create.mutate(), disabled: create.isPending || !form.name, children: create.isPending ? 'Creating…' : 'Create Circle' })] })] }));
}
