const DEFAULT_DEVELOPMENT_BACKEND_URL = "http://localhost:4000";

const configuredBackendUrl =
  import.meta.env.VITE_BACKEND_URL?.trim() ||
  import.meta.env.VITE_API_URL?.trim() ||
  (import.meta.env.DEV ? DEFAULT_DEVELOPMENT_BACKEND_URL : "");

function normalizeBackendUrl(value: string): string {
  return value.replace(/\/+$/, "").replace(/\/api$/i, "");
}

export const API_BASE_URL = normalizeBackendUrl(configuredBackendUrl);

export function buildApiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("Missing VITE_BACKEND_URL. Configure the backend origin for this deployment.");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}