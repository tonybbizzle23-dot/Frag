// Auth context — provides the current session user and auth actions to the
// whole app. Wraps the tree in __root.tsx via <AuthProvider>.
//
// Session cookie: fragclip_session (HttpOnly, set by the server). All API calls
// use credentials: "include" so the cookie travels with the request.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface AuthUser {
  id: string;
  email: string;
  subscription_tier: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Module-level snapshot of auth state. TanStack route guards (`beforeLoad`)
 * run outside React, so they read this instead of useAuth(). The provider
 * keeps it in sync on every state change.
 */
export const authSnapshot: { user: AuthUser | null; isLoading: boolean } = {
  user: null,
  isLoading: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** POST a JSON body to an auth endpoint and return the user on success. */
async function postAuth(url: string, body: unknown): Promise<AuthUser> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data.user as AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(authSnapshot.user);
  const [isLoading, setIsLoading] = useState(authSnapshot.isLoading);

  // On mount, check for an existing session via GET /api/auth/me.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const u = (data?.user as AuthUser | undefined) ?? null;
        setUser(u);
        authSnapshot.user = u;
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        authSnapshot.user = null;
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
        authSnapshot.isLoading = false;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyUser = (u: AuthUser | null) => {
    setUser(u);
    authSnapshot.user = u;
  };

  const login = async (email: string, password: string) => {
    const u = await postAuth("/api/auth/login", { email, password });
    applyUser(u);
  };

  const signup = async (email: string, password: string) => {
    const u = await postAuth("/api/auth/signup", { email, password });
    applyUser(u);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Even if the network call fails, drop the local session.
    }
    applyUser(null);
  };

  const value: AuthContextValue = { user, isLoading, login, signup, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
