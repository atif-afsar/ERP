import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { feeManagementService as api } from '../../services/feeManagementService';

const money = (v: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v || 0));
const date = (v: any) => {
    if (!v) return '—';
    const str = String(v);
    if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    }
    return str.slice(0, 10);
};
const Table = ({ heads, rows }: any) => <div className="my-4 overflow-x-auto rounded-xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr>{heads.map((h: string) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.map((r: any[], i: number) => <tr key={i} className="border-t">{r.map((v: any, j: number) => <td key={j} className="p-3">{v}</td>)}</tr>)}</tbody></table></div>;

const Input = ({ label, ...p }: any) => <label className="text-xs font-medium text-slate-600">{label}<input {...p} className="mt-1 w-full rounded border p-2 text-sm" /></label>;
const dataUrl = (f: File) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = no; r.readAsDataURL(f) });

export const ParentFeePortal: React.FC = () => {
    const { currentTenant } = useTenant();
    const t = currentTenant.id;
    const [d, setD] = useState<any>({ settings: null, assignments: [], proofs: [], receipts: [], qrUrl: '' });
    const [err, setErr] = useState('');
    const [msg, setMsg] = useState('');
    const [childId, setChildId] = useState<string>('');
    const [copiedUpi, setCopiedUpi] = useState(false);
    const [proof, setProof] = useState<any>({ feeAssignmentId: '', installmentId: '', amount: 0, transactionReference: '', paymentDate: new Date().toISOString().slice(0, 10), fileName: '', proofDataUrl: '' });

    const load = async () => {
        try {
            const [a, p, r, s] = await Promise.all([api.assignments(t), api.proofs(t), api.receipts(t), api.settings(t)]);
            const qrUrl = s.data?.has_qr ? URL.createObjectURL(await api.qr(t)) : '';
            setD({ assignments: a.data, proofs: p.data, receipts: r.data, settings: s.data, qrUrl });
            if (a.data.length > 0 && !childId) {
                setChildId(a.data[0].student_id);
            }
        } catch (e: any) { setErr(e.message) }
    };

    useEffect(() => { load() }, [t]);

    const run = async (fn: () => Promise<any>, m: string) => {
        setErr('');
        try {
            await fn();
            setMsg(m);
            await load();
            setProof({ feeAssignmentId: '', installmentId: '', amount: 0, transactionReference: '', paymentDate: new Date().toISOString().slice(0, 10), fileName: '', proofDataUrl: '' });
        } catch (e: any) { setErr(e.message) }
    };

    const children = Array.from(new Set(d.assignments.map((x: any) => x.student_id))).map(id => d.assignments.find((x: any) => x.student_id === id));
    const childAssignments = d.assignments.filter((x: any) => x.student_id === childId);
    const childProofs = d.proofs.filter((x: any) => childAssignments.some((a: any) => a.id === x.fee_assignment_id));
    const childReceipts = d.receipts.filter((x: any) => childAssignments.some((a: any) => a.id === x.fee_assignment_id));
    
    const total = childAssignments.reduce((acc: number, x: any) => acc + Number(x.total_amount), 0);
    const paid = childAssignments.reduce((acc: number, x: any) => acc + Number(x.verified_paid), 0);
    const pendingAmount = childProofs.filter((x: any) => x.status === 'PENDING').reduce((acc: number, x: any) => acc + Number(x.amount), 0);
    const outstanding = childAssignments.reduce((acc: number, x: any) => acc + Number(x.outstanding), 0);

    const assignment = d.assignments.find((x: any) => x.id === proof.feeAssignmentId);

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold">Parent Fee Portal</h2>
                <p className="text-sm text-slate-500">View your children's fee dues and submit manual payment proofs.</p>
            </div>
            
            {err && <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
            {msg && <div className="break-all rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}

            {children.length > 1 && (
                <div className="rounded-xl border bg-white p-4">
                    <label className="text-sm font-bold">Select Child: </label>
                    <select value={childId} onChange={e => setChildId(e.target.value)} className="ml-2 rounded border p-2">
                        {children.map((c: any) => (
                            <option key={c.student_id} value={c.student_id}>{c.first_name} {c.last_name} ({c.admission_no})</option>
                        ))}
                    </select>
                </div>
            )}

            {childId ? (
                <div className="space-y-5">
                    <p className="text-sm text-slate-600">Summary for the selected child across all fee assignments. Pending proofs do not reduce the outstanding balance. The payment form below applies to the selected fee only.</p>
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Total Fee</p><p className="text-xl font-bold">{money(total)}</p></div>
                        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Verified Paid</p><p className="text-xl font-bold text-emerald-600">{money(paid)}</p></div>
                        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Pending Verification</p><p className="text-xl font-bold text-amber-600">{money(pendingAmount)}</p></div>
                        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Outstanding</p><p className="text-xl font-bold text-rose-600">{money(outstanding)}</p></div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-xl border bg-white p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900">School Payment Information</h3>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    Direct UPI / Bank
                                </span>
                            </div>
                            {d.settings ? (
                                <>
                                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                        <p className="text-xs text-slate-500">Official Payee Account</p>
                                        <p className="text-sm font-bold text-slate-900">{d.settings.payee_name}</p>
                                        {d.settings.bank_name && (
                                            <p className="text-xs text-slate-600">{d.settings.bank_name} {d.settings.account_last_four ? `(A/C ending in ${d.settings.account_last_four})` : ''}</p>
                                        )}
                                    </div>

                                    <div className="p-3 rounded-lg bg-violet-50/60 border border-violet-200 space-y-2">
                                        <p className="text-xs font-semibold text-violet-900">Institutional UPI ID</p>
                                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-violet-200">
                                            <span className="font-mono text-sm font-bold text-violet-800 truncate select-all">{d.settings.upi_id}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(d.settings.upi_id);
                                                    setCopiedUpi(true);
                                                    setTimeout(() => setCopiedUpi(false), 2000);
                                                }}
                                                className="ml-2 text-xs font-semibold px-2 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors shrink-0"
                                            >
                                                {copiedUpi ? 'Copied!' : 'Copy UPI'}
                                            </button>
                                        </div>
                                    </div>

                                    {d.settings.has_qr && d.qrUrl ? (
                                        <div className="text-center pt-2">
                                            <img alt="School payment QR" src={d.qrUrl} className="mx-auto max-h-56 rounded-xl border border-slate-200 shadow-xs" />
                                            <p className="text-[11px] text-slate-500 mt-2">Scan with Google Pay, PhonePe, Paytm, or any UPI app</p>
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                                            <strong>External Transfer Note:</strong> Open your preferred UPI application (PhonePe, Google Pay, Paytm, or BHIM), initiate a transfer to the UPI ID above, and submit the 12-digit UTR reference with your payment screenshot.
                                        </div>
                                    )}

                                    {d.settings.instructions && (
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                                            <span className="font-semibold text-slate-700 block mb-0.5">School Note:</span>
                                            {d.settings.instructions}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-amber-700">School payment settings are currently being configured by administration.</p>
                            )}
                        </div>

                        <form onSubmit={e => {
                            e.preventDefault();
                            if (assignment && Number(proof.amount) > Number(assignment.outstanding)) {
                                setErr(`Amount cannot exceed the remaining outstanding balance of ${money(assignment.outstanding)}.`);
                                return;
                            }
                            run(() => api.submitProof(t, { ...proof, installmentId: proof.installmentId || null }), 'Payment proof submitted for administrator review.');
                        }} className="grid gap-3 rounded-xl border bg-white p-4">
                            <h3 className="font-bold">Submit Payment Proof</h3>
                            <label className="text-xs">Fee due
                                <select required value={proof.feeAssignmentId} onChange={e => setProof({ ...proof, feeAssignmentId: e.target.value, installmentId: '' })} className="mt-1 w-full rounded border p-2">
                                    <option value="">Select</option>
                                    {childAssignments.filter((x: any) => Number(x.outstanding) > 0).map((x: any) => (
                                        <option key={x.id} value={x.id}>{x.structure_name} — {money(x.outstanding)}</option>
                                    ))}
                                </select>
                            </label>
                            {assignment && (
                                <label className="text-xs">Installment
                                    <select value={proof.installmentId} onChange={e => setProof({ ...proof, installmentId: e.target.value })} className="mt-1 w-full rounded border p-2">
                                        <option value="">General payment</option>
                                        {assignment.installments.map((x: any) => (
                                            <option key={x.id} value={x.id}>{x.name} — {money(x.amount)}</option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            <Input label="Amount paid" type="number" min="0.01" max={assignment ? Number(assignment.outstanding) : undefined} step="0.01" value={proof.amount} onChange={(e: any) => setProof({ ...proof, amount: Number(e.target.value) })} />
                            <Input label="UPI transaction reference" required value={proof.transactionReference} onChange={(e: any) => setProof({ ...proof, transactionReference: e.target.value })} />
                            <Input label="Payment date" type="date" value={proof.paymentDate} onChange={(e: any) => setProof({ ...proof, paymentDate: e.target.value })} />
                            <label className="text-xs">Screenshot or PDF
                                <input required type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={async e => {
                                    const f = e.target.files?.[0];
                                    if (f) setProof({ ...proof, fileName: f.name, proofDataUrl: await dataUrl(f) });
                                }} className="mt-1 block" />
                            </label>
                            <button className="rounded bg-violet-600 p-2 text-white">Upload payment proof</button>
                        </form>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mt-6">Installments & Dues</h3>
                        <Table heads={['Fee Structure', 'Year', 'Total', 'Verified Paid', 'Outstanding', 'Installments']} rows={childAssignments.map((x: any) => [
                            x.structure_name, x.academic_year_name, money(x.total_amount), money(x.verified_paid), money(x.outstanding),
                            (x.installments || []).map((i: any) => `${i.name}: ${money(i.amount)} due ${date(i.dueDate)}`).join(' · ')
                        ])} />
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mt-6">Proof History</h3>
                        <Table heads={['Reference', 'Amount', 'Date', 'Status', 'Proof']} rows={childProofs.map((x: any) => [
                            x.transaction_reference, money(x.amount), date(x.payment_date),
                            <span className={x.status === 'APPROVED' ? 'text-emerald-600 font-bold' : x.status === 'REJECTED' ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>{x.status} {x.verification_notes && `(${x.verification_notes})`}</span>,
                            <button onClick={async () => { const blob = await api.proofFile(t, x.id); window.open(URL.createObjectURL(blob), '_blank') }} className="text-violet-700 underline">View</button>
                        ])} />
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mt-6">Receipts</h3>
                        <Table heads={['Receipt No', 'Fee', 'Amount', 'Reference', 'Paid Date']} rows={childReceipts.map((x: any) => [
                            x.receipt_no, x.structure_name, money(x.amount), x.reference_number, date(x.paid_at)
                        ])} />
                    </div>

                </div>
            ) : (
                <div className="rounded-xl border bg-white p-5 text-center text-slate-500">
                    No fee records found for your linked children.
                </div>
            )}
        </div>
    );
};
