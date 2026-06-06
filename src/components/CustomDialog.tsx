import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, HelpCircle, XCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface CustomDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'error' | 'success';
  onClose: () => void;
  onConfirm?: () => void;
}

export function CustomDialog({
  isOpen,
  title,
  message,
  type,
  onClose,
  onConfirm
}: CustomDialogProps) {
  if (!isOpen) return null;

  const IconMap = {
    confirm: <HelpCircle className="text-orange-500 w-12 h-12" />,
    alert: <AlertCircle className="text-amber-500 w-12 h-12" />,
    error: <XCircle className="text-red-500 w-12 h-12" />,
    success: <CheckCircle2 className="text-emerald-500 w-12 h-12" />
  };

  const currentIcon = IconMap[type] || IconMap.alert;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div className="p-3 bg-slate-50 rounded-2xl">
            {currentIcon}
          </div>

          {/* Text Content */}
          <div className="space-y-1">
            <h3 className="text-lg font-black text-primary">{title}</h3>
            <p className="text-xs text-secondary leading-relaxed whitespace-pre-line">{message}</p>
          </div>

          {/* Action Buttons */}
          <div className="w-full pt-2 flex gap-3">
            {type === 'confirm' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-secondary rounded-xl font-bold text-xs transition-all active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-accent/20 active:scale-95"
                >
                  ยืนยัน
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "w-full py-3 text-white rounded-xl font-black text-xs transition-all active:scale-95 shadow-lg",
                  type === 'success' ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100" :
                  type === 'error' ? "bg-red-500 hover:bg-red-600 shadow-red-100" :
                  "bg-primary hover:bg-primary/95 shadow-slate-100"
                )}
              >
                ตกลง
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
