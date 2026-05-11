const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(err.detail || "Request failed"), { status: res.status });
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  loginUrl: () => `${BASE}/auth/google/login`,
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reports = {
  listPublic: (params = {}) =>
    request("/reports/public?" + new URLSearchParams(params)),
  getPublic: (slug) => request(`/reports/public/${slug}`),
  list: (params = {}) => request("/reports/?" + new URLSearchParams(params)),
  get: (slug) => request(`/reports/${slug}`),
  create: (body) => request("/reports/", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/reports/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => request(`/reports/${id}`, { method: "DELETE" }),
  uploadPdf: (id, file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/reports/${id}/pdf`, {
      method: "POST",
      credentials: "include",
      body: form,
    }).then((r) => r.json());
  },
  uploadOgImage: (id, file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/reports/${id}/og-image`, {
      method: "POST",
      credentials: "include",
      body: form,
    }).then((r) => r.json());
  },
};

// ── Jobs / synthesis ──────────────────────────────────────────────────────────
export const jobs = {
  list: (params = {}) => request("/jobs/?" + new URLSearchParams(params)),
  get: (id) => request(`/jobs/${id}`),
  synthesize: (reportId) => request(`/jobs/synthesize/${reportId}`, { method: "POST" }),
  ingest: (reportId) => request(`/jobs/ingest/${reportId}`, { method: "POST" }),
};

// ── Search ────────────────────────────────────────────────────────────────────
export const search = {
  query: (q, limit = 5) => request(`/search/?q=${encodeURIComponent(q)}&limit=${limit}`),
};

// ── Predictions ───────────────────────────────────────────────────────────────
export const predictions = {
  list: (params = {}) => request("/predictions/?" + new URLSearchParams(params)),
  stats: () => request("/predictions/stats"),
  calibration: () => request("/predictions/calibration"),
};

// ── Push ──────────────────────────────────────────────────────────────────────
export const push = {
  vapidKey: () => request("/push/vapid-public-key"),
  subscribe: (subscription) =>
    request("/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }),
  unsubscribe: (endpoint) =>
    request(`/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, { method: "DELETE" }),
  broadcast: (payload) =>
    request("/push/broadcast", { method: "POST", body: JSON.stringify(payload) }),
  notifyReport: (slug) => request(`/push/notify-report/${slug}`, { method: "POST" }),
};
