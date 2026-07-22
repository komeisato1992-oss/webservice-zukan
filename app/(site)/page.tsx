import { redirect } from "next/navigation";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";

/** Webサービス図鑑総合TOPは非公開。実質TOPは /server（next.config でも redirect） */
export default function HomePage() {
  redirect(`/${PRIMARY_CATEGORY_SLUG}`);
}
