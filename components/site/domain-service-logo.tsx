"use client";

import { useState } from "react";
import {
  domainLogoNeedsSoftBackground,
  resolveDomainLogoUrl,
} from "@/lib/site/domain-logos";
import { cn } from "@/components/site/ui";

export type DomainLogoVariant = "default" | "compare" | "ranking";

type Props = {
  name: string;
  slug: string;
  /** DB の logo_url。あれば静的マップより優先 */
  logoUrl?: string | null;
  variant?: DomainLogoVariant;
  className?: string;
};

/**
 * ドメイン図鑑の公式ロゴ枠。
 * 固定枠 + object-fit:contain。失敗時は枠内にサービス名を表示。
 */
export function DomainServiceLogo({
  name,
  slug,
  logoUrl = null,
  variant = "default",
  className,
}: Props) {
  const trimmedLogoUrl = logoUrl?.trim() || null;
  const src = trimmedLogoUrl || resolveDomainLogoUrl(slug);
  const [failed, setFailed] = useState(!src);
  const softBg = domainLogoNeedsSoftBackground(slug);
  const showFallback = failed || !src;

  return (
    <div
      className={cn(
        "domain-logo-frame flex items-center justify-center overflow-hidden rounded-[6px]",
        "w-full border",
        softBg
          ? "border-[rgba(8,127,120,0.32)] bg-[#f1f5f4]"
          : "border-[rgba(8,127,120,0.18)] bg-white",
        variant === "default" && "h-12 max-w-[190px] px-2.5 py-1.5",
        variant === "compare" &&
          "mx-auto h-9 max-w-[190px] min-w-[130px] px-2 py-[5px] sm:h-[42px] sm:min-w-0 sm:px-2.5 sm:py-1.5",
        variant === "ranking" && "h-12 max-w-[210px] px-2.5 py-1.5",
        className,
      )}
      role="img"
      aria-label={`${name}のロゴ`}
    >
      {showFallback ? (
        <span className="line-clamp-2 px-0.5 text-center text-[11px] font-bold leading-tight text-[#123f3d] sm:text-[12px]">
          {name}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- 枠内 contain と onError / naturalSize 判定のため
        <img
          src={src}
          alt=""
          className="h-full max-h-full w-full max-w-full object-contain object-center"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth === 0 || img.naturalHeight === 0) {
              setFailed(true);
            }
          }}
        />
      )}
    </div>
  );
}
