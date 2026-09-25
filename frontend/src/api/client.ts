/**
 * Thin fetch wrapper. Auth lives in httpOnly cookies, so every request sends
 * credentials. On 401 we try one silent refresh, then retry the request once.
 */

import { t } from '@/i18n'

export const API_BASE = '/api/v1'

export interface ApiErrorDetail {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** Field-level validation errors from a 422 response. */
  get fieldErrors(): ApiErrorDetail[] {
    return Array.isArray(this.details) ? (this.details as ApiErrorDetail[]) : []
  }
}

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  signal?: AbortSignal
}

let onSessionExpired: () => void = () => {}

/** Register what happens when the session can't be refreshed (e.g. go to /login). */
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(API_BASE + path, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return url.pathname + url.search
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const isForm = opts.body instanceof FormData
  try {
    return await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: opts.body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {},
      body:
        opts.body === undefined
          ? undefined
          : isForm
            ? (opts.body as FormData)
            : JSON.stringify(opts.body),
      signal: opts.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'network_error', t.common.networkError)
  }
}

async function toError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string; details?: unknown }
    }
    if (body.error) {
      return new ApiError(
        res.status,
        body.error.code ?? 'error',
        body.error.message ?? t.common.somethingWrong,
        body.error.details,
      )
    }
  } catch {
    // Non-JSON error body (e.g. proxy error page); fall through.
  }
  return new ApiError(res.status, 'error', t.common.somethingWrong)
}

// Single-flight: concurrent 401s share one refresh request.
let refreshing: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(API_BASE + '/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout']

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(path, opts)

  if (res.status === 401 && !NO_REFRESH_PATHS.includes(path)) {
    if (await refreshSession()) {
      res = await send(path, opts)
    }
    if (res.status === 401) {
      onSessionExpired()
    }
  }

  if (!res.ok) throw await toError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/** Human-readable message for any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return t.common.somethingWrong
}
