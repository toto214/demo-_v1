import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PackageCheck, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Order } from '../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export function ReceiptModal({ isOpen, onClose, order }: ReceiptModalProps) {
  if (!order) return null;
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }} 
            className="relative bg-white w-full max-w-sm rounded-[30px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="text-center mb-6">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", 
                order.status === 'Paid' ? "bg-emerald-100" : "bg-red-100"
              )}>
                {order.status === 'Paid' ? <PackageCheck className="text-emerald-600" size={32} /> : <X className="text-red-500" size={32} />}
              </div>
              <h3 className="text-xl font-black text-primary">
                {order.status === 'Paid' ? 'ชำระเงินสำเร็จ' : 'ค้างชำระ'}
              </h3>
            </div>
            <div className="border-t-2 border-dashed border-slate-100 pt-6 space-y-4 font-mono text-[11px]">
              <div className="flex justify-between"><span>บิลเลขที่:</span><span className="font-bold">{order.id}</span></div>
              <div className="flex justify-between"><span>วันที่:</span><span className="font-bold">{order.date}</span></div>
              <div className="flex justify-between"><span>ลูกค้า:</span><span className="font-bold">{order.customer.name}</span></div>
              {order.customer.moo && <div className="flex justify-between"><span>หมู่ที่:</span><span className="font-bold">{order.customer.moo}</span></div>}
              <div className="flex justify-between"><span>ผู้ขาย:</span><span className="font-bold">{order.seller_name || 'เจ้าของร้าน'}</span></div>
              <div className="border-y border-slate-100 py-3 space-y-2">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>{it.product.name} x {it.quantity}</span>
                    <span>฿{(it.product.price * it.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-lg font-black text-accent pt-2">
                <span>รวมสุทธิ:</span>
                <span>฿{order.total.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-8 flex gap-3 no-print">
              <button 
                onClick={() => window.print()} 
                className="flex-1 py-3 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                พิมพ์
              </button>
              <button 
                onClick={onClose} 
                className="flex-1 py-3 bg-primary text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"
              >
                เสร็จสิ้น
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
