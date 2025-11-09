import { readable, writable } from 'svelte/store';

type VsCodeAPI = {
  postMessage: (message: unknown) => void;
  setState: <T>(state: T) => void;
  getState: <T>() => T | undefined;
};

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeAPI;
  }
}

let cachedApi: VsCodeAPI | undefined;

export function ensureVsCodeApi(): VsCodeAPI {
  if (!cachedApi) {
    if (typeof window !== 'undefined' && typeof window.acquireVsCodeApi === 'function') {
      cachedApi = window.acquireVsCodeApi();
    } else {
      throw new Error('VS Code API is not available in this context.');
    }
  }
  return cachedApi;
}

export const vscodeApiStore = readable<VsCodeAPI | null>(null, (set) => {
  try {
    set(ensureVsCodeApi());
  } catch (err) {
    console.error(err);
  }
  return () => {
    set(null);
  };
});

export function postMessage<TMessage>(message: TMessage): void {
  ensureVsCodeApi().postMessage(message);
}

export function setState<TState>(state: TState): void {
  ensureVsCodeApi().setState(state);
}

export function getState<TState>(): TState | undefined {
  return ensureVsCodeApi().getState<TState>();
}

export function subscribeToMessages<TMessage>(handler: (message: TMessage) => void): () => void {
  const listener = (event: MessageEvent) => {
    handler(event.data as TMessage);
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

export function createMessageStore<TMessage>() {
  return readable<TMessage | null>(null, (set) => {
    const unsubscribe = subscribeToMessages<TMessage>((message) => {
      set(message);
    });
    return () => unsubscribe();
  });
}

export function createStateStore<TState>(key: string, initialValue: TState) {
  const store = writable<TState>(initialValue);

  const currentState = getState<Record<string, TState> | undefined>();
  if (currentState && key in currentState) {
    store.set(currentState[key] as TState);
  }

  const unsubscribe = store.subscribe((value) => {
    const state = getState<Record<string, TState>>() ?? {};
    state[key] = value;
    setState(state);
  });

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,
    dispose: unsubscribe,
  };
}

