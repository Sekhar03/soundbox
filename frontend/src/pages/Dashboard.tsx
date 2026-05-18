import { useState, useEffect, useMemo } from 'react';
import {
  Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Checkbox, CircularProgress,
  Stack, Card, CardContent, Divider, Grid,
  FormControl, InputLabel, Select, MenuItem, ListItemText, OutlinedInput,
  Button,
} from '@mui/material';

import {
  KeyboardArrowDown as ArrowDown,
  KeyboardArrowUp as ArrowUp,
  FilterList as FilterIcon,
  ArrowUpward as SortAsc,
  ArrowDownward as SortDesc,
  UnfoldMore as SortNone,
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { fetchDashboardData } from '../store/slices/dashboardSlice';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  ALL_MOCK_RECORDS, MOCK_BANKS, MOCK_YEARS,
  aggregateSummary, buildPivot, buildGraphData,
} from '../utils/mockData';
import type { PivotNode } from '../utils/mockData';

// ─── Constants ─────────────────────────────────────────────────────────────────
const BANK_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#F97316','#06B6D4','#EC4899'];

const PIVOT_COLS = [
  'Indent Count','Merchant Accept','Merchant Deny','Mapping Devices Count',
  'Pickup Count','In Transit Count','Delivery Count','RTO Count',
];

// ─── Pivot helpers ──────────────────────────────────────────────────────────────
interface PivotStats {
  indentCount: number; merchantAccept: number; merchantDeny: number;
  mappingDevicesCount: number; pickupCount: number; inTransitCount: number;
  deliveryCount: number; rtoCount: number;
}
const ZERO: PivotStats = {
  indentCount:0, merchantAccept:0, merchantDeny:0, mappingDevicesCount:0,
  pickupCount:0, inTransitCount:0, deliveryCount:0, rtoCount:0,
};

function addStats(a: PivotStats, b: PivotStats): PivotStats {
  return {
    indentCount:          a.indentCount          + b.indentCount,
    merchantAccept:       a.merchantAccept       + b.merchantAccept,
    merchantDeny:         a.merchantDeny         + b.merchantDeny,
    mappingDevicesCount:  a.mappingDevicesCount  + b.mappingDevicesCount,
    pickupCount:          a.pickupCount          + b.pickupCount,
    inTransitCount:       a.inTransitCount       + b.inTransitCount,
    deliveryCount:        a.deliveryCount        + b.deliveryCount,
    rtoCount:             a.rtoCount             + b.rtoCount,
  };
}

function getStats(node: PivotNode): PivotStats {
  if (!node.children?.length) {
    const s = (node as any).stats as PivotStats | undefined;
    if (s) return s;
    return { ...ZERO, indentCount: (node as any).count ?? 0 };
  }
  return node.children.reduce((acc, child) => addStats(acc, getStats(child)), { ...ZERO });
}

function statsArr(s: PivotStats): number[] {
  return [s.indentCount, s.merchantAccept, s.merchantDeny, s.mappingDevicesCount,
          s.pickupCount, s.inTransitCount, s.deliveryCount, s.rtoCount];
}

// ─── Month order for proper calendar sort ────────────────────────────────────
const MONTH_ORDER: Record<string, number> = {
  January:1, February:2, March:3, April:4, May:5, June:6,
  July:7, August:8, September:9, October:10, November:11, December:12,
};

function pivotSortKey(label: string): number | string {
  if (MONTH_ORDER[label])               return MONTH_ORDER[label];       // month
  if (/^\d{4}$/.test(label))           return parseInt(label);           // year
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) return label;                  // date (ISO sorts correctly)
  return label;                                                           // bank name
}

