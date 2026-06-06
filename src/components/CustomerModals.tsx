import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer } from '../types';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (customer: Omit<Customer, 'id'>) => void;
  initialName?: string;
}

export function AddCustomerModal({ isOpen, onClose, onAdd, initialName = '' }: AddCustomerModalProps) {
  const [formData, setFormData] = useState({ name: initialName, phone: '', address: '', moo: '' });
  
  useEffect(() => { 
    if (isOpen) setFormData(prev => ({ ...prev, name: initialName })); 
  }, [isOpen, initialName]);

  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    onAdd(formData); 
    setFormData({ name: '', phone: '', address: '', moo: '' }); 
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-primary/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-primary mb-6">เพิ่มลูกค้าใหม่</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="ชื่อ-นามสกุล" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="เบอร์โทร" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                <input placeholder="หมู่ที่" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={formData.moo} onChange={e => setFormData({ ...formData, moo: e.target.value })} />
              </div>
              <textarea placeholder="ที่อยู่" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              <button className="w-full py-4 bg-accent text-white rounded-2xl font-black shadow-lg">บันทึกข้อมูลลูกค้า</button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface EditCustomerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSave: (customer: Customer) => void;
  onDelete?: () => void;
}

export function EditCustomerModal({ isOpen, customer, onClose, onSave, onDelete }: EditCustomerModalProps) {
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', moo: '' });
  
  useEffect(() => { 
    if (customer && isOpen) setFormData({ 
      name: customer.name || '', 
      phone: customer.phone || '', 
      address: customer.address || '', 
      moo: customer.moo || '' 
    }); 
  }, [customer, isOpen]);

  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (customer) onSave({ ...customer, ...formData }); 
  };

  if (!customer) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-primary/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-primary mb-6">แก้ไขข้อมูลลูกค้า</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="ชื่อ-นามสกุล" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="เบอร์โทร" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                <input placeholder="หมู่ที่" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={formData.moo} onChange={e => setFormData({ ...formData, moo: e.target.value })} />
              </div>
              <textarea placeholder="ที่อยู่" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              <button className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg">บันทึกการแก้ไข</button>
              
              {onDelete && (
                <button 
                  type="button"
                  onClick={onDelete}
                  className="w-full py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors mt-2"
                >
                  ลบข้อมูลลูกค้า
                </button>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
