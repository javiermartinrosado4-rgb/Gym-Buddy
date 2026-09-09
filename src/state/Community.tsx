import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { CommunityError, communityRequest, communityUrl, CommunityUser } from "../services/community";
import { useStore } from "./Store";
import { exportProgress } from "../logic/sharing";

const tokenKey = `gym-buddy:community:${communityUrl}`;
interface CommunityContext {
  token: string | null;
  user: CommunityUser | null;
  ready: boolean;
  error: string;
  authenticate: (register: boolean, data: unknown) => Promise<void>;
  authenticateGoogle: (credential: string, nonce: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
  request: <T>(path: string, method?: string, data?: unknown) => Promise<T>;
}
const Context = createContext<CommunityContext | null>(null);
export function CommunityProvider({ children }: { children: ReactNode }) {
  const { state, update } = useStore();
  const history = state.history;
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CommunityUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(tokenKey).then(saved => { if (alive) setToken(saved); })
      .catch(() => { if (alive) setError("No se ha podido recuperar tu sesión de Comunidad."); })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  const request = useCallback(async <T,>(path: string, method = "GET", data?: unknown): Promise<T> => {
    try { return await communityRequest<T>(path, token ?? undefined, method, data); }
    catch (error) {
      if (error instanceof CommunityError && error.status === 401) {
        setToken(null); setUser(null);
        await AsyncStorage.removeItem(tokenKey).catch(() => undefined);
      }
      throw error;
    }
  }, [token]);
  const refresh = useCallback(async () => {
    if (!token) return;
    const profile = await request<CommunityUser>("/me");
    setUser(profile); setError("");
  }, [token, request]);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    communityRequest<CommunityUser>("/me", token).then(profile => { if (alive) { setUser(profile); setError(""); } })
      .catch(error => {
        if (!alive) return;
        if (error instanceof CommunityError && error.status === 401) { setToken(null); setUser(null); void AsyncStorage.removeItem(tokenKey).catch(() => undefined); }
        setError(error.message);
      });
    return () => { alive = false; };
  }, [token]);
  const logout = useCallback(async () => {
    if (token) await communityRequest("/auth/logout", token, "POST");
    await AsyncStorage.removeItem(tokenKey);
    setToken(null); setUser(null); setError("");
  }, [token]);
  const deleteAccount = useCallback(async () => {
    if (!token) return;
    await communityRequest("/me", token, "DELETE");
    await AsyncStorage.removeItem(tokenKey);
    setToken(null); setUser(null); setError("");
  }, [token]);
  useEffect(() => {
    if (state.signedOut && token) {
      void communityRequest("/auth/logout", token, "POST").catch(() => undefined);
      void AsyncStorage.removeItem(tokenKey).catch(() => undefined).finally(() => { setToken(null); setUser(null); });
    }
  }, [state.signedOut, token]);
  // Once a user opts in, followers with a mutual connection see a current
  // compact snapshot after each completed session. No full history is sent.
  useEffect(() => {
    if (!token || !user?.progressPublic) return;
    void communityRequest("/progress/me", token, "PUT", exportProgress({ history })).catch(() => undefined);
  }, [history, token, user?.progressPublic]);
  return <Context.Provider value={{ token, user, ready, error, request, refresh, logout, deleteAccount,
    authenticateGoogle: async (credential, nonce) => {
      const result = await communityRequest<{ token: string; user: CommunityUser }>("/auth/google", undefined, "POST", { credential, nonce, level: state.profile.level });
      await AsyncStorage.setItem(tokenKey, result.token);
      update(s => ({ ...s, signedOut: false, profile: { ...s.profile, name: s.profile.name || result.user.name, handle: s.profile.handle || result.user.handle } }));
      setToken(result.token); setUser(result.user); setError("");
    },
    authenticate: async (register, data) => {
      const result = await communityRequest<{ token: string; user: CommunityUser }>(register ? "/auth/register" : "/auth/login", undefined, "POST", data);
      await AsyncStorage.setItem(tokenKey, result.token);
      setToken(result.token); setUser(result.user); setError("");
    },
  }}>{children}</Context.Provider>;
}
export function useCommunity() {
  const value = useContext(Context);
  if (!value) throw new Error("CommunityProvider missing");
  return value;
}
