/**
 * Dev gallery for the cube ornament — reachable at `#ornament` (see main.tsx).
 *
 * Lets you tune the one system in isolation: clusters per variant, low vs medium
 * density, the cube-count ceiling, and the three page regions with the fade
 * applied. It is a developer tool, never part of the child flow, and carries no
 * lesson content.
 */

import { CubeField, PAGE_H, PAGE_W } from "./CubeOrnament";
import { VARIANTS, variantSwatch, type VariantName } from "./variants";
import type { Density } from "./cubeCluster";

const SEEDS = ["alto", "bergen", "cobalt", "delta", "ember", "flint"];
const VARIANT_NAMES = Object.keys(VARIANTS) as VariantName[];

/** A square, centred, unfaded card for tuning the cluster geometry. */
function ClusterCard({
  seed,
  variant,
  density,
  maxCubes,
}: {
  seed: string;
  variant: VariantName;
  density?: Density;
  maxCubes?: number;
}) {
  return (
    <figure className="orn-card">
      <CubeField
        seed={`${variant}:${density ?? "d"}:${maxCubes ?? "m"}:${seed}`}
        variant={variant}
        region="center"
        fade={false}
        fit="meet"
        width={400}
        height={400}
        {...(density ? { density } : {})}
        {...(maxCubes ? { maxCubes } : {})}
        className="orn-card__svg"
      />
      <figcaption className="orn-card__cap">{seed}</figcaption>
    </figure>
  );
}

/** A tall card showing real page placement (right region, fade on). */
function PageCard({ seed, variant, region }: { seed: string; variant: VariantName; region: "right" | "top-right" | "bottom-right" }) {
  return (
    <figure className="orn-card orn-card--tall">
      <CubeField
        seed={`${variant}:${region}:${seed}`}
        variant={variant}
        region={region}
        width={PAGE_W}
        height={PAGE_H}
        fade
        fit="meet"
        className="orn-card__svg"
      />
      <figcaption className="orn-card__cap">{region}</figcaption>
    </figure>
  );
}

export function OrnamentGallery() {
  return (
    <main className="orn-gallery">
      <header className="orn-gallery__head">
        <h1>Cube ornament gallery</h1>
        <p>
          One disciplined system: seeded isometric cube clusters, max 17 cubes, mostly negative
          space. Every figure is deterministic from <code>seed</code> (compose it from
          <code> storyId + screenId</code>). This route is a dev tool — open the app at <code>/</code>{" "}
          for the real experience.
        </p>
      </header>

      <section className="orn-section">
        <h2>Clusters by variant</h2>
        <p className="orn-section__note">Centred and unfaded, across seeds — for tuning geometry and tint.</p>
        {VARIANT_NAMES.map((variant) => (
          <div key={variant} className="orn-row">
            <h3 className="orn-row__label">
              <span className="orn-swatch" style={{ background: variantSwatch(VARIANTS[variant]) }} />
              {variant}
              <span className="orn-row__meta">density: {VARIANTS[variant].density}</span>
            </h3>
            <div className="orn-grid">
              {SEEDS.map((seed) => (
                <ClusterCard key={seed} variant={variant} seed={seed} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="orn-section">
        <h2>Density</h2>
        <p className="orn-section__note">Low (5–9) vs medium (9–17) cubes, same variant.</p>
        {(["low", "medium"] as Density[]).map((density) => (
          <div key={density} className="orn-row">
            <h3 className="orn-row__label">{density}</h3>
            <div className="orn-grid">
              {SEEDS.map((seed) => (
                <ClusterCard key={seed} variant="rover" seed={seed} density={density} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="orn-section">
        <h2>Cube-count ceiling</h2>
        <p className="orn-section__note">The hard cap (maxCubes) never exceeds 17.</p>
        <div className="orn-row">
          <div className="orn-grid">
            {[6, 10, 14, 17].map((maxCubes) => (
              <ClusterCard key={maxCubes} variant="studio" seed={`cap-${maxCubes}`} maxCubes={maxCubes} density="medium" />
            ))}
          </div>
        </div>
      </section>

      <section className="orn-section">
        <h2>Page regions</h2>
        <p className="orn-section__note">Real placement with the fade mask — as it renders behind a story.</p>
        <div className="orn-row">
          <div className="orn-grid orn-grid--tall">
            {(["right", "top-right", "bottom-right"] as const).map((region) => (
              <PageCard key={region} variant="rover" seed="bergen" region={region} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
