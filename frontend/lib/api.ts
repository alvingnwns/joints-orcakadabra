/**
 * Small typed fetch wrapper for the backend API.
 * Every failure becomes an ApiError with a `kind`, so the UI can show calm, specific messages.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type ApiErrorKind = "network" | "timeout" | "http";

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      signal: controller.signal,
    });
  } catch {
    throw controller.signal.aborted
      ? new ApiError("timeout", "The server took too long to answer.")
      : new ApiError("network", "Could not reach the server.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ApiError("http", `Request failed with status ${response.status}.`, response.status);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}
