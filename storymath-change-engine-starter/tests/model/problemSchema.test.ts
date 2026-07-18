import { describe, expect, it } from "vitest";
import schema from "../../data/problem-schema.json";

describe("problem-schema.json", () => {
  it("matches the current ProblemSpec surface instead of the old visualization schema", () => {
    expect(schema.required).toContain("dimension");
    expect(schema.required).toContain("storyChrome");
    expect(schema.required).toContain("recap");
    expect(schema.required).not.toContain("visualizations");
    expect(schema.properties).not.toHaveProperty("visualizations");
  });

  it("documents catalog ordering metadata", () => {
    const metadata = schema.$defs.metadata.properties;
    expect(metadata).toHaveProperty("catalogOrder");
    expect(metadata).toHaveProperty("publishedAt");
  });
});
