import { useState } from "react";
import "./App.css";
import { extractText } from "unpdf";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Transaction {
  date: string;
  description: string;
  value: number;
  balance: number;
}

interface TableTransaction extends Transaction {
  employerInitials?: string;
}

interface ContractData {
  employer: string;
  admissionDate: string;
  optionDate: string;
  terminationDate: string;
  annualRate: string;
  terminationValue: string;
}

interface ChartPoint {
  month: string;
  totalBalance: number;
  jamCredit: number; // acumulado (total corrido)
  creditMonth: number; // créditos não-JAM do mês
  jamMonth: number; // crédito JAM só do mês
}

interface FileViewData {
  id: string;
  fileName: string;
  contractData: ContractData;
  transactions: Transaction[];
}

interface MonthlyPoint {
  month: string;
  totalBalance: number;
  jamMonth: number; // crédito JAM só do mês
  creditMonth: number; // créditos não-JAM do mês
}

async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return text;
}

function parseAmount(raw: string): number {
  const negative = raw.trimStart().startsWith("-");
  const cleaned = raw.replace(/-/g, "").replace(/\./g, "").replace(",", ".").trim();
  return (parseFloat(cleaned) || 0) * (negative ? -1 : 1);
}

function extractDateNear(text: string, labelPattern: RegExp): string {
  const match = text.match(labelPattern);
  if (!match || match.index === undefined) return "-";
  const chunk = text.slice(match.index, match.index + 160);
  const dateMatch = chunk.match(/\d{2}\/\d{2}\/\d{4}/);
  return dateMatch?.[0] ?? "-";
}

function parseContractData(text: string): ContractData {
  const normalized = text.replace(/\s+/g, " ").trim();

  const employer =
    normalized.match(/EMPREGADOR\s+(.+?)\s+CARTEIRA\s+DE\s+TRABALHO/i)?.[1]?.trim() ?? "-";

  const optionDate = extractDateNear(normalized, /DATA\s+DE\s+OP/i);
  const admissionDate = extractDateNear(normalized, /DATA\s+DE\s+ADMISS/i);
  const terminationDate = extractDateNear(normalized, /DATA\s+E\s+C.*AFASTAMENTO/i);

  const annualRateValue = normalized.match(/TAXA\s+DE\s+JUROS\s+([\d.,]+)/i)?.[1] ?? "-";
  const annualRate = annualRateValue === "-" ? "-" : `${annualRateValue}% a.a.`;

  const terminationValueRaw =
    normalized.match(/VALOR\s+PARA\s+FINS\s+RECIS\S*\s+R\$\s*([\d.,]+)/i)?.[1] ?? "-";
  const terminationValue = terminationValueRaw === "-" ? "-" : `R$ ${terminationValueRaw}`;

  return {
    employer,
    admissionDate,
    optionDate,
    terminationDate,
    annualRate,
    terminationValue,
  };
}

