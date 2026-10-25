/** One entry of the Django error envelope (`docs/api/admin-api-v1.md` §1.6). */
export interface ErrorItem {
  /** Dotted snake_case path from the body root (`texts.uz.name`, `tiers.1.percent`) or `null`. */
  field: string | null;
  code: string;
  message: string;
}

export interface ErrorEnvelope {
  code: string;
  message: string;
  errors: ErrorItem[];
  request_id: string;
}

/**
 * A non-2xx answer from the API (or a transport failure, `status` 0). The
 * envelope is always present: unparsable bodies (e.g. an edge-proxy error
 * page) get a synthetic `http_<status>` code so callers can still branch.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ErrorEnvelope;
  /** Seconds from `Retry-After`, when the API sent it (429, 409 request_in_progress). */
  readonly retryAfter: number | undefined;

  constructor(
    status: number,
    body: ErrorEnvelope,
    options: { retryAfter?: number; cause?: unknown } = {},
  ) {
    super(
      `${status} ${body.code}: ${body.message}`,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.retryAfter = options.retryAfter;
  }

  get code(): string {
    return this.body.code;
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let body: ErrorEnvelope = {
      code: `http_${response.status}`,
      message: "Kutilmagan xato.",
      errors: [],
      request_id: response.headers.get("x-request-id") ?? "",
    };
    try {
      const parsed = (await response.json()) as Partial<ErrorEnvelope> | null;
      if (parsed && typeof parsed.code === "string") {
        body = {
          code: parsed.code,
          message: typeof parsed.message === "string" ? parsed.message : body.message,
          errors: Array.isArray(parsed.errors) ? parsed.errors : [],
          request_id: typeof parsed.request_id === "string" ? parsed.request_id : body.request_id,
        };
      }
    } catch {
      // Non-JSON error body: keep the synthetic envelope.
    }
    return new ApiError(response.status, body, {
      retryAfter: parseRetryAfter(response.headers.get("retry-after")),
    });
  }
}

/**
 * Seconds from a `Retry-After` header: the contract sends delta-seconds, an
 * edge proxy may send an HTTP-date (converted relative to `now`, never below
 * 0). Anything else is `undefined`.
 */
export function parseRetryAfter(value: string | null, now: Date = new Date()): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return undefined;
  return Math.max(0, Math.ceil((at - now.getTime()) / 1000));
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
