import { jwtDecode } from "jwt-decode";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export const getAuthToken = () => {
  return localStorage.getItem("auth_token");
};

export const setAuthToken = (token: string) => {
  localStorage.setItem("auth_token", token);
};

export const removeAuthToken = () => {
  localStorage.removeItem("auth_token");
};

export const decodeToken = (token: string) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    return null;
  }
};

export const fetchApi = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  const { requireAuth = true, headers, ...rest } = options;

  const token = getAuthToken();
  const authHeaders: Record<string, string> = {};

  if (requireAuth && token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    headers: defaultHeaders,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `API Error: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};
