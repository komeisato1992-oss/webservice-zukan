export function parseStorage(
  raw: string | null | undefined,
): { value: number | null; unit: string | null; mediaHint: string | null } {
  if (!raw) return { value: null, unit: null, mediaHint: null };
  const text = raw.replace(/[\s,]/g, "");
  const match = text.match(/(\d+(?:\.\d+)?)\s*(GB|TB|MB)/i);
  const value = match ? Number(match[1]) : null;
  const unit = match ? match[2].toUpperCase() : null;
  let mediaHint: string | null = null;
  if (/NVMe/i.test(raw)) mediaHint = "NVMe SSD";
  else if (/SSD/i.test(raw)) mediaHint = "SSD";
  else if (/HDD/i.test(raw)) mediaHint = "HDD";
  return {
    value: Number.isFinite(value as number) ? value : null,
    unit,
    mediaHint,
  };
}
