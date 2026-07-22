import Link from "next/link";
import { SITE_BRAND } from "@/lib/site/brand";
import { buildPageMetadata } from "@/lib/site/seo";
import {
  StaticPageShell,
  StaticSection,
} from "@/components/site/static-page-shell";

export const metadata = buildPageMetadata("privacy");

export default function PrivacyPage() {
  return (
    <StaticPageShell title="プライバシーポリシー" path="/privacy">
      <p>
        {SITE_BRAND}
        （以下「当サイト」）は、利用者のプライバシーを尊重し、取得する情報の取り扱いについて以下のとおり定めます。
      </p>

      <StaticSection title="取得する情報">
        <p>当サイトでは、以下の情報を取得する場合があります。</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>お問い合わせ時に入力いただいた氏名、メールアドレス、お問い合わせ内容</li>
          <li>Cookie や類似技術により取得する閲覧情報（アクセス日時、閲覧ページ、端末・ブラウザ情報など）</li>
          <li>アクセス解析ツールを通じて取得する利用状況に関する情報</li>
        </ul>
      </StaticSection>

      <StaticSection title="Cookie">
        <p>
          当サイトでは、利便性向上やアクセス解析、広告配信のために Cookie
          を使用する場合があります。ブラウザの設定により Cookie
          を無効化できますが、一部機能が利用できなくなることがあります。
        </p>
      </StaticSection>

      <StaticSection title="Google Analytics">
        <p>
          当サイトでは、サイト利用状況の把握のため Google Analytics
          を利用する場合があります。Google Analytics
          は Cookie 等を用いてデータを収集します。収集されるデータは Google
          のプライバシーポリシーに基づき管理されます。詳細は Google
          の公式サイトをご確認ください。
        </p>
      </StaticSection>

      <StaticSection title="Google Search Console">
        <p>
          当サイトでは、検索結果での表示状況の確認や改善のため Google Search
          Console を利用する場合があります。これにより検索クエリやインデックス状況などの統計情報を確認することがあります。
        </p>
      </StaticSection>

      <StaticSection title="広告配信">
        <p>
          当サイトでは、第三者の広告配信サービスを利用する場合があります。広告配信事業者は Cookie
          等を使用し、ユーザーの興味関心に応じた広告を表示することがあります。
        </p>
      </StaticSection>

      <StaticSection title="アフィリエイト">
        <p>
          当サイトは A8.net
          をはじめとするアフィリエイトプログラムに参加しています。アフィリエイトリンク経由でサービスが紹介・成約された場合、当サイト運営者が紹介報酬を受け取ることがあります。アフィリエイト事業者は Cookie
          等を用いて成果計測を行う場合があります。
        </p>
      </StaticSection>

      <StaticSection title="お問い合わせ">
        <p>
          お問い合わせフォーム（またはメール）で送信いただいた氏名、メールアドレス、お問い合わせ内容は、返信および対応のために取得・利用します。
        </p>
      </StaticSection>

      <StaticSection title="個人情報の利用目的">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>お問い合わせへの回答・対応</li>
          <li>サイトの改善、利用状況の分析</li>
          <li>不正利用の防止、セキュリティの確保</li>
          <li>関連する法令に基づく対応</li>
        </ul>
      </StaticSection>

      <StaticSection title="第三者提供">
        <p>
          当サイトは、法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。ただし、アクセス解析・広告・アフィリエイト等のサービス提供に必要な範囲で、各事業者が定める条件に従い情報が取り扱われることがあります。
        </p>
      </StaticSection>

      <StaticSection title="ポリシーの変更">
        <p>
          本ポリシーの内容は、必要に応じて改定することがあります。重要な変更がある場合は、当サイト上でお知らせします。改定後のポリシーは、当ページに掲載した時点から効力を生じるものとします。
        </p>
      </StaticSection>

      <StaticSection title="お問い合わせ窓口">
        <p>
          本ポリシーに関するお問い合わせは、
          <Link
            href="/contact"
            className="mx-1 text-[var(--accent)] hover:underline"
          >
            お問い合わせページ
          </Link>
          よりご連絡ください。
        </p>
      </StaticSection>
    </StaticPageShell>
  );
}
