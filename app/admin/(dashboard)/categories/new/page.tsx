import { CategoryForm } from "@/components/admin/category-form";

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">カテゴリ追加</h1>
        <p className="mt-1 text-sm text-slate-600">
          追加後、`/[slug]/services` で一覧・詳細が利用できます
        </p>
      </div>
      <CategoryForm />
    </div>
  );
}
