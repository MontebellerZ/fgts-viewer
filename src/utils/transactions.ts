import type { Transaction } from "../types";

function parseAmount(raw: string): number {
  const negative = raw.trimStart().startsWith("-");
  const cleaned = raw.replace(/-/g, "").replace(/\./g, "").replace(",", ".").trim();
  return (parseFloat(cleaned) || 0) * (negative ? -1 : 1);
}

export function parseTransactions(text: string): Transaction[] {
  const startIndex = text.indexOf("SALDO ANTERIOR");
  const body = startIndex !== -1 ? text.slice(startIndex) : text;

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
