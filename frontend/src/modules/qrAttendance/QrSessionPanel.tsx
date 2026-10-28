import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { QrCode, Maximize2, Minimize2, Users, CheckCircle2, Clock, StopCircle } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { academicOperationsService } from '../../services/academicOperationsService';
import { qrAttendanceService, QrLiveView } from '../../services/qrAttendanceService';
import { Button } from '../../components/ui/Button';

interface BatchOption { key: string; label: string; academicYearId: string; classId: string; sectionId: string; }

const POLL_MS = 2000;
const inputClass = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';

/** Teacher view: start a rotating QR for one batch and watch students check in live. */
export const QrSessionPanel: React.FC = () => {
  const { currentTenant, getLabel } = useTenant();
  const t = currentTenant.id;
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [batchKey, setBatchKey] = useState('');
  const [duration, setDuration] = useState(15);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [live, setLive] = useState<QrLiveView | null>(null);
  const [qrImage, setQrImage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [markAbsent, setMarkAbsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const rotatesAt = useRef(0);

  // Batches this user may run attendance for (one per class + section).
  useEffect(() => {
    if (!t) return;
    academicOperationsService.teachingContext(t).then(result => {
      const seen = new Map<string, BatchOption>();
      for (const row of (result.data || []) as any[]) {
        if (!row.section_id) continue;
        const key = `${row.academic_year_id}|${row.class_id}|${row.section_id}`;
        if (!seen.has(key)) seen.set(key, { key, label: `${row.class_name} – ${row.section_name} (${row.academic_year_name})`, academicYearId: row.academic_year_id, classId: row.class_id, sectionId: row.section_id });
      }
      const list = [...seen.values()];
      setBatches(list);
      setBatchKey(current => current || list[0]?.key || '');
    }).catch(err => setError(err.message || `Your ${getLabel('subgroup').toLowerCase()}es could not be loaded.`));
  }, [t]);

  const batch = useMemo(() => batches.find(b => b.key === batchKey), [batches, batchKey]);

  // Resume a session that is already running for the chosen batch (e.g. after a page reload).
  useEffect(() => {
    if (!batch || sessionId) return;
    qrAttendanceService.active(t, { academicYearId: batch.academicYearId, classId: batch.classId, sectionId: batch.sectionId })
      .then(result => { if (result.data) setSessionId(result.data.id); })
      .catch(() => undefined);
  }, [batch?.key]);

  // Poll the live view: current QR, code and check-ins.
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const tick = async () => {
      try {
        const result = await qrAttendanceService.live(t, sessionId);
        if (!active) return;
        setLive(result.data);
        if (result.data.qr) {
          rotatesAt.current = Date.now() + result.data.qr.rotatesInMs;
          setQrImage(await QRCode.toDataURL(result.data.qr.payload, { width: 640, margin: 1, errorCorrectionLevel: 'M' }));
        } else {
          setQrImage('');
        }
      } catch (err: any) {
        if (active) setError(err.message || 'The live session could not be refreshed.');
      }
    };
    void tick();
    const poll = setInterval(tick, POLL_MS);
    const clock = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((rotatesAt.current - Date.now()) / 1000))), 250);
    return () => { active = false; clearInterval(poll); clearInterval(clock); };
  }, [sessionId, t]);

  const start = async () => {
    if (!batch) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await qrAttendanceService.start(t, { academicYearId: batch.academicYearId, classId: batch.classId, sectionId: batch.sectionId, durationMinutes: duration });
      setSessionId(result.data.id);
    } catch (err: any) {
      const existing = err?.code === 'SESSION_CONFLICT' ? err.details?.sessionId : null;
      if (existing) setSessionId(existing); else setError(err.message || 'The QR session could not be started.');
    } finally { setBusy(false); }
  };

  const close = async () => {
    if (!sessionId) return;
    setBusy(true); setError('');
    try {
      const result = await qrAttendanceService.close(t, sessionId, markAbsent);
      const present = live?.counts.checkedIn ?? 0;
      setNotice(`Session closed. ${present} checked in${markAbsent ? `, ${result.data.markedAbsent} marked absent` : ''}.`);
      setSessionId(null); setLive(null); setQrImage(''); setFullscreen(false);
    } catch (err: any) {
      setError(err.message || 'The session could not be closed.');
    } finally { setBusy(false); }
  };

  const running = live?.session.status === 'ACTIVE';
  const ended = live && !running;

  if (!sessionId) {
    return (
      <div className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><QrCode className="h-5 w-5" /></div>
          <div>
            <h3 className="font-semibold text-slate-900">Start QR attendance</h3>
            <p className="text-sm text-slate-500">Show the QR on the classroom screen. {getLabel('studentPlural')} scan it from the EzyAura app to mark themselves present.</p>
          </div>
        </div>
        {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {batches.length === 0 ? (
          <p className="text-sm text-amber-800">No {getLabel('subgroup').toLowerCase()}es are assigned to you yet. Ask the owner to add a teaching assignment under Staff.</p>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">{getLabel('group')} and {getLabel('subgroup').toLowerCase()}</span>
              <select id="qr-batch" value={batchKey} onChange={e => setBatchKey(e.target.value)} className={inputClass}>
                {batches.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Accept scans for</span>
              <select id="qr-duration" value={duration} onChange={e => setDuration(Number(e.target.value))} className={inputClass}>
                {[5, 10, 15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </label>
            <Button onClick={start} isLoading={busy} leftIcon={<QrCode className="h-4 w-4" />}>Start session</Button>
            <p className="text-xs text-slate-500">The code changes every 15 seconds, so a photo forwarded to someone outside the room stops working almost immediately.</p>
          </>
        )}
      </div>
    );
  }

  const checkedIn = live?.students.filter(s => s.checkedInAt) || [];
  const waiting = live?.students.filter(s => !s.checkedInAt) || [];

  const display = (
    <div className={fullscreen ? 'flex h-full flex-col items-center justify-center gap-6 p-6' : 'space-y-4'}>
      <div className={`text-center ${fullscreen ? 'space-y-1' : ''}`}>
        <p className={`font-semibold text-slate-900 ${fullscreen ? 'text-3xl' : 'text-lg'}`}>{live ? `${live.session.className} – ${live.session.sectionName}` : 'Loading…'}</p>
        <p className={`text-slate-500 ${fullscreen ? 'text-lg' : 'text-sm'}`}>Open EzyAura → Attendance → Scan QR</p>
      </div>
      {running && qrImage ? (
        <img src={qrImage} alt="Attendance QR code" className={`mx-auto rounded-xl border border-slate-200 bg-white p-2 ${fullscreen ? 'h-[min(60vh,60vw)] w-[min(60vh,60vw)]' : 'h-72 w-72'}`} />
      ) : (
        <div className="mx-auto flex h-72 w-72 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">{ended ? 'This session has ended.' : 'Preparing QR…'}</div>
      )}
      {running && live?.qr && (
        <div className="text-center">
          <p className={`font-mono font-bold tracking-[0.3em] text-slate-900 ${fullscreen ? 'text-6xl' : 'text-3xl'}`}>{live.qr.code.slice(0, 3)} {live.qr.code.slice(3)}</p>
          <p className={`mt-1 flex items-center justify-center gap-1.5 text-slate-500 ${fullscreen ? 'text-lg' : 'text-xs'}`}><Clock className="h-3.5 w-3.5" /> New code in {secondsLeft}s · or type this code in the app</p>
        </div>
      )}
      <p className={`text-center font-semibold text-emerald-700 ${fullscreen ? 'text-2xl' : 'text-sm'}`}>{live ? `${live.counts.checkedIn} of ${live.counts.enrolled} checked in` : ''}</p>
    </div>
  );

  if (fullscreen) {
    // Portal to <body> so no app container clips or overlaps the projector view.
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-white">
        <button onClick={() => setFullscreen(false)} className="absolute right-4 top-4 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Minimize2 className="h-4 w-4" /> Exit full screen
        </button>
        {display}
      </div>,
      document.body,
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {display}
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 pt-4">
          {running && <Button variant="outline" onClick={() => setFullscreen(true)} leftIcon={<Maximize2 className="h-4 w-4" />}>Show full screen</Button>}
          <Button variant="danger" onClick={close} isLoading={busy} leftIcon={<StopCircle className="h-4 w-4" />}>{running ? 'Close session' : 'Finish'}</Button>
        </div>
        <label className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <input id="qr-mark-absent" type="checkbox" checked={markAbsent} onChange={e => setMarkAbsent(e.target.checked)} className="accent-emerald-600" />
          Mark everyone who did not scan as absent
        </label>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Users className="h-4 w-4 text-emerald-600" /> Checked in ({checkedIn.length})</h3>
        {checkedIn.length === 0 ? <p className="text-sm text-slate-500">Nobody has scanned yet.</p> : (
          <ul className="divide-y divide-slate-100">
            {checkedIn.map(s => (
              <li key={s.studentId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {s.name} <span className="text-xs text-slate-400">{s.admissionNo}</span></span>
                <span className="text-xs text-slate-500">{new Date(s.checkedInAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{s.method === 'CODE' ? ' · code' : ''}</span>
              </li>
            ))}
          </ul>
        )}
        <h3 className="pt-2 font-semibold text-slate-900">Not yet ({waiting.length})</h3>
        <p className="text-sm text-slate-600">{waiting.length ? waiting.map(s => s.name).join(', ') : live?.counts.enrolled ? 'Everyone is in.' : `No ${getLabel('studentPlural').toLowerCase()} are enrolled in this ${getLabel('subgroup').toLowerCase()} yet.`}</p>
      </div>
    </div>
  );
};
