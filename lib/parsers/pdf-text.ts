import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

if (typeof (globalThis as Record<string, unknown>).document === "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
}

export async function extractTextFromPdf(base64Content: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Content, "base64");
    const data = new Uint8Array(buffer);

    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: unknown) => {
          if (typeof item === "object" && item && "str" in item) {
            return (item as { str: string }).str;
          }
          return "";
        })
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.replace(/\s+/g, " ").trim();
  } catch (err) {
    console.error("extractTextFromPdf error:", err);
    return "";
  }
}
