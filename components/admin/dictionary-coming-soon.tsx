export function DictionaryComingSoon({
  dictionaryName,
}: {
  dictionaryName: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">
        {dictionaryName}では準備中です
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        この機能はサーバー図鑑向けに実装されています。ドメイン図鑑向けの対応は今後追加予定です。
      </p>
    </div>
  );
}