function parseTransactions(text: string): Transaction[] {
  // Ignore o cabeçalho — as transações só começam após "SALDO ANTERIOR"
  const startIndex = text.indexOf("SALDO ANTERIOR");
  const body = startIndex !== -1 ? text.slice(startIndex) : text;

  // Remove rodapés/cabeçalhos de virada de página que quebram o parse das linhas.
  const sanitized = body
    .replace(/Hist\S*\s+emitido\s+em:\s*\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2}\s+Para\s+uso\s+da\s+Caixa:\s*\d+/gi, " ")
    .replace(/Hist\S*\s+de\s+Movimenta\S*\s+[A-Z0-9ÇÃÕÁÉÍÓÚ\s/-]+?\s+DATA\s+LAN\S*AMENTO\s+VALOR\s+TOTAL/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const re = /(\d{2}\/\d{2}\/\d{4})\s+((?:(?!\d{2}\/\d{2}\/\d{4})[\s\S])*?)\s+R\$\s*(-?\s*[\d.,]+)\s+R\$\s*([\d.,]+)/g;
  const results: Transaction[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(sanitized)) !== null) {
    results.push({
      date: match[1],
      description: match[2].trim(),
      value: parseAmount(match[3]),
      balance: parseAmount(match[4]),
    });
  }
  return results;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getEmployerInitials(employer: string): string {
  return employer
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function getEmployerColor(initials: string): string {
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 78% 36%)`;
}

function parseDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function monthToDate(month: string): Date {
  const [monthNum, year] = month.split("/").map(Number);
  return new Date(year, monthNum - 1, 1);
}

function parseDateSafe(value: string): Date | null {
  const parts = value.split("/").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [day, month, year] = parts;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortTransactionsByDate(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateA = parseDateSafe(a.date);
    const dateB = parseDateSafe(b.date);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });
}

function buildMonthlyPoints(transactions: Transaction[]): MonthlyPoint[] {
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

function buildChartDataSingleFile(transactions: Transaction[]): ChartPoint[] {
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

function buildChartDataAllFiles(filesData: FileViewData[]): ChartPoint[] {
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

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-month">{label}</div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label chart-tooltip-saldo">Saldo</span>
        <span className="chart-tooltip-value">{formatBRL(d.totalBalance)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label chart-tooltip-juros-totais">Juros totais</span>
        <span className="chart-tooltip-value">{formatBRL(d.jamCredit)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label chart-tooltip-credito-mes">Crédito no mês</span>
        <span className="chart-tooltip-value">{formatBRL(d.creditMonth)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label chart-tooltip-juros-mes">Juros no mês</span>
        <span className="chart-tooltip-value">{formatBRL(d.jamMonth)}</span>
      </div>
    </div>
  );
}

function App() {
  const [filesData, setFilesData] = useState<FileViewData[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setLoading(true);
    try {
      const parsedFiles = await Promise.all(
        files.map(async (file, index) => {
          const text = await extractTextFromPdf(file);
          return {
            id: `${index}-${file.name}`,
            fileName: file.name,
            contractData: parseContractData(text),
            transactions: sortTransactionsByDate(parseTransactions(text)),
          } satisfies FileViewData;
        })
      );

      setFilesData(parsedFiles);
      setActiveTab(parsedFiles.length > 1 ? "all" : parsedFiles[0]?.id ?? "all");
    } catch (error) {
      console.error("Failed to extract text from pdf", error);
      setFilesData([]);
      setActiveTab("all");
    } finally {
      setLoading(false);
    }
  }

  const hasMultipleFiles = filesData.length > 1;
  const allTransactions = sortTransactionsByDate(
    filesData.flatMap((fileData) => {
      const employerInitials = getEmployerInitials(fileData.contractData.employer);
      return fileData.transactions.map((transaction) => ({
        ...transaction,
        employerInitials,
      }));
    })
  ) as TableTransaction[];

  const selectedFile = filesData.find((fileData) => fileData.id === activeTab) ?? null;
  const currentTransactions: TableTransaction[] =
    hasMultipleFiles && activeTab === "all"
      ? allTransactions
      : selectedFile?.transactions ?? filesData[0]?.transactions ?? [];

  const tableTransactions: TableTransaction[] =
    hasMultipleFiles && activeTab === "all"
      ? currentTransactions.reduce<TableTransaction[]>((acc, transaction) => {
          const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
          acc.push({
            ...transaction,
            balance: previousBalance + transaction.value,
          });
          return acc;
        }, [])
      : currentTransactions;

  const displayedTransactions = [...tableTransactions].reverse();
  const chartData = hasMultipleFiles && activeTab === "all"
    ? buildChartDataAllFiles(filesData)
    : buildChartDataSingleFile(currentTransactions);

  const sortedContracts = [...filesData].sort((a, b) => {
    const dateA = parseDateSafe(a.contractData.admissionDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const dateB = parseDateSafe(b.contractData.admissionDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  });

  const contractCards =
    hasMultipleFiles && activeTab === "all"
      ? sortedContracts
      : selectedFile
        ? [selectedFile]
        : filesData.length === 1
          ? [filesData[0]]
          : [];

  return (
    <div className="container">
      <h1>Extrato FGTS</h1>
      <input type="file" accept="application/pdf" multiple onChange={handleFileChange} />
      {loading && <p className="loading">Processando...</p>}

      {hasMultipleFiles && (
        <div className="tabs" role="tablist" aria-label="Visualizações de arquivos">
          <button
            type="button"
            className={`tab ${activeTab === "all" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            Todos os arquivos
          </button>
          {filesData.map((fileData) => (
            <button
              key={fileData.id}
              type="button"
              className={`tab ${activeTab === fileData.id ? "tab-active" : ""}`}
              onClick={() => setActiveTab(fileData.id)}
            >
              {fileData.contractData.employer}
            </button>
          ))}
        </div>
      )}

      {contractCards.length > 0 && (
        <div className="contracts-stack">
          {contractCards.map((fileData) => {
            const finalTotal =
              fileData.transactions.length > 0
                ? fileData.transactions[fileData.transactions.length - 1].balance
                : null;

            return (
              <section className="contract-card" key={fileData.id}>
                <h2>{fileData.contractData.employer}</h2>
                <div className="contract-grid">
                  <div className="contract-item">
                    <span>Data de admissão</span>
                    <strong>{fileData.contractData.admissionDate}</strong>
                  </div>
                  <div className="contract-item">
                    <span>Data de opção</span>
                    <strong>{fileData.contractData.optionDate}</strong>
                  </div>
                  <div className="contract-item">
                    <span>Data de afastamento</span>
                    <strong>{fileData.contractData.terminationDate}</strong>
                  </div>
                  <div className="contract-item">
                    <span>Taxa de juros anual</span>
                    <strong>{fileData.contractData.annualRate}</strong>
                  </div>
                  <div className="contract-item">
                    <span>Valor para fins recisórios</span>
                    <strong>{fileData.contractData.terminationValue}</strong>
                  </div>
                  <div className="contract-item contract-item-highlight">
                    <span>Valor total final</span>
                    <strong>{finalTotal === null ? "-" : formatBRL(finalTotal)}</strong>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
      {chartData.length > 0 && (
        <section className="chart-card">
          <h2>Evolução mensal {hasMultipleFiles && activeTab === "all" ? "(acumulado)" : ""}</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1f77ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1f77ff" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="jamGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalBalance"
                  name="Saldo"
                  stroke="#1f77ff"
                  fill="url(#totalGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="jamCredit"
                  name="Juros totais"
                  stroke="#16a34a"
                  fill="url(#jamGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
      {currentTransactions.length > 0 && (
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Lançamento</th>
              <th>Valor</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {displayedTransactions.map((t, i) => (
              <tr key={i}>
                <td>{t.date}</td>
                <td>
                  {t.employerInitials ? (
                    <>
                      <span className="employer-prefix" style={{ color: getEmployerColor(t.employerInitials) }}>
                        {t.employerInitials}
                      </span>
                      {" - "}
                      {t.description}
                    </>
                  ) : (
                    t.description
                  )}
                </td>
                <td className={t.value < 0 ? "negative" : "positive"}>{formatBRL(t.value)}</td>
                <td>{formatBRL(t.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;