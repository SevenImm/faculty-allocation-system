import Link from "next/link";
import type { ReactNode } from "react";

type PortalLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
};

/**
 * Large rounded call-to-action link (Radiant button style, TAMIU colors).
 */
export default function PortalLink({ href, children, variant = "primary" }: PortalLinkProps) {
  const styles =
    variant === "primary"
      ? "bg-maroon text-white hover:bg-maroon-800"
      : "bg-gold text-gray-950 ring-1 ring-gold-600/30 hover:bg-gold-600 hover:text-white";

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full border border-transparent px-5 py-[calc(--spacing(2.5)-1px)] text-base font-medium whitespace-nowrap shadow-md ${styles}`}
    >
      {children}
    </Link>
  );
}
