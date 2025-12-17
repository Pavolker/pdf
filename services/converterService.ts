import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Convert TXT/MD to PDF
 */
export async function convertTextToPdf(file: File): Promise<Uint8Array> {
  try {
    const text = await file.text();
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const lineHeight = fontSize * 1.5;
    const margin = 50;
    
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const maxWidth = width - 2 * margin;
    
    let yPosition = height - margin;
    
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Handle empty lines
      if (!line.trim()) {
        yPosition -= lineHeight;
        if (yPosition < margin) {
          page = pdfDoc.addPage();
          yPosition = height - margin;
        }
        continue;
      }
      
      // Remove special characters that might cause issues
      const cleanLine = line.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
      
      // Simple word wrapping
      const words = cleanLine.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        
        try {
          const textWidth = font.widthOfTextAtSize(testLine, fontSize);
          
          if (textWidth > maxWidth && currentLine) {
            // Draw current line and start new one
            if (yPosition < margin) {
              page = pdfDoc.addPage();
              yPosition = height - margin;
            }
            
            page.drawText(currentLine, {
              x: margin,
              y: yPosition,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
            
            yPosition -= lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        } catch (err) {
          // Skip problematic characters
          console.warn('Skipping word with unsupported characters:', word);
          continue;
        }
      }
      
      // Draw remaining text
      if (currentLine) {
        if (yPosition < margin) {
          page = pdfDoc.addPage();
          yPosition = height - margin;
        }
        
        try {
          page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
        } catch (err) {
          console.warn('Error drawing text:', currentLine);
        }
        
        yPosition -= lineHeight;
      }
    }
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error in convertTextToPdf:', error);
    throw new Error('Falha ao converter texto para PDF. Verifique se o arquivo contém caracteres válidos.');
  }
}

/**
 * Convert DOCX to PDF (simplified - extracts text content)
 * Note: Full DOCX parsing requires additional libraries
 */
export async function convertDocxToPdf(file: File): Promise<Uint8Array> {
  // For simplicity, we'll extract text from DOCX using a basic approach
  // In production, consider using mammoth.js or similar libraries
  
  const arrayBuffer = await file.arrayBuffer();
  const text = await extractTextFromDocx(arrayBuffer);
  
  // Create a temporary text file to use the text-to-pdf converter
  const textBlob = new Blob([text], { type: 'text/plain' });
  const textFile = new File([textBlob], 'temp.txt', { type: 'text/plain' });
  
  return await convertTextToPdf(textFile);
}

/**
 * Basic DOCX text extraction
 */
async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Simple XML parsing approach for DOCX
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    
    // DOCX files contain XML - extract text between <w:t> tags
    const matches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const extractedText = matches
      .map(match => {
        const content = match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '');
        return content;
      })
      .join(' ');
    
    return extractedText || 'Unable to extract text from DOCX file. Please use a TXT or MD file instead.';
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    return 'Error reading DOCX file. Please convert to TXT or MD format first.';
  }
}

/**
 * Convert PDF to TXT
 */
export async function convertPdfToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    fullText += pageText + '\n\n';
  }
  
  return fullText;
}

/**
 * Convert PDF to MD (Markdown)
 */
export async function convertPdfToMarkdown(file: File): Promise<string> {
  const text = await convertPdfToText(file);
  
  // Basic formatting as markdown
  const lines = text.split('\n');
  let markdown = `# Converted from ${file.name}\n\n`;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed) {
      // Detect potential headings (all caps, short lines)
      if (trimmed === trimmed.toUpperCase() && trimmed.length < 50 && trimmed.length > 3) {
        markdown += `## ${trimmed}\n\n`;
      } else {
        markdown += `${trimmed}\n\n`;
      }
    }
  });
  
  return markdown;
}

/**
 * Convert PDF to DOCX (simplified - creates text-based DOCX)
 */
export async function convertPdfToDocx(file: File): Promise<Blob> {
  const text = await convertPdfToText(file);
  
  // Create a minimal DOCX structure
  const docxContent = createMinimalDocx(text);
  
  return new Blob([docxContent], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
}

/**
 * Create minimal DOCX file structure
 */
function createMinimalDocx(text: string): string {
  const paragraphs = text.split('\n').map(line => {
    const escapedLine = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    return `<w:p><w:r><w:t>${escapedLine}</w:t></w:r></w:p>`;
  }).join('');
  
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
  </w:body>
</w:document>`;
}

/**
 * Download converted file
 */
export function downloadConvertedFile(data: Uint8Array | string | Blob, filename: string) {
  let blob: Blob;
  
  if (data instanceof Blob) {
    blob = data;
  } else if (typeof data === 'string') {
    blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
  } else {
    blob = new Blob([data], { type: 'application/pdf' });
  }
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
