// ─── Banks ────────────────────────────────────────────────────────────────────
export const MOCK_BANKS = [
  { id: 'bank-1', name: 'Canara Bank' },
  { id: 'bank-2', name: 'Bank of Baroda' },
  { id: 'bank-3', name: 'CBoI' },
  { id: 'bank-4', name: 'HDFC Bank' },
  { id: 'bank-5', name: 'ICICI Bank' },
  { id: 'bank-6', name: 'SBI' },
  { id: 'bank-7', name: 'Axis Bank' },
  { id: 'bank-8', name: 'PNB' },
];

export const MOCK_YEARS = [2024, 2025, new Date().getFullYear()];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Seasonal load multipliers per month (Jan–Dec)
const SEASONAL = [0.70, 0.75, 0.90, 1.00, 1.10, 1.20, 1.30, 1.25, 1.05, 0.95, 1.10, 1.40];

// Average monthly indents per bank
const BANK_MONTHLY: Record<string, number> = {
  'Canara Bank':    10,
  'Bank of Baroda': 8,
  'CBoI':           13,
  'HDFC Bank':      18,
  'ICICI Bank':     16,
  'SBI':            22,
  'Axis Bank':      11,
  'PNB':            7,
};

// ─── Raw record shape ─────────────────────────────────────────────────────────
export interface MockRecord {
  bank: string;
  bankId: string;
  year: number;
  month: string;
  date: string;
  indentCount: number;
  merchantAccept: number;
  merchantDeny: number;
  mappingDevicesCount: number;
  pickupCount: number;
  inTransitCount: number;
  deliveryCount: number;
  rtoCount: number;
}

