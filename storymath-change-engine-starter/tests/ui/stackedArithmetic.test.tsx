// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StackedArithmetic } from "../../src/components/StackedArithmetic";

afterEach(cleanup);

function renderMultiplicationWorkspace() {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(
    <StackedArithmetic
      left={30}
      right={8}
      operator="×"
      unit="books"
      ariaLabel="Answer for total books"
      submitLabel="Enter answer"
      onChange={onChange}
      onSubmit={vi.fn()}
    />,
  );

  return {
    user,
    onChange,
    hundreds: screen.getByRole("textbox", { name: /Answer for total books, hundreds place/i }) as HTMLInputElement,
    tens: screen.getByRole("textbox", { name: /Answer for total books, tens place/i }) as HTMLInputElement,
    ones: screen.getByRole("textbox", { name: /Answer for total books, ones place/i }) as HTMLInputElement,
  };
}

describe("StackedArithmetic answer entry focus", () => {
  it("auto-tabs right when the answer starts at the far-left place", async () => {
    const { user, onChange, hundreds, tens, ones } = renderMultiplicationWorkspace();

    await user.type(hundreds, "2");
    expect(document.activeElement).toBe(tens);

    await user.keyboard("4");
    expect(document.activeElement).toBe(ones);

    await user.keyboard("0");
    expect(onChange).toHaveBeenLastCalledWith("240");
  });

  it("does not auto-tab when the answer starts in the middle place", async () => {
    const { user, onChange, tens } = renderMultiplicationWorkspace();

    await user.type(tens, "4");

    expect(document.activeElement).toBe(tens);
    expect(onChange).toHaveBeenLastCalledWith("4");
  });

  it("auto-tabs left when the answer starts at the far-right place", async () => {
    const { user, onChange, hundreds, tens, ones } = renderMultiplicationWorkspace();

    await user.type(ones, "0");
    expect(document.activeElement).toBe(tens);

    await user.keyboard("4");
    expect(document.activeElement).toBe(hundreds);

    await user.keyboard("2");
    expect(onChange).toHaveBeenLastCalledWith("240");
  });
});