function sortNodes(
  nodes: PivotNode[],
  col: string,
  dir: 'asc' | 'desc',
): PivotNode[] {
  return [...nodes].sort((a, b) => {
    let cmp = 0;
    if (col === 'hierarchy') {
      const ak = pivotSortKey(a.label);
      const bk = pivotSortKey(b.label);
      cmp = typeof ak === 'number' && typeof bk === 'number'
        ? ak - bk
        : String(ak).localeCompare(String(bk));
    } else {
      const idx = PIVOT_COLS.indexOf(col);
      if (idx >= 0) cmp = statsArr(getStats(a))[idx] - statsArr(getStats(b))[idx];
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

// Build a flat visible list (no nested tables → columns align perfectly)
function flattenPivot(
  nodes: PivotNode[],
  openIds: Set<string>,
  sortCol: string,
  sortDir: 'asc' | 'desc',
  level = 0,
  out: { node: PivotNode; level: number }[] = [],
) {
  const sorted = sortNodes(nodes, sortCol, sortDir);
  for (const node of sorted) {
    out.push({ node, level });
    if (node.children?.length && openIds.has(node.id)) {
      flattenPivot(node.children, openIds, sortCol, sortDir, level + 1, out);
    }
  }
  return out;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    summary: apiSummary, pivot: apiPivot, graphData: apiGraphData,
    availableBanks: apiBanks, availableYears: apiYears, loading,
  } = useSelector((s: RootState) => s.dashboard);

  const [selBanks, setSelBanks] = useState<string[]>(['ALL']);
  const [selYears, setSelYears] = useState<any[]>(['ALL']);
  const [openIds, setOpenIds]   = useState<Set<string>>(new Set());
  const [sortCol, setSortCol]   = useState<string>('hierarchy');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc'); // desc = LIFO by default

  // Initial API fetch
  useEffect(() => { dispatch(fetchDashboardData({ bankIds: '', years: '' })); }, [dispatch]);

  // Re-fetch when API has data and filters change
  const apiHasData = apiBanks.length > 0 && apiSummary.length > 0;
  useEffect(() => {
    if (!apiHasData) return;
    const bankIdsParam = selBanks.includes('ALL') ? '' : selBanks.join(',');
    const yearsParam = selYears.includes('ALL') ? '' : selYears.join(',');
    dispatch(fetchDashboardData({ bankIds: bankIdsParam, years: yearsParam }));
  }, [selBanks, selYears, apiHasData, dispatch]);

  // Mock data filtered client-side
  const mockRecords = useMemo(() => {
    let r = ALL_MOCK_RECORDS;
    if (selBanks.length && !selBanks.includes('ALL')) r = r.filter(x => selBanks.includes(x.bankId));
    if (selYears.length && !selYears.includes('ALL')) r = r.filter(x => selYears.includes(x.year));
    return r;
  }, [selBanks, selYears]);

  // Resolved display data
  const banks   = apiHasData ? apiBanks    : MOCK_BANKS;
  const years   = apiHasData ? apiYears    : MOCK_YEARS;
  const summary = apiHasData ? apiSummary  : aggregateSummary(mockRecords);
  const pivot   = apiHasData ? (apiPivot as PivotNode[])  : buildPivot(mockRecords);
  const graph   = apiHasData ? apiGraphData: buildGraphData(mockRecords);

  // Pivot toggle
  const toggle = (id: string) =>
    setOpenIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Toggle sort: same column flips direction; new column starts desc
  const handlePivotSort = (col: string) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const flatRows = useMemo(
    () => flattenPivot(pivot, openIds, sortCol, sortDir),
    [pivot, openIds, sortCol, sortDir],
  );

  // Export to Excel function (generates an Excel-friendly HTML sheet with true Outline Grouping / Pivot layout)
  const handleExport = () => {
    // Flatten the ENTIRE pivot tree (not just visible ones) so the user gets everything collapsible inside Excel
    const flattenFullPivot = (
      nodes: PivotNode[],
      level = 0,
      out: { node: PivotNode; level: number }[] = [],
    ) => {
      // Sort nodes just like on the screen
      const sorted = sortNodes(nodes, sortCol, sortDir);
      for (const node of sorted) {
        out.push({ node, level });
        if (node.children?.length) {
          flattenFullPivot(node.children, level + 1, out);
        }
      }
      return out;
    };

    const fullRows = flattenFullPivot(pivot);

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Operational Drilldown</x:Name>
                <x:WorksheetOptions>
                  <x:OutlineLayout/>
                  <x:SummaryBelow/>
                  <x:SummaryRight/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          th { background-color: #f3f4f6; font-weight: bold; border: 1px solid #d1d5db; padding: 8px 12px; font-size: 10pt; text-align: left; }
          .num-hdr { text-align: right; }
          .red-hdr { background-color: #fef2f2; color: #b91c1c !important; }
          td { border: 1px solid #e5e7eb; padding: 6px 12px; font-size: 10pt; }
          .level-0 { font-weight: bold; background-color: #eff6ff; color: #1d4ed8; }
          .level-1 { font-weight: 600; background-color: #f9fafb; color: #1f2937; }
          .level-2 { font-weight: 500; color: #374151; }
          .level-3 { font-weight: normal; color: #6b7280; }
          .num { text-align: right; mso-number-format: "#,##0"; }
          .red-num { text-align: right; mso-number-format: "#,##0"; background-color: #fff5f5; color: #dc2626; }
          .total-row { font-weight: bold; background-color: #f3f4f6; border-top: 2px solid #9ca3af; color: #111827; }
          .red-total { font-weight: bold; background-color: #fee2e2 !important; color: #b91c1c !important; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Bank</th>
              <th>Year</th>
              <th>Month</th>
              <th>Date</th>
              <th class="num-hdr">Indent Count</th>
              <th class="num-hdr">Merchant Accept</th>
              <th class="num-hdr red-hdr">Merchant Deny</th>
              <th class="num-hdr">Mapping Devices Count</th>
              <th class="num-hdr">Pickup Count</th>
              <th class="num-hdr">In Transit Count</th>
              <th class="num-hdr">Delivery Count</th>
              <th class="num-hdr red-hdr">RTO Count</th>
            </tr>
          </thead>
          <tbody>
    `;

    let currentBank = '';
    let currentYear = '';
    let currentMonth = '';

    fullRows.forEach(({ node, level }) => {
      const stats = getStats(node);
      const levelClass = `level-${level}`;
      
      let bankVal = '';
      let yearVal = '';
      let monthVal = '';
      let dateVal = '';
      
      if (level === 0) {
        currentBank = node.label;
        currentYear = '';
        currentMonth = '';
        bankVal = currentBank;
      } else if (level === 1) {
        currentYear = node.label;
        currentMonth = '';
        bankVal = currentBank;
        yearVal = currentYear;
      } else if (level === 2) {
        currentMonth = node.label;
        bankVal = currentBank;
        yearVal = currentYear;
        monthVal = currentMonth;
      } else if (level === 3) {
        bankVal = currentBank;
        yearVal = currentYear;
        monthVal = currentMonth;
        dateVal = node.label;
      }
      
      // Use mso-outline-level style to natively group the rows inside Excel
      // Excel outline level starts at 1, so we do level + 1
      const outlineStyle = `style="mso-outline-level: ${level + 1};"`;
      
      html += `
        <tr class="${levelClass}" ${outlineStyle}>
          <td>${bankVal}</td>
          <td>${yearVal}</td>
          <td>${monthVal}</td>
          <td>${dateVal}</td>
          <td class="num">${stats.indentCount}</td>
          <td class="num">${stats.merchantAccept}</td>
          <td class="num red-num">${stats.merchantDeny}</td>
          <td class="num">${stats.mappingDevicesCount}</td>
          <td class="num">${stats.pickupCount}</td>
          <td class="num">${stats.inTransitCount}</td>
          <td class="num">${stats.deliveryCount}</td>
          <td class="num red-num">${stats.rtoCount}</td>
        </tr>
      `;
    });

    // Add Total Row at bottom
    html += `
          <tr class="total-row">
            <td>Total Summary</td>
            <td></td>
            <td></td>
            <td></td>
            <td class="num">${total.indentCount}</td>
            <td class="num">${total.merchantAccept}</td>
            <td class="num red-total">${total.merchantDeny}</td>
            <td class="num">${total.mappingDevicesCount}</td>
            <td class="num">${total.pickupCount}</td>
            <td class="num">${total.inTransitCount}</td>
            <td class="num">${total.deliveryCount}</td>
            <td class="num red-total">${total.rtoCount}</td>
          </tr>
        </tbody>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const bankSuffix = selBanks.length ? `_${selBanks.length}_banks` : '_all_banks';
    const yearSuffix = selYears.length ? `_${selYears.join('_')}` : '';
    link.setAttribute('href', url);
    link.setAttribute('download', `operational_drilldown${bankSuffix}${yearSuffix}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadMetric = (label: string, field: string) => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; width: 100%; }
          th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 10px 14px; font-size: 10pt; text-align: left; }
          .num-hdr { text-align: right; }
          td { border: 1px solid #e2e8f0; padding: 8px 14px; font-size: 10pt; }
          .num { text-align: right; mso-number-format: "#,##0"; font-family: monospace; }
          .total-row { font-weight: bold; background-color: #f8fafc; border-top: 2px solid #4f46e5; color: #0f172a; }
        </style>
      </head>
      <body>
        <h2 style="font-family: 'Segoe UI', sans-serif; color: #0f172a; margin-bottom: 15px;">Bank-wise Breakdown: ${label}</h2>
        <table>
          <thead>
            <tr>
              <th>Bank Name</th>
              <th class="num-hdr">${label}</th>
            </tr>
          </thead>
          <tbody>
    `;

    let totalVal = 0;
    summary.forEach(row => {
      const val = (row as any)[field] ?? 0;
      totalVal += val;
      html += `
        <tr>
          <td style="font-weight: 500;">${row.bank}</td>
          <td class="num">${val}</td>
        </tr>
      `;
    });

    html += `
          <tr class="total-row">
            <td>Grand Total</td>
            <td class="num">${totalVal}</td>
          </tr>
        </tbody>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const metricName = label.toLowerCase().replace(/\s+/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `${metricName}_bank_wise_breakdown.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Totals
  const total = useMemo(() =>
    summary.reduce((a, r) => ({
      indentCount:         a.indentCount         + r.indentCount,
      merchantAccept:      a.merchantAccept      + r.merchantAccept,
      merchantDeny:        a.merchantDeny        + r.merchantDeny,
      mappingDevicesCount: a.mappingDevicesCount + r.mappingDevicesCount,
      pickupCount:         a.pickupCount         + r.pickupCount,
      inTransitCount:      a.inTransitCount      + r.inTransitCount,
      deliveryCount:       a.deliveryCount       + r.deliveryCount,
      rtoCount:            a.rtoCount            + r.rtoCount,
    }), { ...ZERO }), [summary]);

  // Bank names for line graph
  const bankNames = useMemo(() =>
    [...new Set(graph.flatMap((d: Record<string,unknown>) => Object.keys(d).filter(k => k !== 'date')))],
  [graph]);

  // Cumulative totals for a cricket-style worm/trend chart (always moving lower to upper)
  const cumulativeGraph = useMemo(() => {
    const sorted = [...graph].sort((a, b) => a.date.localeCompare(b.date));
    const running: Record<string, number> = {};
    return sorted.map(d => {
      const row: Record<string, any> = { date: d.date };
      bankNames.forEach(b => {
        const val = (d[b] as number) ?? 0;
        running[b] = (running[b] ?? 0) + val;
        row[b] = running[b];
      });
      return row;
    });
  }, [graph, bankNames]);

  return (
    <Box sx={{ pb: 6, px: { xs: 1, sm: 3 } }}>

      {/* ── Dashboard Page Header ── */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.03em', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 8, height: 28, bgcolor: 'primary.main', borderRadius: 4 }} />
            Sound Box Operations Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            Real-time logistical tracking, activation funnel metrics, and bank-wise seasonal analytics.
          </Typography>
        </Box>
      </Box>

      {/* ── Filters Bar (Glassmorphic & Sticky) ── */}
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 2, 
          mb: 4, 
          borderRadius: 4, 
          position: 'sticky', 
          top: 16, 
          zIndex: 10, 
          bgcolor: 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
          borderColor: 'rgba(226, 232, 240, 0.8)',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <FilterIcon color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">Control Panel</Typography>
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', borderColor: 'divider' }} />

          {/* Bank dropdown */}
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Filter by Banks</InputLabel>
            <Select
              multiple
              value={selBanks}
              onChange={(e) => {
                const val = e.target.value as string[];
                if (val.includes('ALL') && !selBanks.includes('ALL')) {
                  setSelBanks(['ALL']);
                } else {
                  const filtered = val.filter(x => x !== 'ALL');
                  setSelBanks(filtered.length === 0 ? ['ALL'] : filtered);
                }
              }}
              input={<OutlinedInput label="Filter by Banks" sx={{ borderRadius: 2 }} />}
              renderValue={(selected) => {
                const s = selected as string[];
                if (s.includes('ALL')) return 'All Banks';
                return s.map(id => banks.find(x => x.id === id)?.name ?? id).join(', ');
              }}
              MenuProps={{ PaperProps: { sx: { maxHeight: 300, borderRadius: 3 } } }}
            >
              <MenuItem value="ALL" sx={{ borderRadius: 1.5, my: 0.25, mx: 0.5 }}>
                <Checkbox size="small" checked={selBanks.includes('ALL')} sx={{ borderRadius: 1 }} />
                <ListItemText primary="ALL" primaryTypographyProps={{ style: { fontSize: '0.875rem', fontWeight: 700, color: '#4f46e5' } }} />
              </MenuItem>
              {banks.map(b => (
                <MenuItem key={b.id} value={b.id} sx={{ borderRadius: 1.5, my: 0.25, mx: 0.5 }}>
                  <Checkbox size="small" checked={selBanks.includes(b.id)} sx={{ borderRadius: 1 }} />
                  <ListItemText primary={b.name} primaryTypographyProps={{ style: { fontSize: '0.875rem', fontWeight: 500 } }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Year dropdown */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Filter by Years</InputLabel>
            <Select
              multiple
              value={selYears}
              onChange={(e) => {
                const val = e.target.value as any[];
                if (val.includes('ALL') && !selYears.includes('ALL')) {
                  setSelYears(['ALL']);
                } else {
                  const filtered = val.filter(x => x !== 'ALL');
                  setSelYears(filtered.length === 0 ? ['ALL'] : filtered);
                }
              }}
              input={<OutlinedInput label="Filter by Years" sx={{ borderRadius: 2 }} />}
              renderValue={(selected) => {
                const s = selected as any[];
                if (s.includes('ALL')) return 'All Years';
                return s.join(', ');
              }}
              MenuProps={{ PaperProps: { sx: { maxHeight: 200, borderRadius: 3 } } }}
            >
              <MenuItem value="ALL" sx={{ borderRadius: 1.5, my: 0.25, mx: 0.5 }}>
                <Checkbox size="small" checked={selYears.includes('ALL')} sx={{ borderRadius: 1 }} />
                <ListItemText primary="ALL" primaryTypographyProps={{ style: { fontSize: '0.875rem', fontWeight: 700, color: '#4f46e5' } }} />
              </MenuItem>
              {years.map(y => (
                <MenuItem key={y} value={y} sx={{ borderRadius: 1.5, my: 0.25, mx: 0.5 }}>
                  <Checkbox size="small" checked={selYears.includes(y)} sx={{ borderRadius: 1 }} />
                  <ListItemText primary={String(y)} primaryTypographyProps={{ style: { fontSize: '0.875rem', fontWeight: 500 } }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Clear button */}
          {(!selBanks.includes('ALL') || !selYears.includes('ALL')) && (
            <Button
              variant="text"
              size="small"
              onClick={() => { setSelBanks(['ALL']); setSelYears(['ALL']); }}
              sx={{ color: 'primary.main', fontWeight: 700, borderRadius: 2 }}
            >
              Reset Filters
            </Button>
          )}
        </Stack>
      </Paper>

      {/* ── Individual Premium KPI Cards (Total Summary) ── */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2.5}>
          {([
            { label: 'Indent Count',     value: total.indentCount,     isRed: false, color: '#4f46e5', field: 'indentCount' },
            { label: 'Merchant Accept',  value: total.merchantAccept,  isRed: false, color: '#10b981', field: 'merchantAccept' },
            { label: 'Merchant Deny',    value: total.merchantDeny,    isRed: true,  color: '#ef4444', field: 'merchantDeny' },
            { label: 'Devices Mapped',   value: total.mappingDevicesCount, isRed: false, color: '#6366f1', field: 'mappingDevicesCount' },
            { label: 'Pickup Count',     value: total.pickupCount,     isRed: false, color: '#f59e0b', field: 'pickupCount' },
            { label: 'In Transit',       value: total.inTransitCount,  isRed: false, color: '#06b6d4', field: 'inTransitCount' },
            { label: 'Delivery Count',   value: total.deliveryCount,   isRed: false, color: '#10b981', field: 'deliveryCount' },
            { label: 'RTO Count',        value: total.rtoCount,        isRed: true,  color: '#ef4444', field: 'rtoCount' },
          ]).map(item => {
            const isGreenAccent = item.label === 'Merchant Accept' || item.label === 'Delivery Count';
            const cardBg = item.isRed
              ? 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)'
              : isGreenAccent
                ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
            const borderColor = item.isRed 
              ? 'rgba(239, 68, 68, 0.25)' 
              : isGreenAccent 
                ? 'rgba(16, 185, 129, 0.25)'
                : 'rgba(226, 232, 240, 0.8)';
            return (
              <Grid item xs={12} sm={6} md={3} lg={1.5} key={item.label}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 3.5, 
                    border: '1px solid',
                    borderColor: borderColor,
                    background: cardBg,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.015)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.06)',
                      borderColor: item.color,
                    }
                  }}
                >
                  {/* Left accent color bar */}
                  <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: item.color }} />
                  <CardContent sx={{ p: '18px 16px', '&:last-child': { pb: '18px' } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography 
                        variant="caption" 
                        fontWeight={700} 
                        color={item.isRed ? '#b91c1c' : isGreenAccent ? '#047857' : 'text.secondary'}
                        sx={{ 
                          display: 'block', 
                          letterSpacing: '0.05em', 
                          textTransform: 'uppercase',
                          fontSize: '0.7rem'
                        }}
                      >
                        {item.label}
                      </Typography>
                      <IconButton 
                        size="small" 
                        title={`Download Bank-wise ${item.label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadMetric(item.label, item.field);
                        }}
                        sx={{ 
                          p: 0.25, 
                          color: item.isRed ? '#b91c1c' : isGreenAccent ? '#047857' : 'text.secondary',
                          opacity: 0.6,
                          '&:hover': { 
                            opacity: 1, 
                            bgcolor: item.isRed ? 'rgba(239, 68, 68, 0.08)' : isGreenAccent ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 0, 0, 0.04)' 
                          } 
                        }}
                      >
                        <DownloadIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                    <Typography 
                      variant="h5" 
                      fontWeight={900} 
                      fontFamily="monospace"
                      color={item.isRed ? '#b91c1c' : isGreenAccent ? '#047857' : 'text.primary'}
                      sx={{ fontSize: '1.45rem', letterSpacing: '-0.02em' }}
                    >
                      {item.value.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress size={28} /></Box>}

      {/* ── Pivot Table (Drilldown View) ── */}
      <Card 
        variant="outlined" 
        sx={{ 
          mb: 4, 
          borderRadius: 4, 
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02)',
          borderColor: 'rgba(226, 232, 240, 0.8)',
        }}
      >
        <Box 
          sx={{ 
            px: 3, 
            py: 2, 
            borderBottom: '1px solid', 
            borderColor: 'divider', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: '#ffffff'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 4, height: 18, bgcolor: 'secondary.main', borderRadius: 2 }} />
            <Typography variant="h6" fontWeight={800} color="text.primary">
              Operational Performance Drilldown
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleExport}
            startIcon={<DownloadIcon />}
            sx={{ 
              borderRadius: 2.5, 
              textTransform: 'none', 
              px: 2.5,
              py: 0.75,
              fontSize: '0.875rem'
            }}
          >
            Export to Excel
          </Button>
        </Box>
        <TableContainer>
          <Table size="small" sx={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 280 }} />
              {PIVOT_COLS.map(c => {
                let w = 135;
                if (c === 'Mapping Devices Count') w = 195;
                else if (c === 'Merchant Accept' || c === 'In Transit Count') w = 155;
                else if (c === 'Merchant Deny') w = 145;
                return <col key={c} style={{ width: w }} />;
              })}
            </colgroup>
            <TableHead>
              {/* Premium dark high-contrast header */}
              <TableRow sx={{ bgcolor: '#0f172a' }}>
                {/* Sortable Hierarchy header */}
                <TableCell
                  onClick={() => handlePivotSort('hierarchy')}
                  sx={{ 
                    cursor: 'pointer', 
                    userSelect: 'none', 
                    whiteSpace: 'nowrap', 
                    color: '#ffffff',
                    py: 1.5,
                    borderBottom: 'none'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="caption" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                      Operational Level
                    </Typography>
                    {sortCol === 'hierarchy'
                      ? (sortDir === 'asc'
                          ? <SortAsc sx={{ fontSize: 14, color: 'secondary.main' }} />
                          : <SortDesc sx={{ fontSize: 14, color: 'secondary.main' }} />)
                      : <SortNone sx={{ fontSize: 14, opacity: 0.35, color: '#ffffff' }} />}
                  </Stack>
                </TableCell>

                {/* Sortable stats headers */}
                {PIVOT_COLS.map(c => {
                  const isRed = c === 'Merchant Deny' || c === 'RTO Count';
                  return (
                    <TableCell
                      key={c}
                      align="right"
                      onClick={() => handlePivotSort(c)}
                      sx={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        bgcolor: isRed ? '#451a1a' : '#0f172a',
                        color: isRed ? '#fca5a5' : '#ffffff',
                        py: 1.5,
                        borderBottom: 'none'
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                        {sortCol === c
                          ? (sortDir === 'asc'
                              ? <SortAsc sx={{ fontSize: 14, color: isRed ? '#ef4444' : 'secondary.main' }} />
                              : <SortDesc sx={{ fontSize: 14, color: isRed ? '#ef4444' : 'secondary.main' }} />)
                          : <SortNone sx={{ fontSize: 14, opacity: 0.35, color: '#ffffff' }} />}
                        <Typography
                          variant="caption"
                          fontWeight={800}
                          sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: sortCol === c ? (isRed ? '#f87171' : 'secondary.light') : (isRed ? '#fca5a5' : '#94a3b8') }}
                        >
                          {c}
                        </Typography>
                      </Stack>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {flatRows.map(({ node, level }) => {
                const hasKids = !!(node.children?.length);
                const isOpen  = openIds.has(node.id);
                const s       = getStats(node);
                
                // Beautiful left borders representing tree structure indentation
                const levelBg = level === 0 
                  ? '#f0f7ff' // Slate blue tint
                  : level === 1 
                    ? '#f8fafc' // Subtle slate slate
                    : '#ffffff';
                const leftBorderColor = level === 0
                  ? '#4f46e5' // Primary main Indigo
                  : level === 1
                    ? '#64748b' // Slate Grey
                    : level === 2
                      ? '#cbd5e1' // Silver Light
                      : '#f1f5f9'; // Softest
                
                return (
                  <TableRow 
                    key={node.id} 
                    sx={{
                      bgcolor: levelBg,
                      transition: 'background-color 0.2s ease',
                      borderLeft: `4px solid ${leftBorderColor}`,
                      '&:hover': {
                        bgcolor: 'rgba(79, 70, 229, 0.03)'
                      }
                    }}
                  >
                    {/* Hierarchy label — indent only via paddingLeft */}
                    <TableCell sx={{ pl: `${12 + level * 20}px`, py: 0.8, borderColor: 'divider' }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        {hasKids
                          ? <IconButton size="small" onClick={() => toggle(node.id)} sx={{ p: 0.25, color: 'text.secondary' }}>
                              {isOpen ? <ArrowUp fontSize="small" /> : <ArrowDown fontSize="small" />}
                            </IconButton>
                          : <Box sx={{ width: 26 }} />}
                        <Typography 
                          variant="body2" 
                          noWrap
                          fontWeight={level === 0 ? 800 : level === 1 ? 600 : 500}
                          color={level === 0 ? 'primary.main' : 'text.primary'}
                        >
                          {node.label}
                        </Typography>
                      </Stack>
                    </TableCell>
                    
                    {/* 8 stats — each in its own fixed-width column */}
                    {statsArr(s).map((v, i) => {
                      const isRed = i === 2 || i === 7;
                      return (
                        <TableCell
                          key={i}
                          align="right"
                          sx={{
                            py: 0.8,
                            bgcolor: isRed ? 'rgba(239, 68, 68, 0.03)' : 'inherit',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            fontWeight={level === 0 ? 800 : level === 1 ? 600 : 500}
                            color={isRed ? '#dc2626' : 'text.primary'}
                          >
                            {v.toLocaleString()}
                          </Typography>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
              {/* Total row */}
              <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '3px solid', borderColor: '#4f46e5' }}>
                <TableCell sx={{ pl: 3, py: 1.5 }}>
                  <Typography variant="body2" fontWeight={800} color="primary.main">
                    Grand Total
                  </Typography>
                </TableCell>
                {[total.indentCount, total.merchantAccept, total.merchantDeny, total.mappingDevicesCount,
                  total.pickupCount, total.inTransitCount, total.deliveryCount, total.rtoCount].map((v, i) => {
                  const isRed = i === 2 || i === 7;
                  return (
                    <TableCell
                      key={i}
                      align="right"
                      sx={{
                        py: 1.5,
                        bgcolor: isRed ? '#fff5f5' : 'inherit'
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        fontWeight={800}
                        color={isRed ? '#b91c1c' : 'text.primary'}
                      >
                        {v.toLocaleString()}
                      </Typography>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* ── Line Graph (Cumulative Progression) ── */}
      <Card 
        variant="outlined" 
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02)',
          borderColor: 'rgba(226, 232, 240, 0.8)',
          overflow: 'hidden'
        }}
      >
        <Box 
          sx={{ 
            px: 3, 
            py: 2, 
            borderBottom: '1px solid', 
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: '#ffffff'
          }}
        >
          <Box sx={{ width: 4, height: 18, bgcolor: 'primary.main', borderRadius: 2 }} />
          <Typography variant="h6" fontWeight={800} color="text.primary">
            Cumulative Indent Progression
          </Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeGraph} margin={{ top: 12, right: 32, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} 
                  tickLine={false} 
                  dy={8}
                  interval="preserveStartEnd" 
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-8}
                  domain={[0, 'auto']} 
                />
                <Tooltip 
                  contentStyle={{ 
                    fontSize: 12, 
                    borderRadius: 12, 
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)', 
                    border: '1px solid #e2e8f0',
                    fontFamily: '"Inter", sans-serif'
                  }} 
                  labelStyle={{ fontWeight: 800, color: '#0f172a', marginBottom: 4 }} 
                />
                <Legend 
                  wrapperStyle={{ 
                    fontSize: 11, 
                    paddingTop: 16, 
                    fontWeight: 600,
                    fontFamily: '"Inter", sans-serif'
                  }} 
                />
                {bankNames.map((b, i) => (
                  <Line 
                    key={String(b)} 
                    type="monotone" 
                    dataKey={String(b)}
                    stroke={BANK_COLORS[i % BANK_COLORS.length]}
                    strokeWidth={3.5} 
                    dot={false} 
                    activeDot={{ r: 6, strokeWidth: 2 }} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
