/**
 * Admin section guard.
 *
 * Every page under /admin renders inside this layout, so checking the
 * signed-in user here protects all of them at once. Server Actions still
 * call requireAdmin() themselves, because an action can be invoked
 * without rendering the page.
 */

import { requireAdmin } from "@/lib/auth/dal";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return children;
}
