import React from 'react';
import { Edit, X, PackageOpen, QrCode } from 'lucide-react';
import { cn } from '../lib/utils';
import { Product } from '../types';

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  onManageStock: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProductCard({ product, onManageStock, onEdit, onDelete }: ProductCardProps) {
  const isLowStock = product.stock < 5;
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col", 
      isLowStock && "border-red-200"
    )}>
      <div className="relative h-44 overflow-hidden bg-slate-100">
        <img src={product.image || undefined} alt={product.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        {isLowStock && <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded">ใกล้หมด</div>}
        <div className="absolute top-2 right-2 flex gap-2">
           <button onClick={onEdit} className="p-2 bg-white/90 rounded-full shadow hover:bg-accent hover:text-white transition-all"><Edit size={14} /></button>
           <button onClick={onDelete} className="p-2 bg-white/90 rounded-full shadow hover:bg-red-500 hover:text-white transition-all"><X size={14} /></button>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-black uppercase text-secondary bg-slate-100 px-1.5 py-0.5 rounded">{product.category}</span>
            {product.barcode && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-500">
                <QrCode size={9} className="shrink-0 text-slate-400" />
                {product.barcode}
              </span>
            )}
          </div>
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", isLowStock ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50")}>สต็อก: {product.stock}</span>
        </div>
        <h4 className="text-sm font-bold text-primary mb-1 line-clamp-1">{product.name}</h4>
        <p className="text-lg font-black text-accent mt-auto">฿{product.price.toLocaleString()}</p>
        <button 
          onClick={onManageStock} 
          className="mt-4 w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 font-mono"
        >
          <PackageOpen size={14} /> อัพเดทสต๊อก
        </button>
      </div>
    </div>
  );
}
