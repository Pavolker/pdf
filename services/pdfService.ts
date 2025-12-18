import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the worker for PDF.js (use local bundler URL to avoid CORS/module issues)
GlobalWorkerOptions.workerSrc = workerSrc;

export interface PageThumbnail {
  index: number;
  url: string;
  width: number;
  height: number;
}

export const generateThumbnails = async (
  file: File,
  onProgress: (current: number, total: number) => void
): Promise<PageThumbnail[]> => {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = getDocument({ data: arrayBuffer });
  
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const thumbnails: PageThumbnail[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    
    // Scale for thumbnail quality
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    thumbnails.push({
      index: i - 1, // 0-based index for internal logic
      url: canvas.toDataURL('image/jpeg', 0.8),
      width: viewport.width,
      height: viewport.height,
    });

    onProgress(i, totalPages);
  }

  return thumbnails;
};

export const removePagesAndSave = async (originalFile: File, pageIndicesToRemove: number[]): Promise<Uint8Array> => {
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  const sortedIndices = [...pageIndicesToRemove].sort((a, b) => b - a);
  
  for (const idx of sortedIndices) {
    pdfDoc.removePage(idx);
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

export const extractPagesAndSave = async (originalFile: File, pageIndicesToExtract: number[]): Promise<Uint8Array> => {
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  // Create a new PDF document
  const newPdfDoc = await PDFDocument.create();
  
  // Sort indices to maintain page order
  const sortedIndices = [...pageIndicesToExtract].sort((a, b) => a - b);
  
  // Copy selected pages to new document
  for (const idx of sortedIndices) {
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [idx]);
    newPdfDoc.addPage(copiedPage);
  }

  const pdfBytes = await newPdfDoc.save();
  return pdfBytes;
};

export const downloadBlob = (data: Uint8Array, filename: string) => {
  const fullFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fullFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// Check if File System Access API is supported
export const supportsFileSystem = (): boolean => {
  return 'showSaveFilePicker' in window;
};

// Step 1: Get the file handle (Must be called immediately on user click)
export const getSaveFileHandle = async (filename: string): Promise<any | null> => {
  if (!supportsFileSystem()) return null;

  const fullFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  
  try {
    // @ts-ignore
    const handle = await window.showSaveFilePicker({
      suggestedName: fullFilename,
      types: [{
        description: 'PDF Document',
        accept: { 'application/pdf': ['.pdf'] },
      }],
    });
    return handle;
  } catch (err: any) {
    if (err.name === 'AbortError') throw err; // Re-throw abort to handle cancellation
    console.warn("File System API error", err);
    return null;
  }
};

// Step 2: Write data to the handle
export const writePdfToHandle = async (handle: any, data: Uint8Array) => {
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
};

// Merge multiple PDF files into one
export const mergePdfs = async (files: File[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  const pdfBytes = await mergedPdf.save();
  return pdfBytes;
};