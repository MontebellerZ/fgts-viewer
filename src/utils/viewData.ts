import type { FileViewData, TableTransaction } from "../types";
import { parseDateSafe, sortTransactionsByDate } from "./date";
import { getEmployerInitials } from "./employer";

export const ALL_TAB_ID = "all";

function normalizeEmployerName(employer: string): string {
  return employer.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function findFileIdByEmployer(filesData: FileViewData[], employer: string): string | null {
  const normalizedTarget = normalizeEmployerName(employer);
  const match = filesData.find((fileData) => normalizeEmployerName(fileData.contractData.employer) === normalizedTarget);
  return match?.id ?? null;
}

export function mergeFilesByEmployer(existingFiles: FileViewData[], incomingFiles: FileViewData[]): FileViewData[] {
  const merged = [...existingFiles];

  for (const incomingFile of incomingFiles) {
    const normalizedIncomingEmployer = normalizeEmployerName(incomingFile.contractData.employer);
    const existingIndex = merged.findIndex(
      (storedFile) => normalizeEmployerName(storedFile.contractData.employer) === normalizedIncomingEmployer
    );

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...incomingFile,
        id: merged[existingIndex].id,
      };
      continue;
    }

    merged.push(incomingFile);
  }

  return merged;
}

export function buildAllTransactions(filesData: FileViewData[]): TableTransaction[] {
  return sortTransactionsByDate(
    filesData.flatMap((fileData) => {
      const employerInitials = getEmployerInitials(fileData.contractData.employer);
      return fileData.transactions.map((transaction) => ({
        ...transaction,
        employerInitials,
      }));
    })
  );
}

export function getCurrentTransactions(params: {
  activeTab: string;
  hasMultipleFiles: boolean;
  allTransactions: TableTransaction[];
  selectedFile: FileViewData | null;
  filesData: FileViewData[];
}): TableTransaction[] {
  const { activeTab, hasMultipleFiles, allTransactions, selectedFile, filesData } = params;

  if (hasMultipleFiles && activeTab === ALL_TAB_ID) {
    return allTransactions;
  }

  return selectedFile?.transactions ?? filesData[0]?.transactions ?? [];
}

export function buildTransactionsWithRunningBalance(transactions: TableTransaction[]): TableTransaction[] {
  const orderedTransactionsAsc = sortTransactionsByDate(transactions);

  const transactionsWithRunningBalance = orderedTransactionsAsc.reduce<TableTransaction[]>((acc, transaction) => {
    const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
    acc.push({
      ...transaction,
      balance: previousBalance + transaction.value,
    });
    return acc;
  }, []);

  return transactionsWithRunningBalance.reverse();
}

export function sortContractsByAdmissionDate(filesData: FileViewData[]): FileViewData[] {
  return [...filesData].sort((a, b) => {
    const dateA = parseDateSafe(a.contractData.admissionDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const dateB = parseDateSafe(b.contractData.admissionDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  });
}

export function getContractCards(params: {
  activeTab: string;
  hasMultipleFiles: boolean;
  sortedContracts: FileViewData[];
  selectedFile: FileViewData | null;
  filesData: FileViewData[];
}): FileViewData[] {
  const { activeTab, hasMultipleFiles, sortedContracts, selectedFile, filesData } = params;

  if (hasMultipleFiles && activeTab === ALL_TAB_ID) {
    return sortedContracts;
  }

  if (selectedFile) {
    return [selectedFile];
  }

  if (filesData.length === 1) {
    return [filesData[0]];
  }

  return [];
}
