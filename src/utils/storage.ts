import type { FileViewData } from "../types";

const FILES_DATA_STORAGE_KEY = "fgts-viewer/files-data";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadStoredFilesData(): FileViewData[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(FILES_DATA_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? (parsed as FileViewData[]) : [];
  } catch (error) {
    console.error("Failed to load files data from localStorage", error);
    return [];
  }
}

export function saveStoredFilesData(filesData: FileViewData[]): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(FILES_DATA_STORAGE_KEY, JSON.stringify(filesData));
  } catch (error) {
    console.error("Failed to save files data to localStorage", error);
  }
}
