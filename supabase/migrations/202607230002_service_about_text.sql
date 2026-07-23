-- サービス詳細「〇〇とは」用の長文。概要(summary)・詳細(description)は廃止。

alter table public.services
  add column if not exists about_text text;

comment on column public.services.about_text is
  'サービス詳細ページの「〇〇とは」本文（改行保持）';

alter table public.services
  drop column if exists summary;

alter table public.services
  drop column if exists description;
