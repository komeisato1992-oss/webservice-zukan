import { notFound } from "next/navigation";
import {
  getDictionaryBySlug,
  isKnownDictionarySlug,
} from "@/lib/admin/dictionaries";

type Props = {
  children: React.ReactNode;
  params: Promise<{ dictionarySlug: string }>;
};

export default async function DictionaryAdminLayout({
  children,
  params,
}: Props) {
  const { dictionarySlug } = await params;

  // 未知のslugのみ404。既知図鑑はDB一時障害でも管理画面レイアウトを維持する
  if (!isKnownDictionarySlug(dictionarySlug)) {
    const dictionary = await getDictionaryBySlug(dictionarySlug);
    if (!dictionary) notFound();
  } else {
    // 存在確認（フォールバック込み）。失敗してもここまでは到達しない想定
    await getDictionaryBySlug(dictionarySlug);
  }

  return children;
}
