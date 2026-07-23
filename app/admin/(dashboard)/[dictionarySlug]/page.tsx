import { redirect } from "next/navigation";
import { adminDictionaryPath } from "@/lib/admin/dictionaries";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function DictionaryAdminIndexPage({ params }: Props) {
  const { dictionarySlug } = await params;
  redirect(adminDictionaryPath(dictionarySlug, "/services"));
}
