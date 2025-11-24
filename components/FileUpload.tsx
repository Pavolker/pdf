import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  }, [isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateAndProcess = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Por favor, envie apenas arquivos PDF.');
      return;
    }
    setError(null);
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  }, [onFileSelect, isProcessing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcess(e.target.files[0]);
    }
    // Reset value to allow selecting the same file again if needed
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-20">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ease-out
          ${isDragging 
            ? 'border-rose-500 bg-rose-50/50 scale-[1.02] shadow-xl' 
            : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-rose-100' : 'bg-slate-100'} transition-colors`}>
            {isProcessing ? (
               <div className="w-8 h-8 border-2 border-slate-300 border-t-rose-500 rounded-full animate-spin" />
            ) : (
              <Upload className={`w-8 h-8 ${isDragging ? 'text-rose-600' : 'text-slate-600'}`} />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-medium text-slate-800">
              {isProcessing ? 'Processando Documento...' : 'Arraste seu PDF aqui'}
            </h3>
            <p className="text-slate-500 text-sm">
              Ou clique para selecionar um arquivo
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-center justify-center text-rose-600 bg-rose-50 p-3 rounded-lg text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}
      
      <div className="mt-12 flex flex-col items-center text-slate-400 text-xs">
        <div className="flex items-center space-x-2 mb-2">
          <FileText className="w-4 h-4" />
          <span>Processamento 100% seguro no navegador</span>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;