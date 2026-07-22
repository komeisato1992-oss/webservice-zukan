# Spreadsheet sync — missing columns (proposal only, not applied)

Spec requested many flat columns that are **not** in the current schema.
Phase 1–3 export/import only maps existing tables. Add these via a future migration if product needs them as first-class columns.

## Already mapped (existing)

| Spec / sheet column | DB |
|---------------------|-----|
| service_id | services.id |
| slug | services.slug |
| service_name | services.name |
| published | services.is_published |
| updated_at | services.updated_at |
| data_version | services.data_version (added 202607190002) |
| official_url | services.official_url |
| affiliate_url | affiliate_links.affiliate_url |
| short_description | services.catchphrase |
| summary / description | services.summary / description |
| best_for | services.recommended_uses |
| editor_score | services.editor_score (0–10) |
| meta_title / meta_description | services.seo_title / seo_description |
| featured | services.is_featured |
| display_order | services.display_order |
| representative_plan + prices/storage | service_plans (default comparison plan) |
| cmp_* | comparison_values pivoted by comparison_fields.slug |

## Not in schema (do not invent)

- provider_name, last_checked_at
- overall_rating, price_score, performance_score, feature_score, support_score, beginner_score, business_score
- recommendation_label, not_recommended_for, attention_point, strengths, weaknesses
- renewal_price, minimum_contract_months, free_trial_days, campaign_note
- storage_type, nvme, transfer_limit, cpu, memory, server_location, uptime, speed_note
- wordpress_*, free_ssl, automatic_backup, backup_retention_days, restore_free, multi_domain, email_accounts, staging, waf, cdn, http3
- support_email/chat/phone/hours, business_support, support_note
- og_description, comparison_enabled

### Recommended approach

1. Prefer defining them as **comparison_fields** (EAV) so they export as `cmp_<slug>` without schema churn.
2. Or add a `service_attributes` jsonb / dedicated columns in a later migration after product prioritization.
