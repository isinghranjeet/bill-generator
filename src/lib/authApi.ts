import { apiFetch } from "@/lib/apiClient";

export type LoginResponse = { ok: true; token: string };

export async function login(email: string, password: string) {
  const data = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });

  localStorage.setItem("token", data.token);
  return data;
}

export async function register(email: string, password: string, name?: string) {
  const data = await apiFetch<LoginResponse>("/api/auth/register", {
    method: "POST",
    body: { email, password, name },
  });

  localStorage.setItem("token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}

export type MeResponse = {
  ok: true;
  user: {
    _id: string;
    email: string;
    name: string;
  };
};

export async function fetchMe() {
  const data = await apiFetch<MeResponse>("/api/auth/me");
  return data.user;
}

