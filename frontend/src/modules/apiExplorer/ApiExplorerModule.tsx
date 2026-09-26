import React, { useState } from 'react';
import {
  Code2,
  Play,
  Copy,
  Check,
  Server,
  Layers,
  ShieldCheck,
  Clock,
  Send,
  Sparkles,
  Database,
  RefreshCw,
  FileCode,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  Network,
  RotateCcw,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { ResourceState } from '../../components/ui/ResourceState';
import { normalizeApiError, NormalizedError } from '../../services/api/errorHandler';
import { withRetry, paymentGatewayBreaker } from '../../services/api/resilience';
import {
  studentsApi,
  attendanceApi,
  financeApi,
  examsApi,
  reportsApi,
  healthApi,
} from '../../services/api/endpoints';

interface EndpointDefinition {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  category: 'Students' | 'Attendance' | 'Finance' | 'Exams' | 'Reports' | 'Health';
  description: string;
  permission: string;
  defaultBody?: any;
  defaultParams?: Record<string, string>;
  supportsIdempotency?: boolean;
  runner: (tenantId: string, body?: any, params?: any, idempotencyKey?: string) => Promise<any>;
}

export const ApiExplorerModule: React.FC = () => {
  const { currentTenant } = useTenant();
  const { currentUser } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'explorer' | 'resilience'>('explorer');

  // Explorer State
  const [copied, setCopied] = useState(false);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('students-list');
  const [requestBodyJson, setRequestBodyJson] = useState<string>('{}');
  const [customIdempotencyKey, setCustomIdempotencyKey] = useState<string>(
    `idemp_${Date.now()}`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [responseOutput, setResponseOutput] = useState<any>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Resilience Simulator State
  const [retryLogs, setRetryLogs] = useState<string[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [simulatedError, setSimulatedError] = useState<NormalizedError | null>(null);
  const [circuitState, setCircuitState] = useState(paymentGatewayBreaker.getState());
  const [demoResourceLoading, setDemoResourceLoading] = useState(false);
  const [demoResourceEmpty, setDemoResourceEmpty] = useState(false);
  const [demoResourceError, setDemoResourceError] = useState<NormalizedError | null>(null);

  const endpoints: EndpointDefinition[] = [
    {
      id: 'students-list',
      method: 'GET',
      path: '/api/v1/students?page=1&pageSize=5',
      category: 'Students',
      description: 'Paginated student directory with search query support',
      permission: 'students.view',
      runner: (t) => studentsApi.list(t, { page: 1, pageSize: 5 }),
    },
    {
      id: 'students-create',
      method: 'POST',
      path: '/api/v1/students',
      category: 'Students',
      description: 'Enroll new student with schema validation',
      permission: 'students.create',
      supportsIdempotency: true,
      defaultBody: {
        firstName: 'Ananya',
        lastName: 'Sharma',
        admissionNo: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
        gender: 'FEMALE',
        dob: '2012-04-15',
      },
      runner: (t, body, _, idemp) =>
        studentsApi.create(t, body, { idempotencyKey: idemp }),
    },
    {
      id: 'attendance-bulk',
      method: 'POST',
      path: '/api/v1/attendance/bulk',
      category: 'Attendance',
      description: 'Atomic batch attendance submission for classroom/batch',
      permission: 'attendance.mark',
      supportsIdempotency: true,
      defaultBody: [
        { studentId: 'student-101', status: 'PRESENT', method: 'MANUAL' },
        { studentId: 'student-102', status: 'LATE', method: 'QR_SCAN', remarks: 'Late by 10 mins' },
      ],
      runner: (t, body, _, idemp) =>
        attendanceApi.recordBulk(t, body, { idempotencyKey: idemp }),
    },
    {
      id: 'finance-structures',
      method: 'GET',
      path: '/api/v1/fees/structures',
      category: 'Finance',
      description: 'Retrieve active institutional fee structures and breakdown heads',
      permission: 'fees.view',
      runner: (t) => financeApi.getStructures(t),
    },
    {
      id: 'finance-payment',
      method: 'POST',
      path: '/api/v1/payments',
      category: 'Finance',
      description: 'Transactional payment receipt creation with idempotency',
      permission: 'payments.create',
      supportsIdempotency: true,
      defaultBody: {
        studentId: 'student-101',
        amount: 8500,
        currency: 'INR',
        paymentMode: 'RAZORPAY_UPI',
        remarks: 'Term 1 Tuition settlement',
      },
      runner: (t, body, _, idemp) =>
        financeApi.recordPayment(t, body, { idempotencyKey: idemp }),
    },
    {
      id: 'exams-list',
      method: 'GET',
      path: '/api/v1/exams',
      category: 'Exams',
      description: 'Fetch institutional examination terms and test series schedules',
      permission: 'exams.view',
      runner: (t) => examsApi.list(t),
    },
    {
      id: 'reports-export',
      method: 'POST',
      path: '/api/v1/reports/export',
      category: 'Reports',
      description: 'Dispatch asynchronous CSV export job with download artifact',
      permission: 'reports.view',
      supportsIdempotency: true,
      defaultBody: { resourceType: 'STUDENT_ROSTER_CUMULATIVE' },
      runner: (t, body, _, idemp) =>
        reportsApi.createExportJob(t, body?.resourceType || 'DEMOGRAPHIC', { idempotencyKey: idemp }),
    },
    {
      id: 'health-check',
      method: 'GET',
      path: '/api/v1/health',
      category: 'Health',
      description: 'System liveness, service readiness, database & gateway status',
      permission: 'PUBLIC',
      runner: () => healthApi.getHealth(),
    },
  ];

  const currentEndpoint =
    endpoints.find((e) => e.id === selectedEndpointId) || endpoints[0];

  const handleSelectEndpoint = (ep: EndpointDefinition) => {
    setSelectedEndpointId(ep.id);
    setRequestBodyJson(
      ep.defaultBody ? JSON.stringify(ep.defaultBody, null, 2) : '{}'
    );
    setResponseOutput(null);
    setResponseStatus(null);
    setLatencyMs(null);
  };

  const handleExecuteRequest = async () => {
    setIsLoading(true);
    const start = performance.now();
    try {
      let parsedBody: any = undefined;
      if (currentEndpoint.method !== 'GET') {
        try {
          parsedBody = JSON.parse(requestBodyJson);
        } catch {
          alert('Invalid JSON in request payload');
          setIsLoading(false);
          return;
        }
      }

      const res = await currentEndpoint.runner(
        currentTenant.id,
        parsedBody,
        undefined,
        currentEndpoint.supportsIdempotency ? customIdempotencyKey : undefined
      );

      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setResponseStatus(res.status || 200);
      setResponseOutput(res);
    } catch (err: any) {
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setResponseStatus(err.status || 500);
      setResponseOutput(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Resilience Simulators
  const simulateValidationError = () => {
    const raw = {
      error: {
        code: 'VALIDATION_ERROR_422',
        message: 'Invalid submission parameters detected.',
        details: {
          admissionNo: 'Admission number already exists in this academic year.',
          email: 'Parent email address format is invalid.',
          amount: 'Payment amount must be greater than zero.',
        },
        requestId: `req_val_${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
      status: 422,
    };
    setSimulatedError(normalizeApiError(raw));
  };

  const simulateConflictError = () => {
    const raw = {
      error: {
        code: 'CONFLICT_ERROR',
        message: 'Concurrent update detected: This invoice was already settled by another bursar workstation.',
        requestId: `req_conflict_${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
      status: 409,
    };
    setSimulatedError(normalizeApiError(raw));
  };

  const simulateRateLimitError = () => {
    const raw = {
      error: {
        code: 'RATE_LIMITED_429',
        message: 'API rate limit exceeded (100 req/min). Please back off before retrying.',
        requestId: `req_limit_${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
      status: 429,
    };
    setSimulatedError(normalizeApiError(raw));
  };

  const runExponentialBackoffRetry = async () => {
    setRetryLogs([]);
    setIsRetrying(true);
    let attemptsCount = 0;

    try {
      await withRetry(
        async () => {
          attemptsCount++;
          if (attemptsCount < 3) {
            throw {
              error: {
                code: 'TIMEOUT_ERROR',
                message: `Gateway Timeout on attempt #${attemptsCount}`,
                requestId: `req_retry_${Date.now()}`,
                timestamp: new Date().toISOString(),
              },
              status: 504,
            };
          }
          return { data: 'Success: Request recovered on Attempt #3!' };
        },
        {
          maxAttempts: 3,
          initialDelayMs: 300,
          onRetry: (att, err, delay) => {
            setRetryLogs((prev) => [
              ...prev,
              `Attempt #${att} failed (${err.code}). Exponential backoff waiting ${delay}ms before next retry...`,
            ]);
          },
        }
      );
      setRetryLogs((prev) => [...prev, '✓ Successfully resolved and recovered on Attempt #3!']);
    } catch (err: any) {
      setRetryLogs((prev) => [...prev, `Final failure: ${err.message}`]);
    } finally {
      setIsRetrying(false);
    }
  };

  const triggerCircuitBreakerTrip = async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await paymentGatewayBreaker.execute(async () => {
          throw new Error('Simulated Razorpay 503 Gateway Timeout');
        });
      } catch {}
    }
    setCircuitState(paymentGatewayBreaker.getState());
  };

  const copyResponse = () => {
    if (!responseOutput) return;
    navigator.clipboard.writeText(JSON.stringify(responseOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMethodBadgeVariant = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'POST':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'PATCH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DELETE':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Code2 className="w-6 h-6 text-sky-400" />
              API Architecture, Contracts & Resilience
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-400">
              v1.0 Canonical
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Formal RESTful service contracts, typed envelopes, error normalization taxonomy, and fault simulation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="blue" size="sm">
            Tenant: {currentTenant.id}
          </Badge>
          <Badge variant="purple" size="sm">
            Role: {currentUser.role}
          </Badge>
        </div>
      </div>

      {/* Sub-Tabs */}
      <Tabs
        tabs={[
          { id: 'explorer', label: '⚡ Interactive API Explorer' },
          { id: 'resilience', label: '🛡️ Resilience, Errors & Fault Simulator' },
        ]}
        activeTab={activeSubTab}
        onChange={(t) => setActiveSubTab(t as any)}
      />

      {/* TAB 1: API EXPLORER */}
      {activeSubTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Endpoint Catalog */}
          <div className="lg:col-span-5 space-y-3">
            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Endpoint Catalog ({endpoints.length})
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Base: /api/v1</span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {endpoints.map((ep) => {
                const isSelected = ep.id === selectedEndpointId;
                return (
                  <button
                    key={ep.id}
                    onClick={() => handleSelectEndpoint(ep)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all group flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/5'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${getMethodBadgeVariant(
                            ep.method
                          )}`}
                        >
                          {ep.method}
                        </span>
                        <span className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                          {ep.path}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{ep.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                      <span>Scope: {ep.category}</span>
                      <span>•</span>
                      <span className="text-sky-400">Lock: {ep.permission}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Interactive Console */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              
              {/* Request Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span
                    className={`font-bold px-2 py-0.5 rounded border ${getMethodBadgeVariant(
                      currentEndpoint.method
                    )}`}
                  >
                    {currentEndpoint.method}
                  </span>
                  <span className="text-white font-semibold">{currentEndpoint.path}</span>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteRequest}
                  disabled={isLoading}
                  leftIcon={isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                >
                  {isLoading ? 'Executing...' : 'Send Request'}
                </Button>
              </div>

              {/* Request Headers Preview */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Injected Headers
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500">X-Tenant-Id:</span>{' '}
                    <span className="text-sky-400">{currentTenant.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Authorization:</span>{' '}
                    <span className="text-emerald-400">Bearer &lt;session_jwt&gt;</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Content-Type:</span>{' '}
                    <span className="text-slate-300">application/json</span>
                  </div>
                  {currentEndpoint.supportsIdempotency && (
                    <div>
                      <span className="text-slate-500">Idempotency-Key:</span>{' '}
                      <span className="text-amber-400">{customIdempotencyKey}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Idempotency Key Customizer */}
              {currentEndpoint.supportsIdempotency && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 shrink-0">Idempotency Key:</span>
                  <input
                    type="text"
                    value={customIdempotencyKey}
                    onChange={(e) => setCustomIdempotencyKey(e.target.value)}
                    className="flex-1 px-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-amber-300 font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomIdempotencyKey(`idemp_${Date.now()}`)}
                  >
                    Regen
                  </Button>
                </div>
              )}

              {/* Request Body */}
              {currentEndpoint.method !== 'GET' && (
                <div className="space-y-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Request Payload (JSON)
                  </span>
                  <textarea
                    rows={5}
                    value={requestBodyJson}
                    onChange={(e) => setRequestBodyJson(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-sky-300 focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {/* Response Viewer */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider">
                      Response
                    </span>
                    {responseStatus !== null && (
                      <Badge
                        variant={responseStatus < 300 ? 'emerald' : 'rose'}
                        size="sm"
                      >
                        HTTP {responseStatus}
                      </Badge>
                    )}
                    {latencyMs !== null && (
                      <span className="text-[11px] font-mono text-slate-400">
                        ⏱️ {latencyMs}ms
                      </span>
                    )}
                  </div>

                  {responseOutput && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyResponse}
                      leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copied ? 'Copied' : 'Copy JSON'}
                    </Button>
                  )}
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-80 overflow-y-auto">
                  {responseOutput ? (
                    <pre>{JSON.stringify(responseOutput, null, 2)}</pre>
                  ) : (
                    <p className="text-slate-500 italic">
                      Click "Send Request" to test this endpoint and inspect the live envelope.
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RESILIENCE & FAULT SIMULATOR */}
      {activeSubTab === 'resilience' && (
        <div className="space-y-6">
          
          {/* Section 1: Canonical Error Normalization Simulators */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                Error Taxonomy & Normalization Simulator
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate standard API error codes, field-level validation errors, and check the normalized frontend representation.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={simulateValidationError}>
                Simulate 422 Validation Error
              </Button>
              <Button variant="outline" size="sm" onClick={simulateConflictError}>
                Simulate 409 Conflict Error
              </Button>
              <Button variant="outline" size="sm" onClick={simulateRateLimitError}>
                Simulate 429 Rate Limited
              </Button>
            </div>

            {simulatedError && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-sky-400 font-bold">Category: {simulatedError.category}</span>
                  <Badge variant="rose" size="sm">HTTP {simulatedError.status}</Badge>
                </div>
                <p className="text-white font-sans">{simulatedError.userMessage}</p>
                {simulatedError.fieldErrors && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                    <span className="text-amber-400 font-bold uppercase font-sans">Field-Level Error Mapping:</span>
                    {Object.entries(simulatedError.fieldErrors).map(([field, msg]) => (
                      <div key={field} className="flex gap-2">
                        <span className="text-rose-400 font-bold">{field}:</span>
                        <span className="text-slate-300">{msg}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-slate-500 text-[10px]">RequestId: {simulatedError.requestId} • Retryable: {simulatedError.isRetryable ? 'YES' : 'NO'}</p>
              </div>
            )}
          </div>

          {/* Section 2: Exponential Backoff & Circuit Breaker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Exponential Backoff Runner */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-sky-400" />
                  Exponential Backoff & Jitter Runner
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulates a transient 504 Timeout with automated retry attempts and backoff delay calculation.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={runExponentialBackoffRetry}
                disabled={isRetrying}
                leftIcon={<Play className="w-3.5 h-3.5" />}
              >
                {isRetrying ? 'Retrying Operation...' : 'Run 3-Attempt Backoff Test'}
              </Button>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1.5 min-h-32 max-h-48 overflow-y-auto">
                {retryLogs.length > 0 ? (
                  retryLogs.map((log, idx) => (
                    <div key={idx} className={log.includes('✓') ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                      {log}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic">Click above to start retry simulation.</p>
                )}
              </div>
            </div>

            {/* External Circuit Breaker */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  External Provider Circuit Breaker
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Isolates third-party outages (e.g. Razorpay/SMS) to prevent cascading system failures.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-semibold">{paymentGatewayBreaker.name} State:</span>
                <Badge
                  variant={circuitState === 'CLOSED' ? 'emerald' : circuitState === 'OPEN' ? 'rose' : 'amber'}
                  size="sm"
                  dot
                >
                  CIRCUIT_{circuitState}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={triggerCircuitBreakerTrip}>
                  Simulate 3 Outages (Trip Circuit)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    paymentGatewayBreaker.reset();
                    setCircuitState(paymentGatewayBreaker.getState());
                  }}
                >
                  Reset Circuit
                </Button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                When the circuit is <strong>OPEN</strong>, payment requests degrade gracefully with clear fallback messaging while student attendance and gradebooks remain fully operational.
              </p>
            </div>

          </div>

          {/* Section 3: Canonical 4-State Resource Demo */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Canonical 4-State UI Container (`ResourceState`)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Standardizes Loading, Success Data, Empty state, and Error states with retry triggers.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDemoResourceLoading(true);
                  setDemoResourceError(null);
                  setDemoResourceEmpty(false);
                  setTimeout(() => setDemoResourceLoading(false), 2000);
                }}
              >
                Test Loading State
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDemoResourceLoading(false);
                  setDemoResourceError(null);
                  setDemoResourceEmpty(true);
                }}
              >
                Test Empty State
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDemoResourceLoading(false);
                  setDemoResourceEmpty(false);
                  setDemoResourceError(
                    normalizeApiError({
                      error: {
                        code: 'NETWORK_TIMEOUT',
                        message: 'Connection timed out while fetching roster items.',
                      },
                      status: 504,
                    })
                  );
                }}
              >
                Test Error State
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDemoResourceLoading(false);
                  setDemoResourceEmpty(false);
                  setDemoResourceError(null);
                }}
              >
                Reset to Data State
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <ResourceState
                isLoading={demoResourceLoading}
                isEmpty={demoResourceEmpty}
                error={demoResourceError}
                onRetry={() => {
                  setDemoResourceLoading(true);
                  setDemoResourceError(null);
                  setTimeout(() => setDemoResourceLoading(false), 1500);
                }}
              >
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Success State: Resource data rendered cleanly with zero layout shifts.</span>
                </div>
              </ResourceState>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
