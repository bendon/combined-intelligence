import { createContext, useContext, useEffect, useState } from "react";
import { auth, push } from "./api.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    auth.me()
      .then(setUser)
      .catch((e) => {
        // 401 = anonymous visitor. Anything else (network failure, 5xx, CORS)
        // is treated the same so the UI never hangs in the "loading" state —
        // we just show the public surface and surface the reason in DevTools.
        if (e?.status && e.status !== 401) {
          // eslint-disable-next-line no-console
          console.warn("[auth] /auth/me failed:", e.status, e.message);
          setError(e.message);
        } else if (!e?.status) {
          // eslint-disable-next-line no-console
          console.warn("[auth] /auth/me unreachable:", e?.message || e);
          setError(e?.message || "Auth endpoint unreachable");
        }
        setUser(null);
      });
  }, []);

  const logout = async () => {
    await auth.logout();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, logout, error }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

export function LoginButton({ className = "" }) {
  return (
    <a href={auth.loginUrl()} className={className}>
      <GoogleIcon />
      Continue with Google
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 8 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

// ── Push notification subscription ───────────────────────────────────────────

export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await push.vapidKey();

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: _urlBase64ToUint8Array(publicKey),
  });

  const json = sub.toJSON();
  await push.subscribe({
    endpoint: json.endpoint,
    keys: json.keys,
  });
  return true;
}

function _urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
