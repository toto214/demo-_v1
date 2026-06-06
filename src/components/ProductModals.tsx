import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Product, StockHistory, Category } from '../types';

const compressAndGetBase64 = (file: File, maxW = 400, maxH = 400): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
        } else {
          if (height > maxH) {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.7);
          resolve(compressed);
        } else {
          resolve(e.target?.result as string || "");
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: (product: Product) => void;
  onDelete: () => void;
  categories: Category[];
}

export function EditProductModal({ isOpen, onClose, product, onEdit, onDelete, categories }: EditProductModalProps) {
  const [formData, setFormData] = useState({ name: '', category: '', price: '', stock: '', image: '', barcode: '' });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { 
    if (product) setFormData({ 
      name: product.name, 
      category: product.category, 
      price: product.price.toString(), 
      stock: product.stock.toString(), 
      image: product.image || '',
      barcode: product.barcode || ''
    }); 
  }, [product]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    
    // Convert to client-side compressed base64 first to guarantee it always succeeds
    let base64Fallback = '';
    try {
      base64Fallback = await compressAndGetBase64(file);
    } catch (err) {
      console.warn('Compression failed:', err);
    }

    const fd = new FormData(); 
    fd.append('image', file); 

    try { 
      const res = await fetch('/api/upload', { method: 'POST', body: fd }); 
      if (res.ok) { 
        const data = await res.json(); 
        setFormData(prev => ({ ...prev, image: data.imageUrl })); 
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn(`Server upload error, using local base64 fallback. Server says: ${errData.error || res.statusText}`);
        if (base64Fallback) {
          setFormData(prev => ({ ...prev, image: base64Fallback }));
        } else {
          alert(`เกิดข้อผิดพลาดในการอัพโหลด: ${errData.error || res.statusText}`);
        }
      }
    } catch (error: any) {
      console.warn('Server upload connection failed, using local base64 fallback:', error);
      if (base64Fallback) {
        setFormData(prev => ({ ...prev, image: base64Fallback }));
      } else {
        alert(`ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ในการอัพโหลด: ${error.message || error}`);
      }
    } finally { 
      setIsUploading(false); 
    }
  };

  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (product) onEdit({ 
      ...product, 
      ...formData, 
      price: Number(formData.price), 
      stock: Number(formData.stock),
      image: formData.image || null,
      barcode: formData.barcode || null
    }); 
  };

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-primary/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-primary mb-6">แก้ไขสินค้า</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="ชื่อสินค้า" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block px-1">บาร์โค้ดสินค้า (Barcode)</label>
                <input placeholder="ระบุเลขบาร์โค้ดสินค้า (เช่น 8851234567890)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-sm" value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} />
              </div>

              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                {categories.length === 0 && (
                  <>
                    <option value="เสื้อเชิ้ต">เสื้อเชิ้ต</option>
                    <option value="กางเกง">กางเกง</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </>
                )}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" placeholder="ราคา" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                <input required type="number" placeholder="สต็อก" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  <img src={formData.image || undefined} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 space-y-2">
                  <input placeholder="Image URL" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px]" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} />
                  <label className="block w-full text-center py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold cursor-pointer hover:border-accent hover:text-accent transition-all">
                    UPLOAD
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </div>
              </div>
              <div className="pt-4 space-y-3">
                <button className="w-full py-4 bg-accent text-white rounded-2xl font-black">บันทึกการแก้ไข</button>
                <button type="button" onClick={onDelete} className="w-full py-2 text-red-500 text-xs font-bold">ลบสินค้า</button>
                <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 text-xs font-bold">ยกเลิก</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  history: StockHistory[];
  onUpdateStock: (amount: number, reason: string, user: string) => void;
}

