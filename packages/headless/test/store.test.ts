import { describe, expect, it, vi } from "vitest";
import { createStore, select } from "../src";

describe("createStore", () => {
  it("merges partial updates and notifies subscribers", () => {
    const store = createStore({ count: 0, label: "a" });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ count: 1 });
    expect(store.getSnapshot()).toEqual({ count: 1, label: "a" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps the same snapshot and stays quiet when nothing changes", () => {
    const store = createStore({ count: 0 });
    const before = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ count: 0 });
    store.setState((state) => state);
    expect(store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.setState(({ count }) => ({ count: count + 1 }));
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("select", () => {
  it("returns the same derived snapshot until the source state changes", () => {
    const store = createStore({ count: 1 });
    const compute = vi.fn(({ count }: { count: number }) => ({ double: count * 2 }));
    const doubled = select(store, compute);
    expect(doubled.getSnapshot()).toBe(doubled.getSnapshot());
    store.setState({ count: 2 });
    expect(doubled.getSnapshot()).toEqual({ double: 4 });
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
