// One React context for all demo state, persisted to localStorage under STORAGE_KEY.
// Every read and write is wrapped in try/catch; without storage the demo runs in memory.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { createSeed } from '../data/seed';
import { STORAGE_KEY } from '../lib/config';
import { demoStateSchema } from '../lib/schema';
import type { DemoState } from '../lib/types';
import { reducer, type Action } from './reducer';

function load(): { state: DemoState; persisted: boolean } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = demoStateSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return { state: parsed.data as unknown as DemoState, persisted: true };
    }
    return { state: createSeed(), persisted: true };
  } catch {
    return { state: createSeed(), persisted: false };
  }
}

function save(state: DemoState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

interface Store {
  state: DemoState;
  dispatch: (a: Action) => void;
  reset: () => void;
  /** False when the browser blocks storage; the demo still works until the tab closes. */
  persisted: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: DemoState }) {
  const first = useRef(initial ? { state: initial, persisted: false } : load());
  const [state, dispatch] = useReducer(reducer, first.current.state);
  const persisted = useRef(first.current.persisted);

  useEffect(() => {
    if (!initial) persisted.current = save(state);
  }, [state, initial]);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable: the in-memory reset below is enough */
    }
    dispatch({ type: 'reset', state: createSeed() });
  }, []);

  const value = useMemo(() => ({ state, dispatch, reset, persisted: persisted.current }), [state, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

export const nowIso = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
