import { normalizeApiError, NormalizedError } from './errorHandler';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: NormalizedError, delayMs: number) => void;
  shouldRetry?: (error: NormalizedError) => boolean;
}

/**
 * Execute an async operation with exponential backoff and jitter
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 200,
    maxDelayMs = 2000,
    backoffFactor = 2,
    onRetry,
    shouldRetry = (err) => err.isRetryable,
  } = options;

  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (rawError: any) {
      const normalized = normalizeApiError(rawError);

      if (attempt >= maxAttempts || !shouldRetry(normalized)) {
        throw normalized;
      }

      // Calculate exponential backoff with random jitter
      const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      const jitter = Math.random() * 0.3 * exponentialDelay; // +/- 30% jitter
      const delay = Math.min(maxDelayMs, exponentialDelay + jitter);

      if (onRetry) {
        onRetry(attempt, normalized, Math.round(delay));
      }

      await new Promise((res) => setTimeout(res, delay));
      attempt++;
    }
  }

  throw new Error('Retry limit reached');
}

/**
 * Circuit Breaker for External Service Fault Isolation
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold?: number; // Failures before opening
  recoveryTimeoutMs?: number; // Wait before testing recovery
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export class CircuitBreaker {
  public name: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private failureThreshold: number;
  private recoveryTimeoutMs: number;
  private lastFailureTime = 0;
  private onStateChange?: (from: CircuitState, to: CircuitState) => void;

  constructor(config: CircuitBreakerConfig) {
    this.name = config.name;
    this.failureThreshold = config.failureThreshold || 3;
    this.recoveryTimeoutMs = config.recoveryTimeoutMs || 10000;
    this.onStateChange = config.onStateChange;
  }

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      }
    }
    return this.state;
  }

  private transitionTo(newState: CircuitState) {
    if (this.state !== newState) {
      const prev = this.state;
      this.state = newState;
      if (this.onStateChange) {
        this.onStateChange(prev, newState);
      }
    }
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      if (fallback) {
        return fallback();
      }
      throw {
        error: {
          code: 'EXTERNAL_SERVICE_DEGRADED',
          message: `The external service ${this.name} is currently experiencing an outage. Core ERP workflows continue unaffected.`,
          requestId: `cb_${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
        status: 503,
      };
    }

    try {
      const result = await fn();
      // On success in HALF_OPEN, close circuit
      if (this.state === 'HALF_OPEN') {
        this.failureCount = 0;
        this.transitionTo('CLOSED');
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo('OPEN');
      }

      if (fallback) {
        return fallback();
      }
      throw err;
    }
  }

  reset() {
    this.failureCount = 0;
    this.transitionTo('CLOSED');
  }
}

// Pre-configured circuit breakers for external systems
export const paymentGatewayBreaker = new CircuitBreaker({ name: 'Razorpay Gateway' });
export const smsProviderBreaker = new CircuitBreaker({ name: 'SMS Alerts Gateway' });
export const emailProviderBreaker = new CircuitBreaker({ name: 'SES Email Dispatcher' });
