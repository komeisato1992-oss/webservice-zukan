import type { ScraperDefinition } from "@/lib/scraping/engine/types";
import { colorfulBoxDefinition } from "@/lib/scraping/definitions/legacy";
import { conohaWingDefinition } from "@/lib/scraping/definitions/legacy";
import { lolipopDefinition } from "@/lib/scraping/definitions/legacy";
import { mixhostDefinition } from "@/lib/scraping/definitions/legacy";
import { sakuraDefinition } from "@/lib/scraping/definitions/legacy";
import { shinServerDefinition } from "@/lib/scraping/definitions/legacy";
import { xserverDefinition } from "@/lib/scraping/definitions/legacy";
import { ablenetDefinition } from "@/lib/scraping/definitions/ablenet";
import { coreserverDefinition } from "@/lib/scraping/definitions/coreserver";
import { cpiDefinition } from "@/lib/scraping/definitions/cpi";
import { futokaDefinition } from "@/lib/scraping/definitions/futoka";
import { hetemlDefinition } from "@/lib/scraping/definitions/heteml";
import { iclustaDefinition } from "@/lib/scraping/definitions/iclusta";
import { kagoyaDefinition } from "@/lib/scraping/definitions/kagoya";
import { onamaeDefinition } from "@/lib/scraping/definitions/onamae";
import { rakkoServerDefinition } from "@/lib/scraping/definitions/rakko-server";
import { starServerDefinition } from "@/lib/scraping/definitions/star-server";
import { webarenaIndigoDefinition } from "@/lib/scraping/definitions/webarena-indigo";
import { xreaDefinition } from "@/lib/scraping/definitions/xrea";
import { zenlogicDefinition } from "@/lib/scraping/definitions/zenlogic";

/**
 * 全 Provider 定義。
 * 新規追加時: definitions/ に定義を追加し、ここへ1行足す。
 * catalog.ts の id / slugs と一致させること。
 */
export const SCRAPER_DEFINITIONS: readonly ScraperDefinition[] = [
  xserverDefinition,
  conohaWingDefinition,
  shinServerDefinition,
  lolipopDefinition,
  mixhostDefinition,
  sakuraDefinition,
  colorfulBoxDefinition,
  onamaeDefinition,
  coreserverDefinition,
  kagoyaDefinition,
  rakkoServerDefinition,
  hetemlDefinition,
  cpiDefinition,
  webarenaIndigoDefinition,
  xreaDefinition,
  starServerDefinition,
  ablenetDefinition,
  iclustaDefinition,
  zenlogicDefinition,
  futokaDefinition,
];
