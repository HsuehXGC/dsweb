'use client';

const ACCESS_KEY = 'dsweb_access_token';
const REFRESH_KEY = 'dsweb_refresh_token';
const USER_KEY = 'dsweb_user';

export interface SessionUser {
  email: string;
  role: string;
  permissions?: string[];
}

export const session = {
  get token(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  get user(): SessionUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  },
  save(access: string, refresh: string, user: SessionUser) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
