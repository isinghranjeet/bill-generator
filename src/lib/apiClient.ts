import { buildApiUrl } from "@/lib/apiConfig";

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
  const url = buildApiUrl(path);

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








