import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Order } from '../types';

interface OrdersTableProps {
  orders: Order[];
  onShowReceipt: (order: Order) => void;
  onPay: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function OrdersTable({ orders, onShowReceipt, onPay, onCancel }: OrdersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-secondary text-[10px] uppercase tracking-widest">
          <tr>
            <th className="px-6 py-4">รหัส</th>
            <th className="px-6 py-4">ลูกค้า</th>
            <th className="px-6 py-4">ผู้ขาย</th>
            <th className="px-6 py-4 text-right">ยอดรวม</th>
            <th className="px-6 py-4 text-center">สถานะ</th>
            <th className="px-6 py-4">วันที่</th>
            <th className="px-6 py-4 text-right">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => (
            <tr key={o.id} className={cn("hover:bg-slate-50 transition-colors", o.status === 'Cancelled' && "opacity-60 bg-slate-50/50")}>
              <td className="px-6 py-4 font-mono text-xs text-slate-500">#{o.id}</td>
              <td className="px-6 py-4">
                <p className="font-bold text-primary">{o.customer.name}</p>
                <p className="text-[10px] text-secondary">{o.customer.phone}</p>
              </td>
              <td className="px-6 py-4">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                  {o.seller_name || 'เจ้าของร้าน'}
                </span>
              </td>
              <td className="px-6 py-4 text-right font-black text-primary">฿{o.total.toLocaleString()}</td>
              <td className="px-6 py-4 text-center">
                <span className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-black uppercase", 
                  o.status === 'Paid' ? "bg-emerald-50 text-emerald-600" : 
                  o.status === 'Cancelled' ? "bg-slate-200 text-slate-500" : "bg-red-50 text-red-600"
                )}>
                  {o.status === 'Paid' ? 'ชำระแล้ว' : o.status === 'Cancelled' ? 'ยกเลิกแล้ว' : 'ค้างชำระ'}
                </span>
              </td>
              <td className="px-6 py-4 text-xs text-secondary">{o.date}</td>
              <td className="px-6 py-4">
                <div className="flex gap-2 justify-end items-center">
                  <button 
                    onClick={() => onShowReceipt(o)} 
                    className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all"
                  >
                    <FileText size={14} />
                  </button>
                  {o.status === 'Unpaid' && (
                    <button 
                      onClick={() => onPay(o.id.toString())} 
                      className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      ชำระเงิน
                    </button>
                  )}
                  {o.status !== 'Cancelled' && onCancel && (
                    <button 
                      onClick={() => onCancel(o.id.toString())} 
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="ยกเลิกบิล"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
