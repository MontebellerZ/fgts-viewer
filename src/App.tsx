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
  jamCredit: number;
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

function parseDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function buildChartData(transactions: Transaction[]): ChartPoint[] {
  const monthlyMap = new Map<string, ChartPoint>();

  for (const transaction of transactions) {
    const date = parseDate(transaction.date);
    if (Number.isNaN(date.getTime())) continue;

    const month = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
    const current = monthlyMap.get(month) ?? {
      month,
      totalBalance: transaction.balance,
      jamCredit: 0,
    };

    current.totalBalance = transaction.balance;

    if (/^CREDITO\s+DE\s+JAM\b/i.test(transaction.description) && transaction.value > 0) {
      current.jamCredit += transaction.value;
    }

    monthlyMap.set(month, current);
  }

  const sorted = Array.from(monthlyMap.values()).sort((a, b) => {
    const [monthA, yearA] = a.month.split("/").map(Number);
    const [monthB, yearB] = b.month.split("/").map(Number);
    return new Date(yearA, monthA - 1, 1).getTime() - new Date(yearB, monthB - 1, 1).getTime();
  });

  let jamAccumulated = 0;
  for (const point of sorted) {
    jamAccumulated += point.jamCredit;
    point.jamCredit = jamAccumulated;
  }

  return sorted;
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await extractTextFromPdf(file);
      setContractData(parseContractData(text));
      setTransactions(parseTransactions(text));
    } catch (error) {
      console.error("Failed to extract text from pdf", error);
    } finally {
      setLoading(false);
    }
  }

  const displayedTransactions = [...transactions].reverse();
  const finalTotalValue = transactions.length > 0 ? transactions[transactions.length - 1].balance : null;
  const chartData = buildChartData(transactions);

  return (
    <div className="container">
      <h1>Extrato FGTS</h1>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {loading && <p className="loading">Processando...</p>}
      {contractData && (
        <section className="contract-card">
          <h2>{contractData.employer}</h2>
          <div className="contract-grid">
            <div className="contract-item">
              <span>Data de admissão</span>
              <strong>{contractData.admissionDate}</strong>
            </div>
            <div className="contract-item">
              <span>Data de opção</span>
              <strong>{contractData.optionDate}</strong>
            </div>
            <div className="contract-item">
              <span>Data de afastamento</span>
              <strong>{contractData.terminationDate}</strong>
            </div>
            <div className="contract-item">
              <span>Taxa de juros anual</span>
              <strong>{contractData.annualRate}</strong>
            </div>
            <div className="contract-item">
              <span>Valor para fins recisórios</span>
              <strong>{contractData.terminationValue}</strong>
            </div>
            <div className="contract-item contract-item-highlight">
              <span>Valor total final</span>
              <strong>{finalTotalValue === null ? "-" : formatBRL(finalTotalValue)}</strong>
            </div>
          </div>
        </section>
      )}
      {chartData.length > 0 && (
        <section className="chart-card">
          <h2>Evolução mensal</h2>
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
                <Tooltip formatter={(value) => formatBRL(Number(value))} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalBalance"
                  name="Saldo total"
                  stroke="#1f77ff"
                  fill="url(#totalGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="jamCredit"
                  name="Crédito de JAM (acumulado)"
                  stroke="#16a34a"
                  fill="url(#jamGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
      {transactions.length > 0 && (
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
                <td>{t.description}</td>
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