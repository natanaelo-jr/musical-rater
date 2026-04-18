const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

type JsonValue = Record<string, unknown>;

let csrfPromise: Promise<string> | null = null;

export class ApiError extends Error {
  status: number;
  payload: JsonValue | null;

  constructor(message: string, status: number, payload: JsonValue | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

const getCookie = (name: string) => {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=")[1] ?? "") : "";
};

const readJson = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as JsonValue;
};

export const ensureCsrfToken = async () => {
  const cached = getCookie("csrftoken");
  if (cached) {
    return cached;
  }

  if (!csrfPromise) {
    csrfPromise = fetch(`${API_BASE}/auth/csrf`, {
      credentials: "include",
    })
      .then(async (response) => {
        const payload = await readJson(response);
        const token =
          getCookie("csrftoken") || String(payload?.csrfToken ?? "");
        if (!token) {
          throw new ApiError(
            "Unable to initialize CSRF token.",
            response.status,
            payload,
          );
        }
        return token;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
};

export const apiRequest = async <T>(
  path: string,
  init?: RequestInit & { skipCsrf?: boolean },
) => {
  const headers = new Headers(init?.headers);
  const method = init?.method ?? "GET";

  if (!init?.skipCsrf && method !== "GET" && method !== "HEAD") {
    headers.set("X-CSRFToken", await ensureCsrfToken());
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const payload = await readJson(response);
  if (!response.ok) {
    const message =
      String(payload?.detail ?? payload?.message ?? "Request failed.") ||
      "Request failed.";
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
};

export const apiGet = <T>(path: string) =>
  apiRequest<T>(path, { method: "GET" });
