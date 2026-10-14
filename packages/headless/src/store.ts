export type Listener = () => void;

export type ReadableStore<T> = {
  getSnapshot: () => T;
  subscribe: (listener: Listener) => () => void;
};

export type Store<T> = ReadableStore<T> & {
  setState: (update: Partial<T> | ((state: T) => T)) => void;
};

const hasChanges = <T extends object>(state: T, patch: Partial<T>) =>
  (Object.keys(patch) as (keyof T)[]).some((key) => !Object.is(state[key], patch[key]));

export const createStore = <T extends object>(initial: T): Store<T> => {
  let state = initial;
  const listeners = new Set<Listener>();

  const setState = (update: Partial<T> | ((state: T) => T)) => {
    const next =
      typeof update === "function"
        ? update(state)
        : hasChanges(state, update)
          ? { ...state, ...update }
          : state;
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { getSnapshot: () => state, setState, subscribe };
};

export const memoizeLast = <A, R>(compute: (argument: A) => R) => {
  let cached: { argument: A; result: R } | undefined;
  return (argument: A) => {
    if (!cached || !Object.is(cached.argument, argument)) {
      cached = { argument, result: compute(argument) };
    }
    return cached.result;
  };
};

export const select = <S, R>(store: ReadableStore<S>, compute: (state: S) => R): ReadableStore<R> => {
  const derive = memoizeLast(compute);
  return { getSnapshot: () => derive(store.getSnapshot()), subscribe: store.subscribe };
};
