import type { Transaction } from "../types";

const TRANSACTIONS_START_MARKER = "SALDO ANTERIOR";

const HISTORY_METADATA_REGEX = /Hist\S*\s+emitido\s+em:\s*\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2}\s+Para\s+uso\s+da\s+Caixa:\s*\d+/gi;
const HISTORY_HEADER_REGEX = /Hist\S*\s+de\s+Movimenta\S*\s+[A-Z0-9ÇÃÕÁÉÍÓÚ\s/-]+?\s+DATA\s+LAN\S*AMENTO\s+VALOR\s+TOTAL/gi;
const COLLAPSE_WHITESPACES_REGEX = /\s+/g;

const TRANSACTION_LINE_REGEX = /(\d{2}\/\d{2}\/\d{4})\s+((?:(?!\d{2}\/\d{2}\/\d{4})[\s\S])*?)\s+R\$\s*(-?\s*[\d.,]+)\s+R\$\s*([\d.,]+)/g;

function getTransactionsBody(text: string): string {
  const startIndex = text.indexOf(TRANSACTIONS_START_MARKER);
  return startIndex !== -1 ? text.slice(startIndex) : text;
}

function sanitizeTransactionsBody(body: string): string {
  return body
    .replace(HISTORY_METADATA_REGEX, " ")
    .replace(HISTORY_HEADER_REGEX, " ")
    .replace(COLLAPSE_WHITESPACES_REGEX, " ")
    .trim();
}

function parseAmount(raw: string): number {
  const negative = raw.trimStart().startsWith("-");
  const cleaned = raw.replace(/-/g, "").replace(/\./g, "").replace(",", ".").trim();
  return (parseFloat(cleaned) || 0) * (negative ? -1 : 1);
}

export function parseTransactions(text: string): Transaction[] {
  const body = getTransactionsBody(text);
  const sanitized = sanitizeTransactionsBody(body);

  const results: Transaction[] = [];
  let match: RegExpExecArray | null;
  while ((match = TRANSACTION_LINE_REGEX.exec(sanitized)) !== null) {
    results.push({
      date: match[1],
      description: match[2].trim(),
      value: parseAmount(match[3]),
      balance: parseAmount(match[4]),
    });
  }
  return results;
}
