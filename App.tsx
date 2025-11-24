import React, { useState, useCallback, useEffect } from 'react';
import { Trash2, Download, RefreshCw, X, FileEdit, FolderInput } from 'lucide-react';
import FileUpload from './components/FileUpload';
import PageGrid from './components/PageGrid';
import {
  generateThumbnails,
  removePagesAndSave,
  downloadBlob,
  getSaveFileHandle,
  writePdfToHandle,
  supportsFileSystem,
  PageThumbnail
} from './services/pdfService';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [outputFilename, setOutputFilename] = useState('');

  const handleFileSelect = useCallback(async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setLoadingProgress(0);
    // Pre-fill filename: remove extension and add suffix
    const baseName = uploadedFile.name.replace(/\.pdf$/i, '');
    setOutputFilename(`${baseName}_editado`);

    try {
      const thumbs = await generateThumbnails(uploadedFile, (current, total) => {
        setLoadingProgress(Math.round((current / total) * 100));
      });
      setThumbnails(thumbs);
    } catch (error) {
      console.error("Error generating thumbnails", error);
      alert("Erro ao ler o arquivo PDF. O arquivo pode estar corrompido ou protegido por senha.");
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const togglePageSelection = useCallback((index: number, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);

      setSelectedIndices(prev => {
        const newSet = new Set(prev);
        for (let i = start; i <= end; i++) {
          newSet.add(i);
        }
        return newSet;
      });
    } else {
      setSelectedIndices(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
      setLastSelectedIndex(index);
    }
  }, [lastSelectedIndex]);

  const openSaveModal = () => {
    if (!file || selectedIndices.size === 0) return;
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!file) return;

    // Close modal first
    setShowSaveModal(false);

    let fileHandle: any = null;
    const canUseFileSystem = supportsFileSystem();

    // 1. If supported, ask for location IMMEDIATELY (needs user activation)
    if (canUseFileSystem) {
      try {
        fileHandle = await getSaveFileHandle(outputFilename);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          // User cancelled the picker, stop everything
          return;
        }
        // Other errors, fall through to blob download
        console.warn("Failed to get file handle, falling back to download", error);
      }
    }

    // 2. Start processing
    setIsProcessing(true);

    try {
      const newPdfBytes = await removePagesAndSave(file, Array.from(selectedIndices));

      if (fileHandle) {
        await writePdfToHandle(fileHandle, newPdfBytes);
      } else {
        downloadBlob(newPdfBytes, outputFilename);
      }
    } catch (error) {
      console.error("Error saving PDF", error);
      alert("Erro ao salvar o novo PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetApp = () => {
    setFile(null);
    setThumbnails([]);
    setSelectedIndices(new Set());
    setLastSelectedIndex(null);
    setLoadingProgress(0);
    setShowSaveModal(false);
    setOutputFilename('');
  };

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-center relative">
          <div className="flex items-center gap-4">
            <img src="/centauro.jpg" alt="Logo Centauro" className="h-12 object-contain" />
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Ferramenta de Gestão de PDF - MDH</h1>
            <img src="/original-maior-.gif" alt="Logo Original" className="h-12 object-contain" />
          </div>

          {file && !isProcessing && (
            <div className="absolute right-4">
              <button
                onClick={resetApp}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Recomeçar
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!file ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="text-center mb-10 max-w-lg">
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
                Remova páginas do seu PDF
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                Simples, rápido e direto no seu navegador. Seus arquivos não são enviados para nenhum servidor.
              </p>
            </div>
            <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />

            {isProcessing && loadingProgress > 0 && (
              <div className="mt-8 w-64">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Carregando páginas...</span>
                  <span>{loadingProgress}%</span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-medium text-slate-900 truncate max-w-md" title={file.name}>
                  {file.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {thumbnails.length} páginas • {selectedIndices.size} selecionadas para remoção
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedIndices(new Set())}
                  disabled={selectedIndices.size === 0}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="bg-slate-100/50 rounded-2xl p-6 min-h-[500px]">
              {thumbnails.length > 0 ? (
                <PageGrid
                  thumbnails={thumbnails}
                  selectedIndices={selectedIndices}
                  onTogglePage={togglePageSelection}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl scale-100 animate-scale-in">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Salvar Arquivo</h3>
                <p className="text-slate-500 text-sm mt-1">Defina o nome e o local para salvar.</p>
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
                  <FileEdit className="h-5 w-5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-800 placeholder-slate-400 font-medium"
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
                onClick={handleConfirmSave}
                disabled={!outputFilename.trim()}
                className="flex-[1.5] px-4 py-3.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 active:scale-[0.98] flex items-center justify-center"
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

      {/* Floating Action Bar */}
      {file && selectedIndices.size > 0 && !showSaveModal && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
          <button
            onClick={openSaveModal}
            disabled={isProcessing}
            className={`
              flex items-center space-x-3 px-8 py-4 rounded-full shadow-2xl font-semibold text-white transition-all transform hover:-translate-y-1 active:translate-y-0
              ${isProcessing ? 'bg-slate-800 cursor-wait' : 'bg-slate-900 hover:bg-slate-800 hover:shadow-rose-900/20'}
            `}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <div className="relative">
                  <Trash2 className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 bg-rose-500 text-[10px] w-4 h-4 flex items-center justify-center rounded-full border border-slate-900">
                    {selectedIndices.size}
                  </span>
                </div>
                <span>Continuar</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default App;