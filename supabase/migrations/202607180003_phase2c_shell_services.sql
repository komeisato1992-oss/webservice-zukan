-- Phase 2c: 残り18社のサービス器を一括登録
-- 比較項目・プラン・料金・比較値は登録しない
-- 既存のエックスサーバー / ConoHa WING は表示順のみ更新
--
-- 適用方法: Supabase Dashboard → SQL Editor でこのファイルを実行

-- 既存2社の表示順を整える
update public.services
set display_order = 1
where slug = 'xserver';

update public.services
set display_order = 2
where slug = 'conoha-wing';

-- 残り18社を公開状態で登録（既存 slug はスキップ）
insert into public.services (
  category_id,
  name,
  slug,
  summary,
  description,
  official_url,
  status,
  display_order,
  seo_title,
  seo_description
)
select
  c.id,
  v.name,
  v.slug,
  v.summary,
  v.summary,
  v.official_url,
  'published',
  v.display_order,
  v.name || '｜Webサービス図鑑',
  v.summary
from public.categories c
cross join (
  values
    (
      'シンレンタルサーバー',
      'shin-server',
      'エックスサーバー系列の比較的新しいレンタルサーバーブランド。高速性とコストのバランスを重視した構成で、ブログや個人サイト、これから本格運用を始める方向けの選択肢として位置づけられています。',
      'https://www.shin-server.jp/',
      3
    ),
    (
      'ロリポップ！',
      'lolipop',
      '初心者にも使いやすいことで知られる人気レンタルサーバー。直感的な管理画面と豊富なプランが特徴で、ハイスピードプランなど用途に応じた選択が可能。初めてのサーバー契約やブログ開設にも選ばれやすいサービスです。',
      'https://lolipop.jp/',
      4
    ),
    (
      'mixhost',
      'mixhost',
      'LiteSpeedやHTTP/3対応など速度面を前面に出したレンタルサーバー。スタンダード系プランを中心に、ブログやメディアサイトなど表示速度を重視する運用に向いた構成が特徴です。コストと性能のバランスも評価されています。',
      'https://mixhost.jp/',
      5
    ),
    (
      'さくらのレンタルサーバ',
      'sakura',
      'さくらインターネットが提供する国内老舗のレンタルサーバー。ライトからスタンダード、ビジネスまで幅広いプランがあり、コーポレートサイトや長期運用を前提としたサイトに選ばれやすい安定感が特徴です。',
      'https://rs.sakura.ad.jp/',
      6
    ),
    (
      'お名前.com レンタルサーバー',
      'onamae',
      'ドメイン大手のお名前.comが提供するレンタルサーバー。ドメイン取得とセットで検討されやすく、個人からビジネス用途までカバーします。初めてのサイト公開やドメインとまとめて契約したい場合に候補になりやすいサービスです。',
      'https://www.onamae-server.com/',
      7
    ),
    (
      'ColorfulBox',
      'colorfulbox',
      'NVMe SSDやLiteSpeedなど高速構成を打ち出すコスパ重視のレンタルサーバー。BOXシリーズのプラン構成で、ブログやアフィリエイトなどコストを抑えつつ表示速度も意識したい運用に向いています。',
      'https://www.colorfulbox.jp/',
      8
    ),
    (
      'CoreServer',
      'coreserver',
      'バリュードメイン系列の高機能レンタルサーバー。V1／V2など世代やスペックに応じたプランがあり、開発者向け用途や複数サイト運用にも使われやすい構成です。ドメインサービスとの連携も特徴のひとつです。',
      'https://www.coreserver.jp/',
      9
    ),
    (
      'KAGOYA',
      'kagoya',
      'カゴヤ・ジャパンが提供する国内データセンター運用のホスティング。レンタルサーバーからクラウドまで幅広いラインがあり、法人サイトや安定運用を重視するケースで検討されやすい選択肢です。',
      'https://www.kagoya.jp/',
      10
    ),
    (
      'ラッコサーバー',
      'rakko-server',
      'ラッコM&Aなどで知られるラッコシリーズのレンタルサーバー。サイト売買やアフィリエイト用途との親和性を意識したサービスで、個人・事業者のWeb運用基盤としてシンプルに使える構成が特徴です。',
      'https://rakkoserver.com/',
      11
    ),
    (
      'heteml',
      'heteml',
      'GMOペパボ系列のレンタルサーバー。デザイナーや制作者にも支持され、制作会社やポートフォリオ、複数サイト運用にも使われやすい構成です。クリエイティブ用途との相性を意識したサービスとして知られています。',
      'https://heteml.jp/',
      12
    ),
    (
      'CPI',
      'cpi',
      'ビジネス向けの安定運用を訴求するレンタルサーバー。シェアードプランなどのラインナップがあり、コーポレートサイトや業務用途のWebサイトなど、法人・ビジネスシーンで検討されやすいサービスです。',
      'https://www.cpi.ad.jp/',
      13
    ),
    (
      'WebARENA Indigo',
      'webarena-indigo',
      'NTTPCコミュニケーションズのWebARENAシリーズに属するホスティング。Indigoはクラウド寄りの柔軟な構成が特徴で、開発・検証から本番運用まで幅広く使える選択肢として位置づけられています。',
      'https://web.arena.ne.jp/indigo/',
      14
    ),
    (
      'XREA',
      'xrea',
      '長年の実績があるレンタルサーバー・ホスティングブランド。コストを抑えた運用や複数サイトのホスティングに使われやすく、個人から小規模ビジネスまで幅広い層に選ばれてきたサービスです。',
      'https://www.xrea.com/',
      15
    ),
    (
      'スターサーバー',
      'star-server',
      'ネットオウル系列のレンタルサーバー。ドメインサービスとの連携も特徴で、個人サイトや小規模ビジネスサイトの公開基盤として利用されています。初めてのサーバー契約候補としても挙がりやすいサービスです。',
      'https://www.star.ne.jp/',
      16
    ),
    (
      'ABLENET',
      'ablenet',
      '国内レンタルサーバー・ホスティングを提供するサービス。用途に応じたプラン選択ができ、個人サイトからビジネス用途まで幅広くカバーします。安定運用とコストのバランスを見ながら検討しやすい選択肢です。',
      'https://www.ablenet.jp/',
      17
    ),
    (
      'iCLUSTA+',
      'iclusta',
      '共有サーバーブランドとして知られるiCLUSTA+。ビジネス用途や複数サイト運用にも対応しやすい構成が特徴で、安定性や運用面を重視するケースで候補になりやすいレンタルサーバーです。',
      'https://shared-server.net/',
      18
    ),
    (
      'Zenlogic',
      'zenlogic',
      'IDCフロンティアが提供するホスティングサービス。法人・ビジネス用途を意識した構成が特徴で、コーポレートサイトや安定運用が求められるWeb基盤として検討されやすい選択肢です。',
      'https://www.idcf.jp/zenlogic/',
      19
    ),
    (
      'FUTOKA',
      'futoka',
      '国内レンタルサーバーとして個人・事業者向けに提供されるサービス。用途に合わせたプラン選択ができ、サイト公開の基盤としてシンプルに使える点が特徴です。コストを意識した運用にも候補になりやすいサービスです。',
      'https://www.futoka.jp/',
      20
    )
) as v(name, slug, summary, official_url, display_order)
where c.slug = 'server'
on conflict (category_id, slug) do nothing;
