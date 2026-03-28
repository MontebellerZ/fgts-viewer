export function createFileId(file: File, index: number): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${index}-${file.name}`;
}
