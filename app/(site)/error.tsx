"use client";

import { DataUnavailable } from "@/components/site/data-unavailable";

export default function SiteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <DataUnavailable
        title="現在データを取得できません"
        description="一時的に情報を表示できません。しばらくしてから再度お試しいただくか、TOPから目的のページへお進みください。"
      />
      <div className="mx-auto -mt-8 mb-12 flex justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