export function StockModal({ isOpen, onClose, product, history, onUpdateStock }: StockModalProps) {
  const [note, setNote] = useState('');
  const [amountInput, setAmountInput] = useState('1');
  const [userInput, setUserInput] = useState('Admin');

  if (!product) return null;

  const handleUpdate = (type: 'in' | 'out') => { 
    const val = parseInt(amountInput) || 0;
    if (val <= 0) return;

    if (!userInput.trim()) {
      alert('กรุณาระบุชื่อผู้ดำเนินการ');
      return;
    }

    const finalAmount = type === 'in' ? val : -val;
    onUpdateStock(
      finalAmount, 
      note || (type === 'in' ? `เพิ่มสินค้า (+${val})` : `ลดสินค้า (-${val})`),
      userInput
    ); 
    setNote(''); 
    setAmountInput('1');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-primary/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-xl font-bold text-primary text-uppercase">การจัดการสต๊อก: {product.name}</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="bg-slate-50 p-6 rounded-2xl text-center flex flex-col justify-center h-full">
                    <p className="text-xs text-secondary mb-1">จำนวนคงเหลือปัจจุบัน</p>
                    <p className={cn("text-5xl font-black", product.stock < 5 ? "text-red-500" : "text-primary")}>{product.stock}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">ผู้ดำเนินการ / ชื่อผู้ใช้</label>
                    <input 
                      type="text" 
                      placeholder="ระบุชื่อผู้ใช้..."
                      className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 font-bold"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">จำนวนที่ต้องการปรับ</label>
                    <input 
                      type="number" 
                      min="1"
                      className="w-full text-center text-3xl font-black p-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-accent/20"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleUpdate('in')} 
                      className="py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 transition-all active:scale-95"
                    >
                      รับสินค้าเข้า
                    </button>
                    <button 
                      onClick={() => handleUpdate('out')} 
                      disabled={product.stock === 0}
                      className="py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                    >
                      ตัดสต๊อกออก
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">หมายเหตุ (ไม่จำเป็น)</label>
                <textarea 
                  placeholder="เช่น เติมสินค้าจากซัพพลายเออร์, ลูกค้าคืนสินค้า, สินค้าชำรุด..." 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none h-24 text-sm" 
                  value={note} 
                  onChange={e => setNote(e.target.value)} 
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-widest text-center">ประวัติการปรับยอด</h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-2">เวลา</th>
                        <th className="px-4 py-2 text-center">จำนวน</th>
                        <th className="px-4 py-2">โดย</th>
                        <th className="px-4 py-2">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">ยังไม่มีประวัติการปรับยอด</td></tr>
                      ) : (
                        history.map((h) => (
                          <tr key={h.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">{h.timestamp}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "font-black px-2 py-0.5 rounded", 
                                h.change > 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
                              )}>
                                {h.change > 0 ? `+${h.change}` : h.change}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-primary">{h.user}</td>
                            <td className="px-4 py-3 truncate max-w-[150px]">{h.reason}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Omit<Product, 'id'>) => void;
  categories: Category[];
}

export function AddProductModal({ isOpen, onClose, onAdd, categories }: AddProductModalProps) {
  const [formData, setFormData] = useState({ name: '', category: 'เสื้อเชิ้ต', price: '', stock: '', image: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=400&q=80', barcode: '' });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultCategory = categories.length > 0 ? categories[0].name : 'เสื้อเชิ้ต';
      setFormData({
        name: '',
        category: defaultCategory,
        price: '',
        stock: '',
        image: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=400&q=80',
        barcode: ''
      });
    }
  }, [isOpen, categories]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    
    // Convert to client-side compressed base64 first to guarantee it always succeeds
    let base64Fallback = '';
    try {
      base64Fallback = await compressAndGetBase64(file);
    } catch (err) {
      console.warn('Compression failed:', err);
    }

    const fd = new FormData(); 
    fd.append('image', file); 

    try { 
      const res = await fetch('/api/upload', { method: 'POST', body: fd }); 
      if (res.ok) { 
        const data = await res.json(); 
        setFormData(prev => ({ ...prev, image: data.imageUrl })); 
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn(`Server upload error, using local base64 fallback. Server says: ${errData.error || res.statusText}`);
        if (base64Fallback) {
          setFormData(prev => ({ ...prev, image: base64Fallback }));
        } else {
          alert(`เกิดข้อผิดพลาดในการอัพโหลด: ${errData.error || res.statusText}`);
        }
      }
    } catch (error: any) {
      console.warn('Server upload connection failed, using local base64 fallback:', error);
      if (base64Fallback) {
        setFormData(prev => ({ ...prev, image: base64Fallback }));
      } else {
        alert(`ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ในการอัพโหลด: ${error.message || error}`);
      }
    } finally { 
      setIsUploading(false); 
    }
  };

  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    onAdd({ 
      ...formData, 
      price: Number(formData.price), 
      stock: Number(formData.stock), 
      image: formData.image || null,
      barcode: formData.barcode || null
    }); 
    setFormData({ name: '', category: 'เสื้อเชิ้ต', price: '', stock: '', image: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=400&q=80', barcode: '' }); 
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-primary/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-primary mb-6">เพิ่มสินค้าใหม่</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="ชื่อสินค้า" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block px-1">บาร์โค้ดสินค้า (Barcode)</label>
                <input placeholder="ระบุเลขบาร์โค้ดสินค้า (เช่น 8851234567890)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-sm" value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} />
              </div>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                {categories.length === 0 && (
                  <>
                    <option value="เสื้อเชิ้ต">เสื้อเชิ้ต</option>
                    <option value="กางเกง">กางเกง</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </>
                )}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" placeholder="ราคา" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                <input required type="number" placeholder="สต็อก" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  <img src={formData.image || undefined} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 space-y-2">
                  <input placeholder="Image URL" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px]" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} />
                  <label className="block w-full text-center py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold cursor-pointer hover:border-accent hover:text-accent transition-all">
                    UPLOAD
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={onClose} type="button" className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold">ยกเลิก</button>
                <button className="flex-1 py-4 bg-primary text-white rounded-2xl font-black">บันทึกสินค้า</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
