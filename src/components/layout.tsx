/**
 * Page frame: the navbar and the standard page shell.
 *
 * These are server components that know who is signed in, so they live
 * apart from ui.tsx (which client components also import and therefore
 * must not pull in database or cookie code).
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/dal";
import { logout } from "@/lib/auth/actions";
import {
  Badge,
  Container,
  Footer,
  Gradient,
  Logo,
  PlusGridItem,
  PlusGridRow,
  Subheading,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/offices", label: "Offices" },
  { href: "/admin/allocations", label: "Allocations" },
  { href: "/admin/history", label: "History" },
  { href: "/admin/users", label: "Users" },
  { href: "/faculty", label: "Faculty Portal" },
];

const facultyLinks = [{ href: "/faculty", label: "My Office" }];

/** Which links a visitor may see. Anonymous visitors see none. */
export function linksFor(user: CurrentUser | null) {
  if (!user) return [];
  return user.role === "ADMIN" ? adminLinks : facultyLinks;
}

function AccountControls({ user }: { user: CurrentUser | null }) {
  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center px-4 py-3 text-base font-medium text-gray-950 hover:bg-black/2.5"
      >
        Log in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="hidden text-sm/6 font-medium text-gray-950 sm:block">{user.name}</span>
      <Badge tone={user.role === "ADMIN" ? "maroon" : "gold"}>
        {user.role === "ADMIN" ? "Admin" : "Faculty"}
      </Badge>
      <form action={logout}>
        <button
          type="submit"
          className="text-sm/6 font-medium text-gray-950/70 hover:text-maroon"
        >
          Log out
        </button>
      </form>
    </div>
  );
}

export async function Navbar() {
  const user = await getCurrentUser();
  const links = linksFor(user);

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
          {links.map(({ href, label }) => (
            <PlusGridItem key={href} className="relative flex">
              <Link
                href={href}
                className="flex items-center px-4 py-3 text-base font-medium text-gray-950 bg-blend-multiply hover:bg-black/2.5"
              >
                {label}
              </Link>
            </PlusGridItem>
          ))}
          <PlusGridItem className="relative flex">
            <AccountControls user={user} />
          </PlusGridItem>
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
          <div className="absolute right-0 z-20 mt-2 flex w-64 flex-col gap-1 rounded-xl bg-white p-2 shadow-lg ring-1 ring-black/5">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-base font-medium text-gray-950 hover:bg-gray-50"
              >
                {label}
              </Link>
            ))}
            <div className="mt-1 border-t border-black/5 pt-1">
              {user ? (
                <div className="px-3 py-2">
                  <p className="text-sm/5 font-medium text-gray-950">{user.name}</p>
                  <p className="text-xs/5 text-gray-500">
                    {user.role === "ADMIN" ? "Administrator" : "Faculty"}
                  </p>
                  <form action={logout} className="mt-2">
                    <button type="submit" className="text-sm/6 font-medium text-maroon">
                      Log out
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="block rounded-lg px-3 py-2 text-base font-medium text-gray-950 hover:bg-gray-50"
                >
                  Log in
                </Link>
              )}
            </div>
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
