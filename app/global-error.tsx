"use client";

import { useEffect } from "react";
import { DataUnavailable } from "@/components/site/data-unavailable";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // スタックトレースは公開しない（コンソールにも詳細を出さない）
  }, []);

  return (
    <html lang="ja">
      <body className="min-h-full bg-white text-slate-900 antialiased">
        <DataUnavailable
          title="現在データを取得できません"
          description="一時的に情報を表示できません。しばらくしてから再度お試しください。"
        />
        <div className="mx-auto -mt-8 mb-12 flex justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="text-sm text-blue-700 hover:underline"
          >
            再読み込み
          </button>
        </div>
      </body>
    </html>
  );
}
