import { LoginForm } from "@/components/admin/login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">管理者ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">
          Supabase Auth の管理者アカウントでログインしてください。
        </p>
        <div className="mt-6">
          <LoginForm
            next={
              params.next && params.next.startsWith("/admin")
                ? params.next
                : "/admin"
            }
            initialError={params.error}
          />
        </div>
      </div>
    </div>
  );
}
