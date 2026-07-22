import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { NOINDEX_ROBOTS } from "@/lib/site/seo";

export const metadata: Metadata = {
  title: "パスワード再設定",
  robots: NOINDEX_ROBOTS,
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">パスワード再設定</h1>
        <p className="mt-2 text-sm text-slate-600">
          新しいパスワードを入力して更新してください。
        </p>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
