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

  it("adds one stickerfied puppy scaled to the largest cube", () => {
    const { container } = render(<CubeOrnament seed="puppy-preview::brief" variant="forest" />);
    const puppy = container.querySelector("image.ornament__puppy");

    expect(puppy).toBeTruthy();
    expect(["perched", "behind"]).toContain(puppy!.getAttribute("data-puppy-placement"));
    expect(puppy!.getAttribute("data-puppy-id")).toMatch(/^Pup[1-5]$/);

    const cubeEdge = Number(puppy!.getAttribute("data-cube-edge"));
    const puppyHeight = Number(puppy!.getAttribute("height"));
    expect(puppyHeight).toBeCloseTo(cubeEdge * 2.08, 1);
  });

  it("places behind puppies at an outer island while keeping largest-cube scale", () => {
    const { container } = render(<CubeOrnament seed="default:sample:0" variant="default" />);
    const puppy = container.querySelector("image.ornament__puppy");

    expect(puppy).toBeTruthy();
    expect(puppy!.getAttribute("data-puppy-placement")).toBe("behind");
    expect(Number(puppy!.getAttribute("data-puppy-anchor-group"))).toBeGreaterThan(0);

    const cubeEdge = Number(puppy!.getAttribute("data-cube-edge"));
    const anchorEdge = Number(puppy!.getAttribute("data-puppy-anchor-edge"));
    const puppyHeight = Number(puppy!.getAttribute("height"));
    expect(anchorEdge).toBeLessThanOrEqual(cubeEdge);
    expect(puppyHeight).toBeCloseTo(cubeEdge * 2.08, 1);
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
