import React from 'react';
import { Check, Trash2, FileOutput } from 'lucide-react';
import type { PageThumbnail } from '../services/pdfService';

interface PageGridProps {
  thumbnails: PageThumbnail[];
  selectedIndices: Set<number>;
  onTogglePage: (index: number, event: React.MouseEvent) => void;
  mode?: 'select' | 'remove' | 'extract';
}

const PageGrid: React.FC<PageGridProps> = ({ thumbnails, selectedIndices, onTogglePage, mode = 'select' }) => {
  return (
    <div className="w-full animate-fade-in-up">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {thumbnails.map((page) => {
          const isSelected = selectedIndices.has(page.index);

          return (
            <div
              key={page.index}
              onClick={(e) => onTogglePage(page.index, e)}
              className={`
                group relative aspect-[3/4] rounded-lg shadow-sm cursor-pointer transition-all duration-200
                hover:shadow-md
                ${isSelected ? 'ring-2 ring-rose-500 ring-offset-2 scale-[0.98]' : 'hover:-translate-y-1 bg-white'}
              `}
            >
              {/* Image */}
              <img
                src={page.url}
                alt={`Página ${page.index + 1}`}
                className={`
                  w-full h-full object-contain rounded-lg bg-white
                  ${isSelected ? 'opacity-40 grayscale' : ''}
                `}
              />

              {/* Page Number Badge */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                Pg {page.index + 1}
              </div>

              {/* Selection Overlay */}
              <div className={`
                absolute inset-0 flex items-center justify-center rounded-lg transition-all
                ${isSelected ? 'bg-rose-50/10' : 'opacity-0 group-hover:opacity-100 bg-slate-900/5'}
              `}>
                {isSelected ? (
                  <div className="w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg transform scale-100 transition-transform">
                    <Trash2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-white/90 text-slate-700 rounded-full flex items-center justify-center shadow-sm">
                    <Check className="w-6 h-6" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PageGrid;