import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, ArrowDown, Trash2, GripVertical, Download, FolderInput, FileEdit } from 'lucide-react';
import { mergePdfs, downloadBlob, getSaveFileHandle, writePdfToHandle, supportsFileSystem } from '../services/pdfService';

interface PdfFile {
  id: string;
  file: File;
  pageCount?: number;
}

const PdfMerger: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [outputFilename, setOutputFilename] = useState('documento_mesclado');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newFiles: PdfFile[] = Array.from(files)
      .filter(file => file.type === 'application/pdf')
      .map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
      }));
    
    setPdfFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeFile = (id: string) => {
    setPdfFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newFiles = [...pdfFiles];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);
    
    setPdfFiles(newFiles);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const openSaveModal = () => {
    if (pdfFiles.length < 2) return;
    setShowSaveModal(true);
  };

  const handleMerge = async () => {
    if (pdfFiles.length < 2) return;

    setShowSaveModal(false);

    let fileHandle: any = null;
    const canUseFileSystem = supportsFileSystem();

    if (canUseFileSystem) {
      try {
        fileHandle = await getSaveFileHandle(outputFilename);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return;
        }
        console.warn("Failed to get file handle, falling back to download", error);
      }
    }

    setIsProcessing(true);

    try {
      const mergedPdfBytes = await mergePdfs(pdfFiles.map(f => f.file));

      if (fileHandle) {
        await writePdfToHandle(fileHandle, mergedPdfBytes);
      } else {
        downloadBlob(mergedPdfBytes, outputFilename);
      }

      // Reset after successful merge
      setPdfFiles([]);
      setOutputFilename('documento_mesclado');
    } catch (error) {
      console.error("Error merging PDFs", error);
      alert("Erro ao mesclar os arquivos PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          Mesclar Arquivos PDF
        </h2>
        <p className="text-slate-500 leading-relaxed">
          Adicione dois ou mais arquivos PDF e combine-os em um único documento. Arraste para reordenar.
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer"
      >
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="pdf-upload"
        />
        <label htmlFor="pdf-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 rounded-full bg-slate-100">
              <Upload className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-800">
                Adicione arquivos PDF
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Arraste arquivos aqui ou clique para selecionar
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* File List */}
      {pdfFiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-900">
              Arquivos ({pdfFiles.length})
            </h3>
            <button
              onClick={() => setPdfFiles([])}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Limpar todos
            </button>
          </div>

          <div className="space-y-2">
            {pdfFiles.map((pdfFile, index) => (
              <div
                key={pdfFile.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-move
                  ${draggedIndex === index ? 'border-blue-400 bg-blue-50 opacity-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}
                `}
              >
                <GripVertical className="w-5 h-5 text-slate-400" />
                <div className="p-2 bg-rose-100 rounded-lg">
                  <FileText className="w-5 h-5 text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {pdfFile.file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(pdfFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">#{index + 1}</span>
                  <button
                    onClick={() => removeFile(pdfFile.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pdfFiles.length > 1 && (
            <div className="mt-6 flex justify-center">
              <ArrowDown className="w-6 h-6 text-slate-400 animate-bounce" />
            </div>
          )}
        </div>
      )}

      {/* Merge Button */}
      {pdfFiles.length >= 2 && (
        <div className="flex justify-center">
          <button
            onClick={openSaveModal}
            disabled={isProcessing}
            className={`
              flex items-center gap-3 px-8 py-4 rounded-full shadow-xl font-semibold text-white transition-all transform hover:-translate-y-1
              ${isProcessing ? 'bg-slate-800 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}
            `}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Mesclando...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>Mesclar {pdfFiles.length} arquivos</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl scale-100 animate-scale-in">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Mesclar PDFs</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Combinar {pdfFiles.length} arquivos em um único PDF
                </p>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome do arquivo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileEdit className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 font-medium"
                  placeholder="Nome do arquivo"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none">.pdf</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-3.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleMerge}
                disabled={!outputFilename.trim()}
                className="flex-[1.5] px-4 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98] flex items-center justify-center"
              >
                {supportsFileSystem() ? (
                  <>
                    <FolderInput className="w-4 h-4 mr-2" />
                    Escolher local e Salvar
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Arquivo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfMerger;
