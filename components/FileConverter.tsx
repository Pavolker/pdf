import React, { useState } from 'react';
import { ArrowRight, FileText, FileDown, Upload, Loader2 } from 'lucide-react';
import {
  convertTextToPdf,
  convertDocxToPdf,
  convertPdfToText,
  convertPdfToMarkdown,
  convertPdfToDocx,
  downloadConvertedFile
} from '../services/converterService';

type ConversionDirection = 'to-pdf' | 'from-pdf';
type OutputFormat = 'txt' | 'md' | 'docx';

const FileConverter: React.FC = () => {
  const [direction, setDirection] = useState<ConversionDirection>('to-pdf');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('txt');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Validate file type based on conversion direction
    if (direction === 'to-pdf') {
      if (!['txt', 'md', 'docx'].includes(extension || '')) {
        alert('Por favor, selecione um arquivo TXT, MD ou DOCX');
        return;
      }
    } else {
      if (extension !== 'pdf') {
        alert('Por favor, selecione um arquivo PDF');
        return;
      }
    }
    
    setSelectedFile(file);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);

    try {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      
      if (direction === 'to-pdf') {
        // Convert to PDF
        const extension = selectedFile.name.split('.').pop()?.toLowerCase();
        let pdfBytes: Uint8Array;

        if (extension === 'docx') {
          pdfBytes = await convertDocxToPdf(selectedFile);
        } else {
          pdfBytes = await convertTextToPdf(selectedFile);
        }

        downloadConvertedFile(pdfBytes, `${baseName}.pdf`);
      } else {
        // Convert from PDF
        if (outputFormat === 'txt') {
          const text = await convertPdfToText(selectedFile);
          downloadConvertedFile(text, `${baseName}.txt`);
        } else if (outputFormat === 'md') {
          const markdown = await convertPdfToMarkdown(selectedFile);
          downloadConvertedFile(markdown, `${baseName}.md`);
        } else if (outputFormat === 'docx') {
          const docxBlob = await convertPdfToDocx(selectedFile);
          downloadConvertedFile(docxBlob, `${baseName}.docx`);
        }
      }

      alert('Arquivo convertido com sucesso!');
      setSelectedFile(null);
    } catch (error) {
      console.error('Erro na conversão:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao converter arquivo.';
      alert(`Erro na conversão: ${errorMessage}\n\nDica: Verifique se o arquivo está corrompido ou contém caracteres especiais não suportados.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAcceptedFormats = () => {
    if (direction === 'to-pdf') {
      return '.txt,.md,.docx';
    }
    return '.pdf';
  };

  const getInputFormats = () => {
    if (direction === 'to-pdf') {
      return 'TXT, MD, DOCX';
    }
    return 'PDF';
  };

  const getOutputFormatText = () => {
    if (direction === 'to-pdf') {
      return 'PDF';
    }
    return outputFormat.toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Conversion Direction Selector */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Tipo de Conversão</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setDirection('to-pdf');
              setSelectedFile(null);
            }}
            className={`
              p-6 rounded-xl border-2 transition-all text-left
              ${direction === 'to-pdf'
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-slate-700" />
              <ArrowRight className="w-5 h-5 text-slate-400" />
              <FileDown className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Converter para PDF</h3>
            <p className="text-sm text-slate-500">TXT, MD, DOCX → PDF</p>
          </button>

          <button
            onClick={() => {
              setDirection('from-pdf');
              setSelectedFile(null);
            }}
            className={`
              p-6 rounded-xl border-2 transition-all text-left
              ${direction === 'from-pdf'
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-2">
              <FileDown className="w-6 h-6 text-rose-600" />
              <ArrowRight className="w-5 h-5 text-slate-400" />
              <FileText className="w-6 h-6 text-slate-700" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Converter de PDF</h3>
            <p className="text-sm text-slate-500">PDF → TXT, MD, DOCX</p>
          </button>
        </div>
      </div>

      {/* Output Format Selector (only for from-pdf) */}
      {direction === 'from-pdf' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Formato de Saída</h2>
          <div className="grid grid-cols-3 gap-3">
            {(['txt', 'md', 'docx'] as OutputFormat[]).map((format) => (
              <button
                key={format}
                onClick={() => setOutputFormat(format)}
                className={`
                  px-6 py-3 rounded-lg font-medium transition-all
                  ${outputFormat === format
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }
                `}
              >
                .{format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Selecionar Arquivo</h2>
        
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center transition-all
            ${dragActive
              ? 'border-slate-900 bg-slate-50'
              : 'border-slate-300 hover:border-slate-400'
            }
          `}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-700" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                Trocar arquivo
              </button>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-900 mb-2">
                Arraste e solte seu arquivo aqui
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Ou clique para selecionar ({getInputFormats()})
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  accept={getAcceptedFormats()}
                  onChange={handleFileInput}
                  className="hidden"
                />
                <span className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 cursor-pointer inline-block transition-all">
                  Selecionar Arquivo
                </span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Convert Button */}
      {selectedFile && (
        <div className="flex justify-center animate-fade-in">
          <button
            onClick={handleConvert}
            disabled={isProcessing}
            className={`
              px-8 py-4 rounded-xl font-semibold text-white transition-all shadow-lg flex items-center gap-3
              ${isProcessing
                ? 'bg-slate-400 cursor-wait'
                : 'bg-slate-900 hover:bg-slate-800 hover:shadow-xl active:scale-[0.98]'
              }
            `}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Convertendo...
              </>
              ) : (
              <>
                <ArrowRight className="w-5 h-5" />
                Converter para {getOutputFormatText()}
              </>
            )}
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2">ℹ️ Informações Importantes</h3>
        <ul className="text-sm text-slate-600 space-y-2">
          <li>• Todos os arquivos são processados localmente no seu navegador</li>
          <li>• Nenhum arquivo é enviado para servidores externos</li>
          <li>• A conversão de DOCX pode ter formatação simplificada</li>
          <li>• Arquivos PDF complexos podem perder formatação ao converter</li>
        </ul>
      </div>
    </div>
  );
};

export default FileConverter;
