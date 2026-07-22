-- データベース数 / 無料ドメイン数 / マルチドメイン数を文字列化
-- 「無制限」「10個まで」など数値以外の表記を保存できるようにする。
-- 既存の整数値は text へキャストして保持する。

alter table public.service_plans
  alter column free_domain_count type text
  using (
    case
      when free_domain_count is null then null
      else free_domain_count::text
    end
  );

alter table public.service_plans
  alter column multi_domain_count type text
  using (
    case
      when multi_domain_count is null then null
      else multi_domain_count::text
    end
  );

alter table public.service_plans
  alter column database_count type text
  using (
    case
      when database_count is null then null
      else database_count::text
    end
  );

comment on column public.service_plans.free_domain_count is
  '無料ドメイン数（文字列。例: 1 / 無制限 / 初回無料）';
comment on column public.service_plans.multi_domain_count is
  'マルチドメイン数（文字列。例: 20個 / 無制限 / 100個以上）';
comment on column public.service_plans.database_count is
  'データベース数（文字列。例: 50 / 無制限 / 3個まで）';
