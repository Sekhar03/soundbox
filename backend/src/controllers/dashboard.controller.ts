import { Request, Response } from "express";
import prisma from "../config/db";
import { startOfYear, endOfYear, format, parseISO, isValid } from "date-fns";

// SQLite stores dates as ISO strings; Prisma may return string or Date
function safeDate(val: any): Date {
  if (val instanceof Date) return val;
  const d = typeof val === 'string' ? parseISO(val) : new Date(val);
  return isValid(d) ? d : new Date();
}

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const { bankIds, years } = req.query;

    // Fix 2: trim + filter(Boolean) so an empty-string query param yields []
    const bankFilter =
      bankIds && (bankIds as string).trim()
        ? (bankIds as string).split(",").filter(Boolean)
        : [];

    // Fix 3: trim + filter NaN/0 so "".split(',').map(Number) → [NaN] never reaches the query
    const yearFilter =
      years && (years as string).trim()
        ? (years as string)
            .split(",")
            .map(Number)
            .filter((n) => !isNaN(n) && n > 0)
        : [];

    // Fix 1: SQLite-compatible NOT syntax — `{ not: '...' }` crashes on SQLite Prisma
    const where: any = {
      NOT: [{ deliveryStatus: "RTO_DELIVERED" }],
    };

    if (bankFilter.length > 0) {
      where.bankId = { in: bankFilter };
    }

    if (yearFilter.length > 0) {
      const yearConditions = yearFilter.map((year) => ({
        indentDate: {
          gte: startOfYear(new Date(year, 0, 1)),
          lte: endOfYear(new Date(year, 0, 1)),
        },
      }));
      where.OR = yearConditions;
    }

    const indents = await prisma.indent.findMany({
      where,
      include: {
        bank: true,
        merchant: true,
      },
      orderBy: { indentDate: "desc" },
    });

    // 1. Summary Table Data (Grouped by Bank)
    const summaryMap = new Map();
    indents.forEach((indent) => {
      const bankName = indent.bank.name;
      if (!summaryMap.has(bankName)) {
        summaryMap.set(bankName, {
          bank: bankName,
          indentCount: 0,
          merchantAccept: 0,
          merchantDeny: 0,
          mappingDevicesCount: 0,
          pickupCount: 0,
          inTransitCount: 0,
          deliveryCount: 0,
          rtoCount: 0,
        });
      }
      const s = summaryMap.get(bankName);
      s.indentCount++;
      if (indent.merchantAcceptDeny === "ACCEPTED") s.merchantAccept++;
      if (indent.merchantAcceptDeny === "DENIED") s.merchantDeny++;
      if (indent.mappingStatus === "MAPPED") s.mappingDevicesCount++;
      if (indent.pickupStatus) s.pickupCount++;
      if (indent.deliveryStatus === "IN_TRANSIT") s.inTransitCount++;
      if (indent.deliveryStatus === "DELIVERED") s.deliveryCount++;
      if (indent.deliveryStatus.includes("RTO")) s.rtoCount++;
    });

    // 2. Pivot Data (Bank -> Year -> Month -> Date)
    const pivot: any[] = [];
    const bankGroups = new Map();

    indents.forEach((indent) => {
      const b = indent.bank.name;
      const date = safeDate(indent.indentDate);
      const y = date.getFullYear().toString();
      const m = format(date, "MMMM");
      const d = format(date, "yyyy-MM-dd");

      if (!bankGroups.has(b)) bankGroups.set(b, new Map());
      const yearsMap = bankGroups.get(b);

      if (!yearsMap.has(y)) yearsMap.set(y, new Map());
      const monthsMap = yearsMap.get(y);

      if (!monthsMap.has(m)) monthsMap.set(m, new Map());
      const daysMap = monthsMap.get(m);

      if (!daysMap.has(d)) daysMap.set(d, []);
      daysMap.get(d).push(indent);
    });

    bankGroups.forEach((yearsMap, bankName) => {
      const yearNodes: any[] = [];
      yearsMap.forEach((monthsMap: Map<string, any[]>, year: string) => {
        const monthNodes: any[] = [];
        monthsMap.forEach((indentsList, month) => {
          const dayNodes: any[] = [];
          indentsList.forEach((indent: any) => {
            const dayKey = format(safeDate(indent.indentDate), "yyyy-MM-dd");
            let dayNode = dayNodes.find((n) => n.id === dayKey);
            if (!dayNode) {
              dayNode = { id: dayKey, label: dayKey, count: 0, type: "day" };
              dayNodes.push(dayNode);
            }
            dayNode.count++;
          });
          monthNodes.push({
            id: `${bankName}-${year}-${month}`,
            label: month,
            children: dayNodes,
            type: "month",
          });
        });
        yearNodes.push({
          id: `${bankName}-${year}`,
          label: year,
          children: monthNodes,
          type: "year",
        });
      });
      pivot.push({
        id: bankName,
        label: bankName,
        children: yearNodes,
        type: "bank",
      });
    });

    // 3. Graph Data (Bank-wise time series)
    const graphMap = new Map();
    indents.forEach((indent) => {
      const d = format(safeDate(indent.indentDate), "yyyy-MM-dd");
      const b = indent.bank.name;
      if (!graphMap.has(d)) graphMap.set(d, {});
      const dayData = graphMap.get(d);
      dayData[b] = (dayData[b] || 0) + 1;
    });

    const graphData = Array.from(graphMap.entries())
      .map(([date, banks]) => ({ date, ...banks }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fix 4: Derive available years dynamically from the DB instead of hardcoding
    const allIndentDates = await prisma.indent.findMany({
      select: { indentDate: true },
    });
    const availableYears = [
      ...new Set(
        allIndentDates.map((row) => safeDate(row.indentDate).getFullYear()),
      ),
    ].sort((a, b) => a - b);

    res.json({
      summary: Array.from(summaryMap.values()),
      pivot,
      graphData,
      availableBanks: await prisma.bank.findMany(),
      availableYears,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
};
