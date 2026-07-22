-- ランキングカード評価（★0〜5、小数可）

alter table public.ranking_entries
  add column if not exists rating numeric(3, 1);

alter table public.ranking_entries
  drop constraint if exists ranking_entries_rating_check;

alter table public.ranking_entries
  add constraint ranking_entries_rating_check
  check (rating is null or (rating >= 0 and rating <= 5));

comment on column public.ranking_entries.rating is
  'ランキングカードの★評価（0〜5、0.5刻みなど小数可）';
