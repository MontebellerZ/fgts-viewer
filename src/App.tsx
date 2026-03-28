import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { ContractCards } from "./components/ContractCards";
import { EvolutionChart } from "./components/EvolutionChart";
import { FileUpload } from "./components/FileUpload";
import { TransactionsTable } from "./components/TransactionsTable";
import { ViewTabs } from "./components/ViewTabs";
import type { FileViewData, TableTransaction } from "./types";
import { buildChartDataAllFiles, buildChartDataSingleFile } from "./utils/chart";
import { parseContractData } from "./utils/contract";
import { createFileId } from "./utils/id";
import { extractTextFromPdf } from "./utils/pdf";
import { loadStoredFilesData, saveStoredFilesData } from "./utils/storage";
import { parseTransactions } from "./utils/transactions";
import {
  ALL_TAB_ID,
  buildAllTransactions,
  buildTransactionsWithRunningBalance,
  findFileIdByEmployer,
  getContractCards,
  getCurrentTransactions,
  mergeFilesByEmployer,
  sortContractsByAdmissionDate,
} from "./utils/viewData";

function App() {
  const [filesData, setFilesData] = useState<FileViewData[]>(() => loadStoredFilesData());
  const [activeTab, setActiveTab] = useState(ALL_TAB_ID);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    saveStoredFilesData(filesData);
  }, [filesData]);

  useEffect(() => {
    if (filesData.length === 0) {
      if (activeTab !== ALL_TAB_ID) {
        setActiveTab(ALL_TAB_ID);
      }
      return;
    }

    const activeTabExists = filesData.some((fileData) => fileData.id === activeTab);
    if (activeTabExists || activeTab === ALL_TAB_ID) {
      return;
    }

    setActiveTab(filesData.length > 1 ? ALL_TAB_ID : filesData[0].id);
  }, [activeTab, filesData]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setLoading(true);
    try {
      const parsedFiles = await Promise.all(
        files.map(async (file, index) => {
          const text = await extractTextFromPdf(file);
          return {
            id: createFileId(file, index),
            fileName: file.name,
            contractData: parseContractData(text),
            transactions: parseTransactions(text),
          } satisfies FileViewData;
        })
      );

      const mergedFiles = mergeFilesByEmployer(filesData, parsedFiles);
      setFilesData(mergedFiles);

      if (parsedFiles.length === 1) {
        const uploadedFileId = findFileIdByEmployer(mergedFiles, parsedFiles[0].contractData.employer);
        setActiveTab(uploadedFileId ?? (mergedFiles.length > 1 ? ALL_TAB_ID : mergedFiles[0]?.id ?? ALL_TAB_ID));
      } else {
        setActiveTab(mergedFiles.length > 1 ? ALL_TAB_ID : mergedFiles[0]?.id ?? ALL_TAB_ID);
      }
    } catch (error) {
      console.error("Failed to extract text from pdf", error);
    } finally {
      setLoading(false);
    }
  }, [filesData]);

  const hasMultipleFiles = filesData.length > 1;
  const allTransactions = useMemo(() => buildAllTransactions(filesData), [filesData]);

  const selectedFile = useMemo(
    () => filesData.find((fileData) => fileData.id === activeTab) ?? null,
    [activeTab, filesData]
  );

  const currentTransactions: TableTransaction[] = useMemo(
    () => getCurrentTransactions({ activeTab, hasMultipleFiles, allTransactions, selectedFile, filesData }),
    [activeTab, allTransactions, filesData, hasMultipleFiles, selectedFile]
  );

  const displayedTransactions = useMemo(
    () => buildTransactionsWithRunningBalance(currentTransactions),
    [currentTransactions]
  );

  const chartData = useMemo(
    () => hasMultipleFiles && activeTab === ALL_TAB_ID
      ? buildChartDataAllFiles(filesData)
      : buildChartDataSingleFile(currentTransactions),
    [activeTab, currentTransactions, filesData, hasMultipleFiles]
  );

  const sortedContracts = useMemo(() => sortContractsByAdmissionDate(filesData), [filesData]);

  const contractCards = useMemo(
    () => getContractCards({ activeTab, hasMultipleFiles, sortedContracts, selectedFile, filesData }),
    [activeTab, filesData, hasMultipleFiles, selectedFile, sortedContracts]
  );

  return (
    <div className="container">
      <h1>Extrato FGTS</h1>
      <FileUpload onChange={handleFileChange} loading={loading} />

      <ViewTabs filesData={filesData} activeTab={activeTab} onTabChange={setActiveTab} />

      <ContractCards cards={contractCards} />

      <EvolutionChart
        chartData={chartData}
        showAccumulatedLabel={hasMultipleFiles && activeTab === ALL_TAB_ID}
      />

      <TransactionsTable transactions={displayedTransactions} />
    </div>
  );
}

export default App;