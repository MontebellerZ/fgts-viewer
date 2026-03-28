import type { ContractData } from "../types";

function extractDateNear(text: string, labelPattern: RegExp): string {
  const match = text.match(labelPattern);
  if (!match || match.index === undefined) return "-";
  const chunk = text.slice(match.index, match.index + 160);
  const dateMatch = chunk.match(/\d{2}\/\d{2}\/\d{4}/);
  return dateMatch?.[0] ?? "-";
}

export function parseContractData(text: string): ContractData {
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
