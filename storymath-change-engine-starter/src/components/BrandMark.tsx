import logoUrl from "../assets/StoryMathLogo.png";

/** The StoryMath logo image. */
export function BrandMark({ className }: { className?: string }) {
  return <img className={className} src={logoUrl} alt="StoryMath" />;
}
