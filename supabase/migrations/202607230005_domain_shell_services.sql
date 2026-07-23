-- ドメイン図鑑: 初期サービス8件を冪等登録
-- 同じ dictionary_id + slug が既にある場合は重複挿入しない
-- 既存行は name / official_url / display_order の不足分のみ補完

do $$
declare
  v_dictionary_id uuid;
  v_category_id uuid;
begin
  select id into v_dictionary_id
  from public.dictionaries
  where slug = 'domain';

  if v_dictionary_id is null then
    raise exception 'dictionary slug=domain が見つかりません。先に 202607230003 を適用してください。';
  end if;

  select id into v_category_id
  from public.categories
  where slug = 'domain';

  if v_category_id is null then
    raise exception 'category slug=domain が見つかりません。先に 202607230004 を適用してください。';
  end if;

  -- 不足補完（既存）
  update public.services s
  set
    name = case
      when s.name is null or btrim(s.name) = '' then v.name
      else s.name
    end,
    official_url = case
      when s.official_url is null or btrim(s.official_url) = '' then v.official_url
      else s.official_url
    end,
    display_order = case
      when s.display_order is null or s.display_order = 0 then v.display_order
      else s.display_order
    end,
    updated_at = now()
  from (
    values
      ('お名前.com', 'onamae', 'https://www.onamae.com/', 1),
      ('ムームードメイン', 'muumuu-domain', 'https://muumuu-domain.com/', 2),
      ('XServerドメイン', 'xserver-domain', 'https://www.xdomain.ne.jp/', 3),
      ('シン・ドメイン', 'shin-domain', 'https://www.shin-domain.jp/', 4),
      ('さくらのドメイン', 'sakura-domain', 'https://domain.sakura.ad.jp/', 5),
      ('スタードメイン', 'star-domain', 'https://www.star-domain.jp/', 6),
      ('バリュードメイン', 'value-domain', 'https://www.value-domain.com/', 7),
      ('Cloudflare Registrar', 'cloudflare-registrar', 'https://www.cloudflare.com/ja-jp/products/registrar/', 8)
  ) as v(name, slug, official_url, display_order)
  where s.dictionary_id = v_dictionary_id
    and s.slug = v.slug;

  -- 未登録のみ挿入
  insert into public.services (
    dictionary_id,
    category_id,
    name,
    slug,
    official_url,
    affiliate_url,
    affiliate_network,
    primary_link_url,
    status,
    is_published,
    is_site_visible,
    display_order,
    created_at,
    updated_at
  )
  select
    v_dictionary_id,
    v_category_id,
    v.name,
    v.slug,
    v.official_url,
    null,
    null,
    null,
    'draft',
    false,
    false,
    v.display_order,
    now(),
    now()
  from (
    values
      ('お名前.com', 'onamae', 'https://www.onamae.com/', 1),
      ('ムームードメイン', 'muumuu-domain', 'https://muumuu-domain.com/', 2),
      ('XServerドメイン', 'xserver-domain', 'https://www.xdomain.ne.jp/', 3),
      ('シン・ドメイン', 'shin-domain', 'https://www.shin-domain.jp/', 4),
      ('さくらのドメイン', 'sakura-domain', 'https://domain.sakura.ad.jp/', 5),
      ('スタードメイン', 'star-domain', 'https://www.star-domain.jp/', 6),
      ('バリュードメイン', 'value-domain', 'https://www.value-domain.com/', 7),
      ('Cloudflare Registrar', 'cloudflare-registrar', 'https://www.cloudflare.com/ja-jp/products/registrar/', 8)
  ) as v(name, slug, official_url, display_order)
  where not exists (
    select 1
    from public.services s
    where s.dictionary_id = v_dictionary_id
      and s.slug = v.slug
  );

  -- domain_service_details を欠落分だけ作成
  insert into public.domain_service_details (service_id)
  select s.id
  from public.services s
  where s.dictionary_id = v_dictionary_id
    and s.slug in (
      'onamae',
      'muumuu-domain',
      'xserver-domain',
      'shin-domain',
      'sakura-domain',
      'star-domain',
      'value-domain',
      'cloudflare-registrar'
    )
    and not exists (
      select 1
      from public.domain_service_details d
      where d.service_id = s.id
    );
end $$;
