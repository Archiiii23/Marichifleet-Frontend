import { toast } from 'sonner';

export interface GoogleAuthResponse {
  token: string;
  user: {
    userId: string;
    email: string;
    name: string;
    avatarUrl?: string;
    role: string;
    tenantId: string;
    orgId: string;
    branches: string[];
    authProvider: string;
  };
}

import { API_BASE } from '../services/apiClient.js';

export async function loginWithGoogle(customProfile?: {
  email: string;
  name: string;
  avatarUrl?: string;
  credential?: string;
}): Promise<GoogleAuthResponse> {
  const profile = customProfile || {
    email: 'dewarsh.jain@google.com',
    name: 'Dewarsh Jain',
    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
    googleId: 'google_oauth_sub_10928391823',
  };

  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Google authentication failed');
    }

    // Persist JWT and user profile in localStorage for API requests and session
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('marichifleet.jwt_token', data.data.token);
      window.localStorage.setItem('marichifleet.auth_user', JSON.stringify(data.data.user));
      window.localStorage.setItem('marichifleet.persona', 'u_owner');
      window.localStorage.setItem('marichifleet.demo', '1');
    }

    toast.success(`Welcome, ${data.data.user.name}!`, {
      description: `Signed in with Google. User synchronized in MongoDB database (${data.data.user.email}).`,
    });

    return data.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Google authentication request failed';
    toast.error('Google Sign-In Error', { description: msg });
    throw err;
  }
}
