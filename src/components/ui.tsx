/**
 * Shared UI building blocks.
 *
 * Styling is adapted from the Tailwind Plus "Radiant" template (plus-grid
 * lines, rounded-full buttons, soft gradient hero), recolored with the
 * TAMIU maroon and gold palette defined in app/globals.css.
 *
 * These are plain server components with no extra dependencies.
 */

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx(className, "px-6 lg:px-8")}>
      <div className="mx-auto max-w-2xl lg:max-w-7xl">{children}</div>
    </div>
  );
}

export function Gradient({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        className,
        "bg-linear-115 from-gold-100 from-15% via-gold via-55% to-maroon sm:bg-linear-145"
      )}
    />
  );
}

export function GradientBackground() {
  return (
    <div className="relative mx-auto max-w-7xl">
      <div
        className={cx(
          "absolute -top-44 -right-60 h-60 w-xl transform-gpu md:right-0",
          "bg-linear-115 from-gold-100 from-20% via-gold via-60% to-maroon",
          "rotate-[-10deg] rounded-full blur-3xl"
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plus grid (the thin double lines with "+" marks from Radiant)       */
/* ------------------------------------------------------------------ */

export function PlusGridRow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        className,
        "group/row relative isolate pt-[calc(--spacing(2)+1px)] last:pb-[calc(--spacing(2)+1px)]"
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2"
      >
        <div className="absolute inset-x-0 top-0 border-t border-black/5" />
        <div className="absolute inset-x-0 top-2 border-t border-black/5" />
        <div className="absolute inset-x-0 bottom-0 hidden border-b border-black/5 group-last/row:block" />
        <div className="absolute inset-x-0 bottom-2 hidden border-b border-black/5 group-last/row:block" />
      </div>
      {children}
    </div>
  );
}

export function PlusGridItem({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx(className, "group/item relative")}>
      <PlusGridIcon placement="top left" className="hidden group-first/item:block" />
      <PlusGridIcon placement="top right" />
      <PlusGridIcon
        placement="bottom left"
        className="hidden group-first/item:group-last/row:block"
      />
      <PlusGridIcon placement="bottom right" className="hidden group-last/row:block" />
      {children}
    </div>
  );
}

function PlusGridIcon({
  className,
  placement,
}: {
  className?: string;
  placement: `${"top" | "bottom"} ${"right" | "left"}`;
}) {
  const [yAxis, xAxis] = placement.split(" ");
  return (
    <svg
      viewBox="0 0 15 15"
      aria-hidden="true"
      className={cx(
        className,
        "absolute size-[15px] fill-black/10",
        yAxis === "top" ? "-top-2" : "-bottom-2",
        xAxis === "left" ? "-left-2" : "-right-2"
      )}
    >
      <path d="M8 0H7V7H0V8H7V15H8V8H15V7H8V0Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/offices", label: "Offices" },
  { href: "/admin/allocations", label: "Allocations" },
  { href: "/admin/history", label: "History" },
  { href: "/faculty", label: "Faculty Portal" },
];

export function Logo() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-maroon text-sm font-semibold text-gold-100 shadow-md ring-1 ring-gold/40">
        FA
      </span>
      <span className="text-base/5 font-semibold tracking-tight text-gray-950">
        Faculty Allocation
        <span className="block text-xs/4 font-medium text-gray-950/60">
          Office management
        </span>
      </span>
    </span>
  );
}

export function Navbar() {
  return (
    <header className="pt-10 sm:pt-12">
      <PlusGridRow className="relative flex justify-between">
        <PlusGridItem className="py-3">
          <Link href="/" title="Home">
            <Logo />
          </Link>
        </PlusGridItem>

        {/* Desktop links */}
        <nav className="relative hidden lg:flex">
          {navLinks.map(({ href, label }) => (
            <PlusGridItem key={href} className="relative flex">
              <Link
                href={href}
                className="flex items-center px-4 py-3 text-base font-medium text-gray-950 bg-blend-multiply hover:bg-black/2.5"
              >
                {label}
              </Link>
            </PlusGridItem>
          ))}
        </nav>

        {/* Mobile menu: native <details>, so no client JavaScript needed */}
        <details className="group relative self-center lg:hidden">
          <summary
            aria-label="Open main menu"
            className="flex size-12 cursor-pointer list-none items-center justify-center rounded-lg hover:bg-black/5 [&::-webkit-details-marker]:hidden"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
              <path
                fillRule="evenodd"
                d="M3 9a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 9Zm0 6.75a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <div className="absolute right-0 z-20 mt-2 flex w-56 flex-col gap-1 rounded-xl bg-white p-2 shadow-lg ring-1 ring-black/5">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-base font-medium text-gray-950 hover:bg-gray-50"
              >
                {label}
              </Link>
            ))}
          </div>
        </details>
      </PlusGridRow>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Page frame                                                          */
/* ------------------------------------------------------------------ */

/**
 * Standard page: gradient hero with navbar + title, then content.
 */
