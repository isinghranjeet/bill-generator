const API_BASE_RAW = import.meta.env.VITE_API_URL;

if (!API_BASE_RAW) {
  throw new Error("Missing VITE_API_URL in .env");
}

// Normalize to prevent accidental `/api/api/`.
// Example expected: `http://localhost:4000/api`.
const API_BASE = API_BASE_RAW.replace(/\/$/, "");

export function getToken() {
  return localStorage.getItem("token") || "";
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T = unknown>(
  path: string,
  {
    method = "GET",
    body,
    headers,
  }: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Prevent accidental double /api segments in the caller.
  const cleanedPath = normalizedPath.replace(/^\/api\//, "/");

  const url = `${API_BASE}${cleanedPath}`;

  console.log("[apiFetch]", { method, url });

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });


  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const parsedErrorMessage =
      typeof parsed === "object" && parsed !== null
        ? ((parsed as { error?: { message?: string } })?.error?.message ??
            (parsed as { message?: string })?.message ??
            "")
        : "";

    console.error("[apiFetch] Request failed", {
      method,
      url,
      status: res.status,
      parsed,
      parsedErrorMessage,
    });

    // If auth fails, clear the invalid token and redirect to login.
    if (res.status === 401) {
      try {
        localStorage.removeItem("token");
      } catch {
        // ignore
      }
      // Avoid importing react-router here; do a hard redirect.
      if (typeof window !== "undefined") {
        window.location.href = "/auth";
      }
    }

    const message =
      parsedErrorMessage || `Request failed (${res.status})`;

    throw new Error(message);
  }

  return parsed as T;
}


