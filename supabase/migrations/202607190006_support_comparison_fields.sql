-- Support comparison fields (phone / email / chat + detail metadata)
-- Values stay in comparison_values; no new columns on services/plans.
-- Existing support values remain null (未確認). Do not seed false.

-- ---------------------------------------------------------------------------
-- Seed support-related comparison_fields per category (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare
  cat record;
begin
  for cat in
    select id from public.categories
  loop
    -- Composite display field (TOP 人気3社). Kept as text; display is assembled in app.
    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, value_source, compare_rule,
      show_in_top_featured, top_featured_display_order,
      show_in_top_table, top_table_display_order,
      show_in_compare_page, compare_page_display_order,
      description
    )
    values (
      cat.id, 'サポート', 'support', 'text', 'サポート', 50,
      true, 'comparison_value', 'score',
      true, 5,
      true, 5,
      false, 50,
      '電話・メール・チャットの複合表示。個別項目を参照して組み立てます。'
    )
    on conflict (category_id, slug) do update set
      name = excluded.name,
      display_group = 'サポート',
      show_in_top_featured = true,
      top_featured_display_order = coalesce(public.comparison_fields.top_featured_display_order, 5),
      show_in_top_table = coalesce(public.comparison_fields.show_in_top_table, true),
      top_table_display_order = coalesce(public.comparison_fields.top_table_display_order, 5),
      show_in_compare_page = false,
      compare_rule = coalesce(public.comparison_fields.compare_rule, 'score'),
      is_published = true,
      description = coalesce(public.comparison_fields.description, excluded.description);

    insert into public.comparison_fields (
      category_id, name, slug, field_type, display_group, display_order,
      is_published, value_source, compare_rule,
      show_in_top_featured, show_in_top_table,
      show_in_compare_page, compare_page_display_order
    ) values
      (cat.id, '電話サポート', 'phone-support', 'boolean', 'サポート', 51,
       true, 'comparison_value', 'true', false, false, true, 51),
      (cat.id, 'メールサポート', 'email-support', 'boolean', 'サポート', 52,
       true, 'comparison_value', 'true', false, false, true, 52),
      (cat.id, 'チャットサポート', 'chat-support', 'boolean', 'サポート', 53,
       true, 'comparison_value', 'true', false, false, true, 53),
      (cat.id, '電話対応時間', 'support-phone-hours', 'text', 'サポート', 54,
       true, 'comparison_value', null, false, false, true, 54),
      (cat.id, 'メール対応時間', 'support-email-hours', 'text', 'サポート', 55,
       true, 'comparison_value', null, false, false, true, 55),
      (cat.id, 'チャット対応時間', 'support-chat-hours', 'text', 'サポート', 56,
       true, 'comparison_value', null, false, false, true, 56),
      (cat.id, '電話利用条件', 'support-phone-conditions', 'text', 'サポート', 57,
       true, 'comparison_value', null, false, false, true, 57),
      (cat.id, 'チャット種別', 'support-chat-type', 'select', 'サポート', 58,
       true, 'comparison_value', null, false, false, true, 58),
      (cat.id, '24時間受付', 'support-24h-reception', 'boolean', 'サポート', 59,
       true, 'comparison_value', 'true', false, false, true, 59),
      (cat.id, '24時間対応', 'support-24h', 'boolean', 'サポート', 60,
       true, 'comparison_value', 'true', false, false, true, 60),
      (cat.id, '土日祝対応', 'support-weekends', 'boolean', 'サポート', 61,
       true, 'comparison_value', 'true', false, false, true, 61),
      (cat.id, 'サポート出典URL', 'support-source-url', 'text', 'サポート', 62,
       true, 'comparison_value', null, false, false, false, 62),
      (cat.id, 'サポート最終確認日', 'support-checked-at', 'text', 'サポート', 63,
       true, 'comparison_value', null, false, false, false, 63),
      (cat.id, 'サポート備考', 'support-notes', 'text', 'サポート', 64,
       true, 'comparison_value', null, false, false, true, 64)
    on conflict (category_id, slug) do update set
      name = excluded.name,
      field_type = excluded.field_type,
      display_group = 'サポート',
      display_order = excluded.display_order,
      is_published = true,
      compare_rule = coalesce(public.comparison_fields.compare_rule, excluded.compare_rule),
      show_in_compare_page = excluded.show_in_compare_page,
      compare_page_display_order = coalesce(
        public.comparison_fields.compare_page_display_order,
        excluded.compare_page_display_order
      );

    update public.comparison_fields
    set select_options = '["human","chatbot","mixed"]'::jsonb
    where category_id = cat.id
      and slug = 'support-chat-type';
  end loop;
end $$;