function makeRecord(
  bank: { id: string; name: string },
  year: number,
  monthIdx: number,
  day: number,
): MockRecord {
  const base = BANK_MONTHLY[bank.name] ?? 10;
  const count = Math.max(1, Math.round((base * SEASONAL[monthIdx]) / 2));
  const mm = String(monthIdx + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return {
    bank: bank.name,
    bankId: bank.id,
    year,
    month: MONTH_NAMES[monthIdx],
    date: `${year}-${mm}-${dd}`,
    indentCount: count,
    merchantAccept: Math.round(count * 0.78),
    merchantDeny: Math.round(count * 0.13),
    mappingDevicesCount: Math.round(count * 0.72),
    pickupCount: Math.round(count * 0.63),
    inTransitCount: Math.round(count * 0.08),
    deliveryCount: Math.round(count * 0.46),
    rtoCount: Math.round(count * 0.09),
  };
}

// 8 banks × 2 years × 12 months × 2 dates = 384 raw records
export const ALL_MOCK_RECORDS: MockRecord[] = [];
for (const bank of MOCK_BANKS) {
  // Historical data
  for (const year of [2024, 2025]) {
    for (let m = 0; m < 12; m++) {
      ALL_MOCK_RECORDS.push(makeRecord(bank, year, m, 8));
      ALL_MOCK_RECORDS.push(makeRecord(bank, year, m, 22));
    }
  }

  // Dynamic Recent data (Today, Yesterday, Last 7 Days)
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Today's record
  ALL_MOCK_RECORDS.push({
    ...makeRecord(bank, today.getFullYear(), today.getMonth(), today.getDate()),
    date: today.toISOString().split('T')[0],
  });

  // Yesterday's record
  ALL_MOCK_RECORDS.push({
    ...makeRecord(bank, yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
    date: yesterday.toISOString().split('T')[0],
  });

  // Last 2–7 Days records
  for (let i = 2; i < 7; i++) {
    const pastDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    ALL_MOCK_RECORDS.push({
      ...makeRecord(bank, pastDate.getFullYear(), pastDate.getMonth(), pastDate.getDate()),
      date: pastDate.toISOString().split('T')[0],
    });
  }
}

// ─── Aggregation helpers ──────────────────────────────────────────────────────

export function aggregateSummary(records: MockRecord[]) {
  const map = new Map<string, {
    bank: string; indentCount: number; merchantAccept: number; merchantDeny: number;
    mappingDevicesCount: number; pickupCount: number; inTransitCount: number;
    deliveryCount: number; rtoCount: number;
  }>();

  for (const r of records) {
    if (!map.has(r.bank)) {
      map.set(r.bank, {
        bank: r.bank, indentCount: 0, merchantAccept: 0, merchantDeny: 0,
        mappingDevicesCount: 0, pickupCount: 0, inTransitCount: 0,
        deliveryCount: 0, rtoCount: 0,
      });
    }
    const s = map.get(r.bank)!;
    s.indentCount        += r.indentCount;
    s.merchantAccept     += r.merchantAccept;
    s.merchantDeny       += r.merchantDeny;
    s.mappingDevicesCount += r.mappingDevicesCount;
    s.pickupCount        += r.pickupCount;
    s.inTransitCount     += r.inTransitCount;
    s.deliveryCount      += r.deliveryCount;
    s.rtoCount           += r.rtoCount;
  }
  return Array.from(map.values());
}

// ── All 8 stats stored on every pivot leaf ────────────────────────────────────
export interface PivotStats {
  indentCount: number;
  merchantAccept: number;
  merchantDeny: number;
  mappingDevicesCount: number;
  pickupCount: number;
  inTransitCount: number;
  deliveryCount: number;
  rtoCount: number;
}

export interface PivotNode {
  id: string;
  label: string;
  type: string;
  stats?: PivotStats;  // leaf nodes carry full stats
  count?: number;      // legacy / API-only nodes
  children?: PivotNode[];
}

export function buildPivot(records: MockRecord[]): PivotNode[] {
  const empty = (): PivotStats => ({
    indentCount: 0, merchantAccept: 0, merchantDeny: 0,
    mappingDevicesCount: 0, pickupCount: 0, inTransitCount: 0,
    deliveryCount: 0, rtoCount: 0,
  });

  const addRecord = (a: PivotStats, r: MockRecord): PivotStats => ({
    indentCount:          a.indentCount          + r.indentCount,
    merchantAccept:       a.merchantAccept       + r.merchantAccept,
    merchantDeny:         a.merchantDeny         + r.merchantDeny,
    mappingDevicesCount:  a.mappingDevicesCount   + r.mappingDevicesCount,
    pickupCount:          a.pickupCount          + r.pickupCount,
    inTransitCount:       a.inTransitCount       + r.inTransitCount,
    deliveryCount:        a.deliveryCount        + r.deliveryCount,
    rtoCount:             a.rtoCount             + r.rtoCount,
  });

  // bank → year → month → date → PivotStats
  const bankMap = new Map<string, Map<number, Map<string, Map<string, PivotStats>>>>();

  for (const r of records) {
    if (!bankMap.has(r.bank)) bankMap.set(r.bank, new Map());
    const yearMap = bankMap.get(r.bank)!;
    if (!yearMap.has(r.year)) yearMap.set(r.year, new Map());
    const monthMap = yearMap.get(r.year)!;
    if (!monthMap.has(r.month)) monthMap.set(r.month, new Map());
    const dayMap = monthMap.get(r.month)!;
    dayMap.set(r.date, addRecord(dayMap.get(r.date) ?? empty(), r));
  }

  return Array.from(bankMap.entries()).map(([bankName, yearMap]) => ({
    id: bankName,
    label: bankName,
    type: 'bank',
    children: Array.from(yearMap.entries()).map(([year, monthMap]) => ({
      id: `${bankName}-${year}`,
      label: String(year),
      type: 'year',
      children: Array.from(monthMap.entries()).map(([month, dayMap]) => ({
        id: `${bankName}-${year}-${month}`,
        label: month,
        type: 'month',
        children: Array.from(dayMap.entries()).map(([date, stats]) => ({
          id: `${bankName}-${date}`,
          label: date,
          type: 'day',
          stats,
        })),
      })),
    })),
  }));
}

export function buildGraphData(records: MockRecord[]) {
  const dateMap = new Map<string, Record<string, number>>();
  for (const r of records) {
    if (!dateMap.has(r.date)) dateMap.set(r.date, {});
    const entry = dateMap.get(r.date)!;
    entry[r.bank] = (entry[r.bank] ?? 0) + r.indentCount;
  }
  return Array.from(dateMap.entries())
    .map(([date, banks]) => ({ date, ...banks }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
