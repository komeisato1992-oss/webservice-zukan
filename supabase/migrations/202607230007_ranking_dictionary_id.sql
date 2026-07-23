-- ランキングを図鑑（dictionary）単位で完全分離する
-- - ranking_entries / cms_ranking_drafts / ranking_publish_history に dictionary_id
-- - UNIQUE (purpose_id, rank) → (dictionary_id, purpose_id, rank)
-- - cms_ranking_drafts のシングルトン制約を廃止し dictionary_id 一意に変更
-- - 既存データの振り分け＋サーバー総合おすすめの復旧

-- ---------------------------------------------------------------------------
-- 1. columns
-- ---------------------------------------------------------------------------
alter table public.ranking_entries
  add column if not exists dictionary_id uuid references public.dictionaries (id) on delete cascade;

alter table public.cms_ranking_drafts
  add column if not exists dictionary_id uuid references public.dictionaries (id) on delete cascade;

alter table public.ranking_publish_history
  add column if not exists dictionary_id uuid references public.dictionaries (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. backfill ranking_entries.dictionary_id from services
-- ---------------------------------------------------------------------------
update public.ranking_entries re
set dictionary_id = s.dictionary_id
from public.services s
where re.service_id = s.id
  and re.dictionary_id is null
  and s.dictionary_id is not null;

-- service 未設定行はサーバー図鑑へ（従来データ）
update public.ranking_entries re
set dictionary_id = d.id
from public.dictionaries d
where re.dictionary_id is null
  and d.slug = 'server';

-- ---------------------------------------------------------------------------
-- 3. constraints / indexes
-- ---------------------------------------------------------------------------
alter table public.ranking_entries
  drop constraint if exists ranking_entries_purpose_rank_unique;

alter table public.ranking_entries
  alter column dictionary_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ranking_entries_dictionary_purpose_rank_unique'
  ) then
    alter table public.ranking_entries
      add constraint ranking_entries_dictionary_purpose_rank_unique
      unique (dictionary_id, purpose_id, rank);
  end if;
end $$;

create index if not exists ranking_entries_dictionary_purpose_idx
  on public.ranking_entries (dictionary_id, purpose_id);

-- drafts: drop singleton, require dictionary_id unique
drop index if exists public.cms_ranking_drafts_singleton;

-- 既存 draft を server に紐付け
update public.cms_ranking_drafts cd
set dictionary_id = d.id
from public.dictionaries d
where cd.dictionary_id is null
  and d.slug = 'server';

-- domain 用 draft が無ければ作成（空エントリはアプリ側でも初期化可）
insert into public.cms_ranking_drafts (dictionary_id, payload, published_snapshot, status, change_count)
select
  d.id,
  '{"entries":[]}'::jsonb,
  null,
  'draft',
  0
from public.dictionaries d
where d.slug = 'domain'
  and not exists (
    select 1 from public.cms_ranking_drafts x where x.dictionary_id = d.id
  );

alter table public.cms_ranking_drafts
  alter column dictionary_id set not null;

create unique index if not exists cms_ranking_drafts_dictionary_uidx
  on public.cms_ranking_drafts (dictionary_id);

create index if not exists ranking_publish_history_dictionary_idx
  on public.ranking_publish_history (dictionary_id);

comment on column public.ranking_entries.dictionary_id is
  '所属図鑑。同一 purpose_id でも dictionary_id で完全分離する';
comment on column public.cms_ranking_drafts.dictionary_id is
  '図鑑ごとのランキング下書き（1図鑑1行）';

-- ---------------------------------------------------------------------------
-- 4. restore domain overall (was overwritten into shared overall slots)
--    service ids: onamae / muumuu-domain / xserver-domain
-- ---------------------------------------------------------------------------
insert into public.ranking_entries (
  dictionary_id, purpose_id, rank, service_id, plan_id, rating,
  card_comment, sub_comment, is_visible, display_order
)
select
  d.id,
  v.purpose_id,
  v.rank,
  s.id,
  null,
  v.rating,
  v.card_comment,
  null,
  true,
  v.rank
from public.dictionaries d
cross join (
  values
    (
      'overall'::text,
      1::smallint,
      'onamae'::text,
      5::numeric,
      '高速性・安定性・サポートのすべてが高水準で、初心者から法人まで幅広くおすすめできるレンタルサーバーです。実績も豊富で、WordPressとの相性も良く、長く安心して利用できる総合力の高いサービスです。'::text
    ),
    (
      'overall',
      2,
      'muumuu-domain',
      4.5,
      '高速表示と使いやすい管理画面が魅力で、初心者から中級者まで人気のレンタルサーバーです。料金と性能のバランスが良く、ブログや企業サイトなど幅広い用途に対応できます。'
    ),
    (
      'overall',
      3,
      'xserver-domain',
      4.5,
      '最新技術を積極的に採用し、高速な表示性能と安定した運用環境を提供しています。コストパフォーマンスにも優れ、今後さらに注目が期待されるレンタルサーバーです。'
    )
) as v(purpose_id, rank, service_slug, rating, card_comment)
join public.services s
  on s.slug = v.service_slug
 and s.dictionary_id = d.id
where d.slug = 'domain'
on conflict (dictionary_id, purpose_id, rank) do update
set
  service_id = excluded.service_id,
  rating = excluded.rating,
  card_comment = excluded.card_comment,
  is_visible = true,
  updated_at = now();
