function resolveApiBase(): string {
  const envUrl = (import.meta.env as Record<string, string | undefined>)["VITE_API_URL"] || '';
  if (!envUrl) {
    return 'http://localhost:4000/api';
  }
  let clean = envUrl.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
}

export const API_BASE = resolveApiBase();

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  total?: number;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('marichifleet.jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const storedUser = window.localStorage.getItem('marichifleet.auth_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.tenantId) {
          headers['x-tenant-id'] = parsed.tenantId;
        }
      }
    } catch {
      // Ignore
    }
  }

  return headers;
}

export async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = cleanEndpoint.startsWith('http') ? cleanEndpoint : `${API_BASE}${cleanEndpoint}`;

  const headers = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  // Add idempotency key for mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
    if (!headers['Idempotency-Key']) {
      headers['Idempotency-Key'] = `fe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let json: any;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok || (json && json.success === false)) {
    const message = json?.error?.message || response.statusText || 'Network request failed';
    throw new ApiError(message, response.status, json?.error?.code, json?.error?.details);
  }

  return (json?.data !== undefined ? json.data : json) as T;
}

export const apiClient = {
  get: <T = any>(url: string, params?: Record<string, any>) => {
    let finalUrl = url;
    if (params) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      }
      const queryString = query.toString();
      if (queryString) {
        finalUrl += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    return request<T>(finalUrl, { method: 'GET' });
  },

  post: <T = any>(url: string, body?: any) => {
    return request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: <T = any>(url: string, body?: any) => {
    return request<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T = any>(url: string) => {
    return request<T>(url, { method: 'DELETE' });
  },
};
