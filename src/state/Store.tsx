import { messages } from "../content/es";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "../types";
import { emptyPreferences, emptyProfile } from "../data/options";
import { localRepository } from "../storage/repository";
export const initialState: AppState = {
  version: 1,
  profile: emptyProfile,
  preferences: emptyPreferences,
  onboardingStep: 0,
  completed: false,
  theme: "system",
  routine: [],
  history: [],
};
type Store = {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  ready: boolean;
  storageError: string;
  retry: () => void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [storageError, setError] = useState("");
  const blocked = useRef(false);
  const dirty = useRef(false);
  const queue = useRef(Promise.resolve());
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    let mounted = true;
    localRepository
      .load()
      .then((saved) => {
        if (mounted && saved) setState(saved);
      })
      .catch(() => {
        blocked.current = true;
        if (mounted)
          setError(messages.Store.noHemosPodidoRecuperarTusDatosPuedes);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || blocked.current || !dirty.current) return;
    queue.current = queue.current
      .then(() => localRepository.save(state))
      .then(() => setError(""))
      .catch(() => setError(messages.Store.noSeHanPodidoGuardarLosUltimos));
  }, [state, ready]);
  const retry = () => {
    if (blocked.current) {
      localRepository
        .load()
        .then((saved) => {
          if (saved) setState(saved);
          blocked.current = false;
          setError("");
        })
        .catch(() => setError(messages.Store.tusDatosSiguenSinPoderLeerseSe));
    } else {
      queue.current = queue.current
        .then(() => localRepository.save(stateRef.current))
        .then(() => setError(""))
        .catch(() =>
          setError(messages.Store.aunNoPodemosGuardarMantenEstaPestana),
        );
    }
  };
  return (
    <Context.Provider
      value={{
        state,
        ready,
        storageError,
        retry,
        update: (fn) => {
          if (blocked.current) return;
          dirty.current = true;
          setState(fn);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Store missing");
  return value;
}
