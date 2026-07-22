/**
 * ヒーロー背景：添付画像をシャープに表示。
 * 全体オーバーレイは使わず、解像感を優先する。
 */
export function HeroBackground() {
  return (
    <div
      className="hero-navy-bg pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="hero-navy-photo absolute inset-0" />
    </div>
  );
}
