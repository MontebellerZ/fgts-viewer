import type { ChartPoint, FileViewData, MonthlyPoint, Transaction } from "../types";
import { monthToDate, parseDate } from "./date";

export function buildMonthlyPoints(transactions: Transaction[]): MonthlyPoint[] {
  const monthlyMap = new Map<string, MonthlyPoint>();

  for (const transaction of transactions) {
    const date = parseDate(transaction.date);
    if (Number.isNaN(date.getTime())) continue;

    const month = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
    const current = monthlyMap.get(month) ?? {
      month,
      totalBalance: transaction.balance,
      jamMonth: 0,
      creditMonth: 0,
    };

    current.totalBalance = transaction.balance;

    if (/^CREDITO\s+DE\s+JAM\b/i.test(transaction.description) && transaction.value > 0) {
      current.jamMonth += transaction.value;
    } else if (transaction.value > 0) {
      current.creditMonth += transaction.value;
    }

    monthlyMap.set(month, current);
  }

  return Array.from(monthlyMap.values()).sort((a, b) => monthToDate(a.month).getTime() - monthToDate(b.month).getTime());
}

export function buildChartDataSingleFile(transactions: Transaction[]): ChartPoint[] {
  const sorted = buildMonthlyPoints(transactions);

  let jamAccumulated = 0;
  return sorted.map((point) => {
    jamAccumulated += point.jamMonth;
    return {
      month: point.month,
      totalBalance: point.totalBalance,
      jamCredit: jamAccumulated,
      creditMonth: point.creditMonth,
      jamMonth: point.jamMonth,
    };
  });
}

export function buildChartDataAllFiles(filesData: FileViewData[]): ChartPoint[] {
  const perFileMonthly = filesData.map((fileData) => buildMonthlyPoints(fileData.transactions));

  const allMonths = new Set<string>();
  for (const monthlyList of perFileMonthly) {
    for (const point of monthlyList) {
      allMonths.add(point.month);
    }
  }

  const sortedMonths = Array.from(allMonths).sort((a, b) => monthToDate(a).getTime() - monthToDate(b).getTime());

  const chart: ChartPoint[] = [];
  const lastBalanceByFile = new Array<number>(perFileMonthly.length).fill(0);

  for (const month of sortedMonths) {
    let monthTotalBalance = 0;
    let monthJam = 0;
    let monthCredit = 0;

    perFileMonthly.forEach((monthlyList, fileIndex) => {
      const monthPoint = monthlyList.find((point) => point.month === month);
      if (monthPoint) {
        lastBalanceByFile[fileIndex] = monthPoint.totalBalance;
        monthJam += monthPoint.jamMonth;
        monthCredit += monthPoint.creditMonth;
      }
      monthTotalBalance += lastBalanceByFile[fileIndex];
    });

    chart.push({
      month,
      totalBalance: monthTotalBalance,
      jamCredit: monthJam,
      creditMonth: monthCredit,
      jamMonth: monthJam,
    });
  }

  let jamAccumulated = 0;
  for (const point of chart) {
    jamAccumulated += point.jamMonth;
    point.jamCredit = jamAccumulated;
  }

  return chart;
}
