import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/auth";
import { hasSupabasePublicEnv } from "@/lib/env";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email: string | null = null;

  if (hasSupabasePublicEnv()) {
    try {
      const { user, admin } = await requireAdmin();
      if (admin) {
        email = admin.email ?? user?.email ?? null;
      }
    } catch {
      email = null;
    }
  }

  return (
    <div className="min-h-full bg-slate-50 lg:flex">
      <AdminSidebar email={email} />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:py-8 lg:pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
