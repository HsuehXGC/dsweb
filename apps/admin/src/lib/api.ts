'use client';

import { session } from './session';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = session.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return (json.data ?? json) as T;
}

export const api = {
  login(email: string, password: string) {
    return request<{
      access_token: string;
      refresh_token: string;
      user: { email: string; role: string };
    }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  me() {
    return request<{ email: string; role: string; permissions: string[] }>('/auth/me');
  },
  listPages() {
    return request<Array<{ id: string; slug: string; title: string; status: string }>>(
      '/admin/cms/pages',
    );
  },
  getPage(id: string) {
    return request<{
      id: string;
      slug: string;
      title: string;
      status: string;
      sections: Array<{
        id: string;
        type: string;
        sort: number;
        blocks: Array<{ id: string; type: string; content: Record<string, unknown> }>;
      }>;
    }>(`/admin/cms/pages/${id}`);
  },
  updateBlock(id: string, content: Record<string, unknown>) {
    return request(`/admin/cms/blocks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  },
  getSettings() {
    return request<{
      groups: Record<string, string>;
      settings: Array<{
        key: string;
        group: string;
        label: string;
        type: string;
        value?: unknown;
        isSet?: boolean;
        isSecret: boolean;
      }>;
    }>('/admin/settings');
  },
  updateSettings(settings: Array<{ key: string; value: unknown }>) {
    return request<{ updated: number }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  },

  // ---- CRM ----
  // 注：分页接口返回 { data, meta }，而 request() 会自动解包 .data，故此处直接拿到数组。
  listLeads(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return request<
      Array<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        phone: string | null;
        source: string | null;
        status: string;
        convertedCustomerId: string | null;
        createdAt: string;
      }>
    >(`/admin/crm/leads${qs ? `?${qs}` : ''}`);
  },
  updateLead(id: string, body: Record<string, unknown>) {
    return request(`/admin/crm/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  },
  convertLead(id: string) {
    return request<{ customer_uuid: string; customer_id: string }>(
      `/admin/crm/leads/${id}/convert`,
      { method: 'POST' },
    );
  },
  listCustomers(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return request<
      Array<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        phone: string | null;
        source: string | null;
        vipLevel: number;
        createdAt: string;
      }>
    >(`/admin/crm/customers${qs ? `?${qs}` : ''}`);
  },
  getCustomer(id: string) {
    return request<Record<string, unknown>>(`/admin/crm/customers/${id}`);
  },
  getBoard() {
    return request<
      Array<{
        stage: string;
        deals: Array<{
          id: string;
          title: string;
          amount: string | null;
          stage: string;
          customer: { firstName: string | null; lastName: string | null; email: string } | null;
        }>;
      }>
    >('/admin/crm/deals/board');
  },
  updateDeal(id: string, body: Record<string, unknown>) {
    return request(`/admin/crm/deals/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  },
  createActivity(body: Record<string, unknown>) {
    return request('/admin/crm/activities', { method: 'POST', body: JSON.stringify(body) });
  },
};

export { ApiError };
