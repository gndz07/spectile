import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Slot, mergeProps } from "../src";

describe("mergeProps", () => {
  it("lets their props win but keeps ours where theirs are undefined", () => {
    expect(mergeProps({ id: "ours", title: "kept" }, { id: "theirs", title: undefined })).toEqual({
      id: "theirs",
      title: "kept",
    });
  });

  it("joins class names and merges styles", () => {
    expect(
      mergeProps({ className: "a", style: { color: "red" } }, { className: "b", style: { margin: 0 } }),
    ).toEqual({ className: "a b", style: { color: "red", margin: 0 } });
  });

  it("runs their handler first and skips ours when they prevent default", () => {
    const calls: string[] = [];
    const ours = () => calls.push("ours");
    const merged = mergeProps({ onClick: ours }, { onClick: () => calls.push("theirs") });
    merged.onClick();
    expect(calls).toEqual(["theirs", "ours"]);

    const prevented = mergeProps(
      { onClick: ours },
      { onClick: (event: { preventDefault: () => void }) => event.preventDefault() },
    );
    calls.length = 0;
    prevented.onClick({ preventDefault: () => {}, defaultPrevented: true } as never);
    expect(calls).toEqual([]);
  });
});

describe("Slot", () => {
  it("renders its child with merged props and refs", () => {
    const slotRef = createRef<HTMLElement>();
    const childRef = createRef<HTMLButtonElement>();
    const onSlotClick = vi.fn();
    const onChildClick = vi.fn();
    render(
      <Slot ref={slotRef} className="slot" data-part="slot" onClick={onSlotClick}>
        <button ref={childRef} type="button" className="child" onClick={onChildClick}>
          Go
        </button>
      </Slot>,
    );
    const button = screen.getByRole("button", { name: "Go" });
    expect(button.className).toBe("slot child");
    expect(button.dataset.part).toBe("slot");
    expect(slotRef.current).toBe(button);
    expect(childRef.current).toBe(button);
    fireEvent.click(button);
    expect(onChildClick).toHaveBeenCalledOnce();
    expect(onSlotClick).toHaveBeenCalledOnce();
  });
});
