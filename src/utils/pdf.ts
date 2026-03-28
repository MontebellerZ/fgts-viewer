import { extractText } from "unpdf";

export async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return text;
}
