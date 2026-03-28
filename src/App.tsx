import { useState } from "react";
import "./App.css";
import { ContractCards } from "./components/ContractCards";
import { EvolutionChart } from "./components/EvolutionChart";
import { FileUpload } from "./components/FileUpload";
import { TransactionsTable } from "./components/TransactionsTable";
import { ViewTabs } from "./components/ViewTabs";
import type { FileViewData, TableTransaction } from "./types";
import { buildChartDataAllFiles, buildChartDataSingleFile } from "./utils/chart";
import { parseContractData } from "./utils/contract";
import { parseDateSafe, sortTransactionsByDate } from "./utils/date";
import { getEmployerColor, getEmployerInitials } from "./utils/employer";
import { formatBRL } from "./utils/format";
import { extractTextFromPdf } from "./utils/pdf";
import { parseTransactions } from "./utils/transactions";

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
            transactions: parseTransactions(text),
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
  );

  const selectedFile = filesData.find((fileData) => fileData.id === activeTab) ?? null;
  const currentTransactions: TableTransaction[] =
    hasMultipleFiles && activeTab === "all"
      ? allTransactions
      : selectedFile?.transactions ?? filesData[0]?.transactions ?? [];

  // Ordena em ordem crescente para calcular o saldo acumulado corretamente.
  const orderedTransactionsAsc = sortTransactionsByDate(currentTransactions);

  const tableTransactions: TableTransaction[] = orderedTransactionsAsc.reduce<TableTransaction[]>((acc, transaction) => {
    const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
    acc.push({
      ...transaction,
      balance: previousBalance + transaction.value,
    });
    return acc;
  }, []);

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
      <FileUpload onChange={handleFileChange} loading={loading} />

      <ViewTabs filesData={filesData} activeTab={activeTab} onTabChange={setActiveTab} />

      <ContractCards cards={contractCards} formatBRL={formatBRL} />

      <EvolutionChart
        chartData={chartData}
        showAccumulatedLabel={hasMultipleFiles && activeTab === "all"}
        formatBRL={formatBRL}
      />

      <TransactionsTable
        transactions={displayedTransactions}
        formatBRL={formatBRL}
        getEmployerColor={getEmployerColor}
      />
    </div>
  );
}

export default App;