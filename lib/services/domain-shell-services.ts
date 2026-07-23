/**
 * ドメイン図鑑の初期掲載サービス（8件）カタログ。
 * 重複登録しない冪等シードの元データ。
 */

export type DomainShellService = {
  name: string;
  slug: string;
  officialUrl: string;
  displayOrder: number;
};

export const DOMAIN_SHELL_SERVICES: readonly DomainShellService[] = [
  {
    name: "お名前.com",
    slug: "onamae",
    officialUrl: "https://www.onamae.com/",
    displayOrder: 1,
  },
  {
    name: "ムームードメイン",
    slug: "muumuu-domain",
    officialUrl: "https://muumuu-domain.com/",
    displayOrder: 2,
  },
  {
    name: "XServerドメイン",
    slug: "xserver-domain",
    officialUrl: "https://www.xdomain.ne.jp/",
    displayOrder: 3,
  },
  {
    name: "シン・ドメイン",
    slug: "shin-domain",
    officialUrl: "https://www.shin-domain.jp/",
    displayOrder: 4,
  },
  {
    name: "さくらのドメイン",
    slug: "sakura-domain",
    officialUrl: "https://domain.sakura.ad.jp/",
    displayOrder: 5,
  },
  {
    name: "スタードメイン",
    slug: "star-domain",
    officialUrl: "https://www.star-domain.jp/",
    displayOrder: 6,
  },
  {
    name: "バリュードメイン",
    slug: "value-domain",
    officialUrl: "https://www.value-domain.com/",
    displayOrder: 7,
  },
  {
    name: "Cloudflare Registrar",
    slug: "cloudflare-registrar",
    officialUrl: "https://www.cloudflare.com/ja-jp/products/registrar/",
    displayOrder: 8,
  },
];
