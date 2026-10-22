import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CheckCircle2, KeyRound, QrCode, RefreshCw, XCircle } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { qrAttendanceService, QrSession } from '../../services/qrAttendanceService';
import { Button } from '../../components/ui/Button';

type Phase = 'idle' | 'scanning' | 'sending' | 'done' | 'failed';

declare global {
  // Native QR decoding (Chrome on Android, Safari 17+). jsQR covers the rest.
  interface Window { BarcodeDetector?: new (options: { formats: string[] }) => { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } }
}

const QR_PREFIX = 'ENX-QR2.';
const SCAN_INTERVAL_MS = 200;

/** Student view: scan the classroom QR (or type its 6-digit code) to be marked present. */
export const StudentQrCheckIn: React.FC = () => {
  const { currentTenant } = useTenant();
  const t = currentTenant.id;
  const [session, setSession] = useState<(QrSession & { checkedIn: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await qrAttendanceService.studentActive(t);
      setSession(result.data);
      if (result.data?.checkedIn) { setPhase('done'); setMessage('You are marked present for this session.'); }
    } catch (err: any) {
      setMessage(err.message || 'Could not check for a running session.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (t) void refresh(); return stopCamera; }, [t]);

  function stopCamera() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }

  const submit = async (input: { payload: string } | { code: string }) => {
    stopCamera();
    setPhase('sending');
    try {
      const result = await qrAttendanceService.checkIn(t, input);
      setPhase('done');
      setMessage(result.data.alreadyCheckedIn ? 'You were already marked present.' : 'You are marked present. You can close this screen.');
      setSession(s => (s ? { ...s, checkedIn: true } : s));
    } catch (err: any) {
      setPhase('failed');
      setMessage(err.message || 'Check-in failed. Try again.');
    }
  };

  const startCamera = async () => {
    setMessage('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setPhase('failed');
      setMessage('This browser cannot open the camera here. Type the 6-digit code shown under the QR instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      setPhase('scanning');
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      let busy = false;
      timerRef.current = window.setInterval(async () => {
        if (busy || video.readyState < 2) return;
        busy = true;
        try {
          let value: string | null = null;
          if (detector) {
            value = (await detector.detect(video))[0]?.rawValue ?? null;
          } else {
            const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            value = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
          }
          if (value?.startsWith(QR_PREFIX)) await submit({ payload: value });
        } finally { busy = false; }
      }, SCAN_INTERVAL_MS);
    } catch (err: any) {
      stopCamera();
      setPhase('failed');
      setMessage(err?.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in your browser settings, or type the 6-digit code.'
        : 'The camera could not be opened. Type the 6-digit code shown under the QR instead.');
    }
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) { setPhase('failed'); setMessage('Enter all 6 digits of the code on the screen.'); return; }
    void submit({ code: digits });
  };

  if (loading) return <p className="text-sm text-slate-500">Checking for a running session…</p>;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center space-y-4">
        <div className="mx-auto w-fit rounded-xl bg-emerald-50 p-3 text-emerald-700"><QrCode className="h-6 w-6" /></div>
        {session ? (
          <div>
            <h3 className="font-semibold text-slate-900">Attendance is open</h3>
            <p className="text-sm text-slate-500">{session.className} – {session.sectionName}. Scan the QR on the classroom screen.</p>
          </div>
        ) : (
          <div>
            <h3 className="font-semibold text-slate-900">No session running</h3>
            <p className="text-sm text-slate-500">When your teacher starts QR attendance for your batch, it will appear here.</p>
          </div>
        )}

        {phase === 'done' ? (
          <p role="status" className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" /> {message}</p>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className={`mx-auto aspect-square w-full max-w-xs rounded-xl bg-slate-900 object-cover ${phase === 'scanning' ? '' : 'hidden'}`} />
            {phase === 'scanning' ? (
              <Button variant="outline" onClick={() => { stopCamera(); setPhase('idle'); }}>Stop camera</Button>
            ) : (
              <Button onClick={startCamera} disabled={!session || phase === 'sending'} isLoading={phase === 'sending'} leftIcon={<Camera className="h-4 w-4" />}>Scan QR</Button>
            )}
            {phase === 'failed' && <p role="alert" className="flex items-start justify-center gap-2 text-sm text-rose-700"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {message}</p>}
          </>
        )}
        <button onClick={() => { setPhase('idle'); void refresh(); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {session && phase !== 'done' && (
        <form onSubmit={submitCode} className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900"><KeyRound className="h-4 w-4 text-emerald-600" /> Camera not working?</h3>
          <p className="text-sm text-slate-500">Type the 6-digit code shown under the QR. It changes every 15 seconds.</p>
          <div className="flex gap-2">
            <input id="qr-code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={e => setCode(e.target.value)}
              placeholder="123 456" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-center font-mono text-lg tracking-[0.3em] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            <Button type="submit" isLoading={phase === 'sending'}>Submit</Button>
          </div>
        </form>
      )}
    </div>
  );
};
