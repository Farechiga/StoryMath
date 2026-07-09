// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { CubeOrnament } from "../../src/ornament/CubeOrnament";
import { OrnamentGallery } from "../../src/ornament/OrnamentGallery";

afterEach(cleanup);

describe("CubeOrnament renders as an inert SVG layer", () => {
  it("draws stroke-based cube wires and is hidden from assistive tech", () => {
    const { container } = render(
      <CubeOrnament seed="nasa-perseverance-wheel-slip::brief" variant="rover" region="right" />,
    );

    const layer = container.querySelector(".ornament");
    expect(layer).toBeTruthy();
    expect(layer!.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("svg")).toBeTruthy();

    // Each cube contributes a wire path with fill:none — the stroke-only figure.
    const wirePaths = Array.from(container.querySelectorAll("path")).filter(
      (p) => p.getAttribute("fill") === "none",
    );
    expect(wirePaths.length).toBeGreaterThan(0);
    // ≤17 cubes → ≤17 wire paths.
    expect(wirePaths.length).toBeLessThanOrEqual(17);
    // Strokes are crisp regardless of the group scale.
    expect(wirePaths[0]!.getAttribute("vector-effect")).toBe("non-scaling-stroke");
  });

  it("is deterministic: same seed → identical markup", () => {
    const a = render(<CubeOrnament seed="s::brief" variant="forest" />).container.innerHTML;
    cleanup();
    const b = render(<CubeOrnament seed="s::brief" variant="forest" />).container.innerHTML;
    expect(a).toBe(b);
  });

  it("shifts the figure when the screen (seed) changes", () => {
    const a = render(<CubeOrnament seed="s::brief" variant="rover" />).container.innerHTML;
    cleanup();
    const b = render(<CubeOrnament seed="s::solve" variant="rover" />).container.innerHTML;
    expect(a).not.toBe(b);
  });
});

describe("OrnamentGallery dev route mounts", () => {
  it("renders cube cards without crashing", () => {
    const { container, getByText } = render(<OrnamentGallery />);
    expect(getByText(/Cube ornament gallery/i)).toBeTruthy();
    expect(container.querySelectorAll(".orn-card svg").length).toBeGreaterThan(10);
  });
});
