import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContentForm } from "@/components/admin/content-form";
import type { ManagedContent } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditContentPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: content }, { data: services }] = await Promise.all([
    supabase
      .from("managed_contents")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id, name")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (!content) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/admin/contents"
          className="text-sm text-blue-700 hover:underline"
        >
          ← コンテンツ管理
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          コンテンツ編集
        </h1>
      </div>
      <ContentForm
        content={content as ManagedContent}
        services={services ?? []}
      />
    </div>
  );
}
