import type { FileViewData } from "../../types";
import "./index.css";

interface ViewTabsProps {
  filesData: FileViewData[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function ViewTabs({ filesData, activeTab, onTabChange }: ViewTabsProps) {
  if (filesData.length <= 1) return null;

  return (
    <div className="tabs" role="tablist" aria-label="Visualizacoes de arquivos">
      <button
        type="button"
        className={`tab ${activeTab === "all" ? "tab-active" : ""}`}
        onClick={() => onTabChange("all")}
      >
        Todos os arquivos
      </button>
      {filesData.map((fileData) => (
        <button
          key={fileData.id}
          type="button"
          className={`tab ${activeTab === fileData.id ? "tab-active" : ""}`}
          onClick={() => onTabChange(fileData.id)}
        >
          {fileData.contractData.employer}
        </button>
      ))}
    </div>
  );
}
