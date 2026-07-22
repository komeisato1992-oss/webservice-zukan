import {
  extractYenAmounts,
  parseYenAmount,
  splitRegularAndEffective,
} from "./utils/money";
import { parseStorage } from "./utils/storage";
import { collapseWhitespace } from "./utils/text";

export const normalize = {
  yen: parseYenAmount,
  yenList: extractYenAmounts,
  splitPrice: splitRegularAndEffective,
  storage: parseStorage,
  text: collapseWhitespace,
  booleanFromPresence(has: boolean | null): boolean | null {
    if (has == null) return null;
    return has;
  },
  billingPeriod(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const m = collapseWhitespace(raw).match(/(\d+)\s*ヶ?月/);
    if (m) return `${m[1]}ヶ月`;
    const y = collapseWhitespace(raw).match(/(\d+)\s*年/);
    if (y) return `${Number(y[1]) * 12}ヶ月`;
    return collapseWhitespace(raw) || null;
  },
};
