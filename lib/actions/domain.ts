"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isReservedPathSegment } from "@/lib/links";
import type { ActionResult } from "@/lib/actions/admin";
import type {
  DomainFaqItem,
  DomainFeatureStatus,
} from "@/lib/types/database";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

/** 空文字 → null（未確認）、数値はそのまま（0円可） */
function formPrice(formData: FormData, key: string): number | null {
  const raw = formString(formData, key);
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function formStatus(formData: FormData, key: string): DomainFeatureStatus | null {
  const raw = formString(formData, key);
  if (raw === "supported" || raw === "unsupported") return raw;
  return null;
}

function parseFaq(formData: FormData): DomainFaqItem[] {
  const questions = formData.getAll("faq_question");
  const answers = formData.getAll("faq_answer");
  const items: DomainFaqItem[] = [];
  for (let i = 0; i < questions.length; i += 1) {
    const question =
      typeof questions[i] === "string" ? String(questions[i]).trim() : "";
    const answer =
      typeof answers[i] === "string" ? String(answers[i]).trim() : "";
    if (!question && !answer) continue;
    items.push({ question, answer });
  }
  return items;
}

async function resolveDomainContext(supabase: Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>): Promise<
  | { error: string }
  | { dictionary: { id: string; slug: string }; category: { id: string } }
> {
  const [{ data: dictionary }, { data: category }] = await Promise.all([
    supabase
      .from("dictionaries")
      .select("id, slug")
      .eq("slug", "domain")
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id")
      .eq("slug", "domain")
      .maybeSingle(),
  ]);

  if (!dictionary) {
    return { error: "図鑑「domain」が見つかりません。マイグレーションを適用してください。" };
  }
  if (!category) {
    return { error: "カテゴリ「domain」が見つかりません。マイグレーションを適用してください。" };
  }
  return { dictionary, category };
}

/** ドメイン図鑑: 最低限の項目で新規登録 */
export async function createDomainServiceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const name = formString(formData, "name");
  const slug = formString(formData, "slug");
  const companyName = formString(formData, "company_name");
  const officialUrl = formString(formData, "official_url");

  if (!name || !slug) {
    return { ok: false, message: "サービス名と slug は必須です。" };
  }
  if (isReservedPathSegment(slug)) {
    return { ok: false, message: `スラッグ「${slug}」は予約語のため使用できません。` };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, message: "slug は英小文字・数字・ハイフンのみです。" };
  }

  const ctx = await resolveDomainContext(supabase);
  if ("error" in ctx) {
    return { ok: false, message: ctx.error };
  }

  const { data: created, error } = await supabase
    .from("services")
    .insert({
      dictionary_id: ctx.dictionary.id,
      category_id: ctx.category.id,
      name,
      slug,
      company_name: companyName || null,
      official_url: officialUrl || null,
      primary_link_url: null,
      affiliate_url: null,
      affiliate_network: null,
      status: "draft",
      is_published: false,
      is_site_visible: true,
      display_order: 0,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      ok: false,
      message: error?.message ?? "サービスの作成に失敗しました。",
    };
  }

  const { error: detailsError } = await supabase
    .from("domain_service_details")
    .insert({ service_id: created.id });

  if (
    detailsError &&
    !/domain_service_details|schema cache|Could not find the table/i.test(
      detailsError.message,
    )
  ) {
    return {
      ok: false,
      message: `サービスは作成されましたが詳細行の作成に失敗しました: ${detailsError.message}`,
    };
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/domain/services/${created.id}`);
}

/** ドメイン図鑑: 5タブ一括保存（下書きなし・即時反映） */
export async function saveDomainServiceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const serviceId = formString(formData, "service_id");
  if (!serviceId) {
    return { ok: false, message: "サービスIDが不正です。" };
  }

  const ctx = await resolveDomainContext(supabase);
  if ("error" in ctx) {
    return { ok: false, message: ctx.error };
  }

  const { data: existing } = await supabase
    .from("services")
    .select("id, dictionary_id, slug")
    .eq("id", serviceId)
    .maybeSingle();

  if (!existing || existing.dictionary_id !== ctx.dictionary.id) {
    return { ok: false, message: "ドメイン図鑑のサービスではありません。" };
  }

  const name = formString(formData, "name");
  const slug = formString(formData, "slug") || existing.slug;
  if (!name) {
    return { ok: false, message: "サービス名は必須です。" };
  }
  if (isReservedPathSegment(slug)) {
    return { ok: false, message: `スラッグ「${slug}」は予約語のため使用できません。` };
  }

  const statusRaw = formString(formData, "status") || "draft";
  const status =
    statusRaw === "published" ||
    statusRaw === "unpublished" ||
    statusRaw === "draft" ||
    statusRaw === "pending_review" ||
    statusRaw === "expired"
      ? statusRaw
      : "draft";

  const displayOrderRaw = formString(formData, "display_order");
  const displayOrder = Number(displayOrderRaw);
  const affiliateUrl = formString(formData, "affiliate_url") || null;
  const officialUrl = formString(formData, "official_url") || null;

  const { error: serviceError } = await supabase
    .from("services")
    .update({
      name,
      slug,
      company_name: formString(formData, "company_name") || null,
      official_url: officialUrl,
      primary_link_url: affiliateUrl,
      affiliate_url: affiliateUrl,
      affiliate_network: formString(formData, "affiliate_network") || null,
      logo_url: formString(formData, "logo_url") || null,
      catchphrase: formString(formData, "catchphrase") || null,
      about_text: formString(formData, "about_text") || null,
      recommended_uses: formString(formData, "recommended_uses") || null,
      status,
      is_site_visible: formBoolean(formData, "is_site_visible"),
      display_order: Number.isFinite(displayOrder) ? displayOrder : 0,
      seo_title: formString(formData, "seo_title") || null,
      seo_description: formString(formData, "seo_description") || null,
      canonical_url: formString(formData, "canonical_url") || null,
      og_image_url: formString(formData, "og_image_url") || null,
    })
    .eq("id", serviceId);

  if (serviceError) {
    return { ok: false, message: serviceError.message };
  }

  const detailsPayload = {
    com_registration_price: formPrice(formData, "com_registration_price"),
    com_renewal_price: formPrice(formData, "com_renewal_price"),
    com_transfer_price: formPrice(formData, "com_transfer_price"),
    jp_registration_price: formPrice(formData, "jp_registration_price"),
    jp_renewal_price: formPrice(formData, "jp_renewal_price"),
    jp_transfer_price: formPrice(formData, "jp_transfer_price"),
    co_jp_registration_price: formPrice(formData, "co_jp_registration_price"),
    co_jp_renewal_price: formPrice(formData, "co_jp_renewal_price"),
    co_jp_transfer_price: formPrice(formData, "co_jp_transfer_price"),
    net_registration_price: formPrice(formData, "net_registration_price"),
    net_renewal_price: formPrice(formData, "net_renewal_price"),
    net_transfer_price: formPrice(formData, "net_transfer_price"),
    initial_fee: formPrice(formData, "initial_fee"),
    campaign_price_note: formString(formData, "campaign_price_note") || null,
    price_note: formString(formData, "price_note") || null,
    whois_privacy_status: formStatus(formData, "whois_privacy_status"),
    whois_privacy_price: formPrice(formData, "whois_privacy_price"),
    dns_status: formStatus(formData, "dns_status"),
    dnssec_status: formStatus(formData, "dnssec_status"),
    auto_renewal_status: formStatus(formData, "auto_renewal_status"),
    transfer_status: formStatus(formData, "transfer_status"),
    japanese_domain_status: formStatus(formData, "japanese_domain_status"),
    phone_support_status: formStatus(formData, "phone_support_status"),
    email_support_status: formStatus(formData, "email_support_status"),
    chat_support_status: formStatus(formData, "chat_support_status"),
    server_bundle_benefit: formStatus(formData, "server_bundle_benefit"),
    free_domain_benefit: formStatus(formData, "free_domain_benefit"),
    feature_note: formString(formData, "feature_note") || null,
    merits: formString(formData, "merits") || null,
    demerits: formString(formData, "demerits") || null,
    campaign_name: formString(formData, "campaign_name") || null,
    campaign_description: formString(formData, "campaign_description") || null,
    campaign_end_date: formString(formData, "campaign_end_date") || null,
    campaign_url: formString(formData, "campaign_url") || null,
    campaign_is_active: formBoolean(formData, "campaign_is_active"),
    intro_text: formString(formData, "intro_text") || null,
    outro_text: formString(formData, "outro_text") || null,
    faq: parseFaq(formData),
  };

  const { data: detailsRow, error: detailsLookupError } = await supabase
    .from("domain_service_details")
    .select("id")
    .eq("service_id", serviceId)
    .maybeSingle();

  if (
    detailsLookupError &&
    /domain_service_details|schema cache|Could not find the table/i.test(
      detailsLookupError.message,
    )
  ) {
    revalidatePath("/admin", "layout");
    revalidatePath(`/admin/domain/services/${serviceId}`);
    return {
      ok: true,
      message:
        "基本情報を保存しました（domain_service_details 未作成のため詳細タブは未保存。migration 202607230004 を適用してください）。",
    };
  }

  if (detailsLookupError) {
    return { ok: false, message: detailsLookupError.message };
  }

  if (detailsRow) {
    const { error } = await supabase
      .from("domain_service_details")
      .update(detailsPayload)
      .eq("service_id", serviceId);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase
      .from("domain_service_details")
      .insert({ service_id: serviceId, ...detailsPayload });
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/domain/services/${serviceId}`);
  return { ok: true, message: "保存しました。" };
}
