import Link from "next/link";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

export const dynamic = "force-dynamic";

function settingsLinks(dictionarySlug: string) {
  return [
    {
      href: `/admin/${dictionarySlug}/categories`,
      title: "カテゴリ管理",
      description: "レンタルサーバー以外のカテゴリ追加・公開設定",
    },
    {
      href: `/admin/${dictionarySlug}/contents`,
      title: "コンテンツ管理",
      description: "お知らせ・キャンペーン記事・AI候補の公開管理",
    },
    {
      href: `/admin/${dictionarySlug}/bulk-update`,
      title: "全サービス更新（旧）",
      description: "スクレイピング一括実行の旧画面（新画面はスクレイピングへ）",
    },
    {
      href: `/admin/${dictionarySlug}/services`,
      title: "サービス一覧",
      description: "選択中の図鑑のサービス管理",
    },
  ] as const;
}

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function AdminSettingsPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">設定</h1>
        <p className="mt-1 text-sm text-slate-600">
          運用補助メニューと、CMSの公開フローの説明です。
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">公開フロー</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>スクレイピング → ドラフト（候補）へ保存</li>
          <li>管理画面で確認・手動修正 → 下書き保存</li>
          <li>必要なら Google Sheets エクスポート／編集／インポート</li>
          <li>差分確認 → 公開対象を選択</li>
          <li>「公開へ反映」でのみ本番サイトへ反映</li>
        </ol>
        <p className="mt-3 text-sm text-amber-800">
          下書き保存だけでは本番に出ません。公開サイトは公開済みデータのみ参照します。
        </p>
      </section>

      <ul className="space-y-3">
        {settingsLinks(dictionarySlug).map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50/40"
            >
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
