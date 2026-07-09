/**
 * The pearlescent chromatic-white field: a soft tri-tone gradient base overlaid
 * with slowly drifting, heavily blurred chromatic auroras. Purely decorative,
 * so it is hidden from assistive tech.
 */
export function PearlBackground() {
  return (
    <div className="pearl-bg" aria-hidden="true">
      <div className="pearl-orb pearl-orb--blush" />
      <div className="pearl-orb pearl-orb--peri" />
      <div className="pearl-orb pearl-orb--mint" />
      <div className="pearl-orb pearl-orb--gold" />
      <div className="pearl-orb pearl-orb--lilac" />
    </div>
  );
}