export function PageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col overflow-hidden">
      <div className="relative">
        <Gradient className="absolute inset-2 bottom-0 rounded-4xl opacity-90 ring-1 ring-black/5 ring-inset" />
        <div className="absolute inset-2 bottom-0 rounded-4xl bg-white/55" />
        <Container className="relative">
          <Navbar />
          <div className="pt-12 pb-14 sm:pt-16 sm:pb-20">
            {eyebrow && <Subheading>{eyebrow}</Subheading>}
            <h1 className="mt-2 text-4xl font-medium tracking-tighter text-pretty text-gray-950 sm:text-6xl">
              {title}
            </h1>
            {description && (
              <p className="mt-4 max-w-2xl text-lg/7 font-medium text-gray-950/70">
                {description}
              </p>
            )}
            {actions && (
              <div className="mt-8 flex flex-col gap-x-4 gap-y-3 sm:flex-row sm:flex-wrap">
                {actions}
              </div>
            )}
          </div>
        </Container>
      </div>

      <main className="flex-1">
        <Container className="py-12 sm:py-16">{children}</Container>
      </main>

      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto">
      <Container>
        <PlusGridRow className="flex flex-col justify-between gap-2 sm:flex-row">
          <PlusGridItem className="py-3">
            <p className="text-sm/6 text-gray-950">
              &copy; {new Date().getFullYear()} Faculty Allocation System &middot; Team 1
            </p>
          </PlusGridItem>
          <PlusGridItem className="py-3">
            <p className="text-sm/6 text-gray-950/60">Texas A&amp;M International University</p>
          </PlusGridItem>
        </PlusGridRow>
        <div className="h-10" />
      </Container>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export function Subheading({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cx(
        className,
        "font-mono text-xs/5 font-semibold tracking-widest text-maroon uppercase"
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-medium tracking-tight text-gray-950 sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm/6 text-gray-600">{description}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

const buttonVariants = {
  primary: cx(
    "inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]",
    "rounded-full border border-transparent bg-maroon shadow-md",
    "text-base font-medium whitespace-nowrap text-white",
    "hover:bg-maroon-800 disabled:opacity-40"
  ),
  secondary: cx(
    "relative inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]",
    "rounded-full border border-transparent bg-gold shadow-md ring-1 ring-gold-600/30",
    "after:absolute after:inset-0 after:rounded-full after:shadow-[inset_0_0_2px_1px_#ffffff4d]",
    "text-base font-medium whitespace-nowrap text-gray-950",
    "hover:bg-gold-600 hover:text-white disabled:opacity-40"
  ),
  outline: cx(
    "inline-flex items-center justify-center px-3 py-[calc(--spacing(1.5)-1px)]",
    "rounded-lg border border-transparent bg-white shadow-sm ring-1 ring-black/10",
    "text-sm font-medium whitespace-nowrap text-gray-950",
    "hover:bg-gray-50 disabled:opacity-40"
  ),
  danger: cx(
    "inline-flex items-center justify-center px-3 py-[calc(--spacing(1.5)-1px)]",
    "rounded-lg border border-transparent bg-white shadow-sm ring-1 ring-maroon/25",
    "text-sm font-medium whitespace-nowrap text-maroon",
    "hover:bg-maroon-50 disabled:opacity-40"
  ),
};

type ButtonVariant = keyof typeof buttonVariants;

/** For plain <a> elements (e.g. file downloads) that should look like buttons. */
export const outlineButtonClass = buttonVariants.outline;

export function Button({
  variant = "primary",
  className,
  ...props
}: { variant?: ButtonVariant } & ComponentPropsWithoutRef<"button">) {
  return <button {...props} className={cx(buttonVariants[variant], className)} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: { variant?: ButtonVariant } & ComponentPropsWithoutRef<typeof Link>) {
  return <Link {...props} className={cx(buttonVariants[variant], className)} />;
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx(className, "rounded-xl bg-white shadow-md ring-1 ring-black/5")}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-gold to-maroon" />
      <p className="font-mono text-xs/5 font-semibold tracking-widest text-gray-500 uppercase">
        {label}
      </p>
      <p className="mt-3 text-4xl font-medium tracking-tight text-gray-950">{value}</p>
      {hint && <p className="mt-1 text-sm/6 text-gray-600">{hint}</p>}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-6 py-12 text-center ring-1 ring-black/5">
      <p className="text-base/6 font-medium text-gray-950">{title}</p>
      {description && <p className="mt-1 text-sm/6 text-gray-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const badgeTones = {
  maroon: "bg-maroon-50 text-maroon ring-maroon/15",
  gold: "bg-gold-100 text-gold-700 ring-gold-600/25",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  gray: "bg-gray-100 text-gray-700 ring-black/10",
};

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: keyof typeof badgeTones;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs/5 font-medium ring-1 ring-inset",
        badgeTones[tone]
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Forms (input styling from Radiant's login page)                     */
/* ------------------------------------------------------------------ */

export const inputClass = cx(
  "block w-full rounded-lg border border-transparent bg-white shadow-sm ring-1 ring-black/10",
  "px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(2)-1px)] text-base/6 sm:text-sm/6",
  "focus:outline-2 focus:-outline-offset-1 focus:outline-maroon"
);

export const selectClass = cx(inputClass, "pr-8");

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm/5 font-medium text-gray-950">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs/5 text-gray-500">{hint}</p>}
    </div>
  );
}

/**
 * Centered form card used by the "add" pages.
 */
export function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <div className="p-7 sm:p-10">
        <h2 className="text-base/6 font-medium text-gray-950">{title}</h2>
        {description && <p className="mt-1 text-sm/5 text-gray-600">{description}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

/** Turns enum values like "TENURE_TRACK" into "Tenure Track". */
export function formatEnum(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
