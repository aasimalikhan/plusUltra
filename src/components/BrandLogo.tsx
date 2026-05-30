import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  href = "/today",
  size = "nav",
  showWordmark = true,
  className,
}: {
  href?: string;
  size?: "nav" | "hero";
  showWordmark?: boolean;
  className?: string;
}) {
  const icon = size === "hero" ? 72 : 32;

  const inner = (
    <>
      <Image
        src="/logo.png"
        alt=""
        width={icon}
        height={icon}
        className={cn(
          "shrink-0 object-contain",
          size === "hero" && "drop-shadow-[0_0_24px_rgba(255,255,255,0.12)]",
        )}
        priority={size === "hero"}
      />
      {showWordmark && (
        <span
          className={cn(
            "font-display font-semibold tracking-tight text-fg",
            size === "hero" ? "text-2xl" : "text-[15px]",
          )}
        >
          <span className="font-normal text-fg-muted">plus</span>Ultra
        </span>
      )}
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-2.5 transition-opacity hover:opacity-90",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return <div className={classes}>{inner}</div>;
}
