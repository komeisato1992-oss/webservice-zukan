-- iCLUSTA+ 公式URL修正
-- shared-server.net は DNS 解決不能。現行ドメインは shared.gmocloud.com。

update public.services
set
  official_url = 'https://shared.gmocloud.com/',
  updated_at = now()
where slug = 'iclusta'
  and (
    official_url is null
    or official_url ilike '%shared-server.net%'
  );
