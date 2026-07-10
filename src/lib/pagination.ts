// Safe pagination parsing for list endpoints. A non-numeric ?page/?limit must
// not reach Prisma as NaN (skip/take: NaN throws → HTTP 500); clamp to a range
// and fall back to a default instead.
export function parsePageParam(
  raw: string | null,
  def: number,
  min: number,
  max: number,
): number {
  const n = parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
