import { ContactForm } from "@/components/site/contact-form";
import { StaticSection } from "@/components/site/static-page-shell";

export function ContactPageContent() {
  return (
    <>
      <StaticSection title="ご連絡の前に">
        <p>
          掲載情報の修正依頼やご質問などは、以下のフォームよりお送りください。送信ボタンを押すとメールアプリが起動します。
        </p>
        <p className="text-[13px] text-[var(--text-muted)]">
          料金・キャンペーン・仕様の最新情報は、各サービスの公式サイトをご確認ください。
        </p>
      </StaticSection>
      <ContactForm />
    </>
  );
}
