"use client";

import type { LoginDto, RegisterDto, Role, User } from "@pitchkh/shared";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  /** "loading" until the persisted session has been read. */
  status: "loading" | "ready";
  login: (dto: LoginDto) => Promise<User>;
  register: (dto: RegisterDto) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth state for the whole app. It only talks to api.auth, so a JWT backend
 * slots in with no changes here: login returns tokens + user, tokens are
 * stored through the StorageAdapter and attached by the transport.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  useEffect(() => {
    let alive = true;
    void api.auth.restore().then((restored) => {
      if (!alive) return;
      setUser(restored);
      setStatus("ready");
    });
    const unsubscribe = api.auth.onChange(setUser);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (dto: LoginDto) => {
      const session = await api.auth.login(dto);
      await queryClient.invalidateQueries();
      return session.user;
    },
    [queryClient],
  );
  const register = useCallback(
    async (dto: RegisterDto) => {
      const session = await api.auth.register(dto);
      await queryClient.invalidateQueries();
      return session.user;
    },
    [queryClient],
  );
  const logout = useCallback(async () => {
    await api.auth.logout();
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, hasRole: (...roles) => !!user && roles.includes(user.role) }),
    [user, status, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
