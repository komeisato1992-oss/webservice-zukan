import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("正しいURLを入力してください")
  .or(z.literal(""))
  .optional()
  .transform((v) => (v ? v : null));

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));

const optionalMoney = z
  .union([z.literal(""), z.coerce.number()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const categorySchema = z.object({
  name: z.string().trim().min(1, "カテゴリ名は必須です").max(100),
  slug: z
    .string()
    .trim()
    .min(1, "スラッグは必須です")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "スラッグは半角英数字とハイフンのみ"),
  description: optionalText,
  icon: optionalText,
  display_order: z.coerce.number().int().min(0).default(0),
  is_published: z.coerce.boolean().default(false),
  seo_title: optionalText,
  seo_description: optionalText,
});

const optionalHttpsUrl = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^https:\/\//i.test(v),
    "https:// から始まるURLを入力してください",
  )
  .refine((v) => {
    if (!v) return true;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }, "正しいURLを入力してください")
  .optional()
  .transform((v) => (v ? v : null));

export const serviceSchema = z.object({
  category_id: z.string().uuid("カテゴリを選択してください"),
  name: z.string().trim().min(1, "サービス名は必須です").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "スラッグは必須です")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "スラッグは半角英数字とハイフンのみ"),
  short_name: optionalText,
  catchphrase: optionalText,
  summary: optionalText,
  description: optionalText,
  logo_url: optionalUrl,
  thumbnail_url: optionalUrl,
  official_url: optionalUrl,
  affiliate_url: optionalHttpsUrl,
  affiliate_network: z
    .enum(["A8", "もしも", "バリューコマース", "afb", "アクセストレード", "その他"])
    .default("A8"),
  affiliate_status: z.enum(["active", "pending", "inactive"]).default("inactive"),
  recommended_uses: optionalText,
  editor_score: z
    .union([z.literal(""), z.coerce.number().min(0).max(10)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  display_order: z.coerce.number().int().min(0).default(0),
  status: z.enum(["draft", "published", "unpublished"]),
  is_featured: z.coerce.boolean().default(false),
  seo_title: optionalText,
  seo_description: optionalText,
  canonical_url: optionalUrl,
  og_image_url: optionalUrl,
});

export const affiliateLinkSchema = z.object({
  asp_name: optionalText,
  program_name: optionalText,
  official_url: optionalUrl,
  affiliate_url: optionalUrl,
  approval_status: z.enum([
    "not_applied",
    "pending",
    "approved",
    "rejected",
    "closed",
  ]),
  reward_note: optionalText,
  is_primary: z.coerce.boolean().default(true),
  is_active: z.coerce.boolean().default(true),
});

export const servicePlanSchema = z.object({
  name: z.string().trim().min(1, "プラン名は必須です").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "スラッグは必須です")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "スラッグは半角英数字とハイフンのみ"),
  regular_monthly_price: optionalMoney,
  campaign_monthly_price: optionalMoney,
  effective_monthly_price: optionalMoney,
  initial_fee: optionalMoney,
  billing_period: optionalText,
  storage_value: optionalMoney,
  storage_unit: optionalText,
  description: optionalText,
  display_order: z.coerce.number().int().min(0).default(0),
  is_published: z.coerce.boolean().default(false),
  is_default_comparison_plan: z.coerce.boolean().default(false),
  is_recommended: z.coerce.boolean().default(false),
  official_url: optionalUrl,
});

export const comparisonFieldSchema = z
  .object({
    category_id: z.string().uuid("カテゴリを選択してください"),
    name: z.string().trim().min(1, "項目名は必須です").max(120),
    slug: z
      .string()
      .trim()
      .min(1, "スラッグは必須です")
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "スラッグは半角英数字とハイフンのみ"),
    field_type: z.enum(["boolean", "number", "text", "select", "rating"]),
    unit: optionalText,
    description: optionalText,
    display_group: optionalText,
    select_options: z
      .union([z.array(z.string()), z.string()])
      .optional()
      .transform((v) => {
        if (v == null) return [] as string[];
        if (Array.isArray(v)) {
          return v.map((s) => s.trim()).filter(Boolean);
        }
        return v
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }),
    display_order: z.coerce.number().int().min(0).default(0),
    is_filterable: z.coerce.boolean().default(false),
    is_highlighted: z.coerce.boolean().default(false),
    is_published: z.coerce.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.field_type === "select" && data.select_options.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["select_options"],
        message: "選択形式では選択肢を1つ以上入力してください",
      });
    }
  });

/** 比較値1件分（field_type に応じたカラム整合） */
export const comparisonValuePayloadSchema = z
  .object({
    field_type: z.enum(["boolean", "number", "text", "select", "rating"]),
    boolean_value: z.boolean().nullable().optional(),
    number_value: z.number().nullable().optional(),
    text_value: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const { field_type } = data;
    if (field_type === "boolean") {
      if (data.boolean_value == null) return;
      return;
    }
    if (field_type === "number" || field_type === "rating") {
      if (data.number_value == null) return;
      if (field_type === "rating" && (data.number_value < 0 || data.number_value > 10)) {
        ctx.addIssue({
          code: "custom",
          path: ["number_value"],
          message: "評価は0〜10で入力してください",
        });
      }
      return;
    }
    if (data.text_value != null && data.text_value.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["text_value"],
        message: "値を入力してください",
      });
    }
  });

export type CategoryInput = z.infer<typeof categorySchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type AffiliateLinkInput = z.infer<typeof affiliateLinkSchema>;
export type ServicePlanInput = z.infer<typeof servicePlanSchema>;
export type ComparisonFieldInput = z.infer<typeof comparisonFieldSchema>;
