/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Settings, 
  Search, 
  Bell, 
  User, 
  Plus, 
  Edit2,
  X,
  RefreshCcw,
  TrendingUp,
  PackageCheck,
  Users,
  ShoppingCart,
  ChevronLeft,
  Eye,
  Lock,
  Unlock,
  LogIn,
  LogOut,
  Delete,
  ShieldCheck,
  KeyRound,
  QrCode,
  ScanLine
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

// Import Types
import { Product, Customer, Order, StockHistory, SystemUser, Category } from './types';

// Import Components
import { SidebarItem } from './components/SidebarItem';
import { StatCard } from './components/StatCard';
import { ProductCard } from './components/ProductCard';
import { OrdersTable } from './components/OrdersTable';
import { ReceiptModal } from './components/ReceiptModal';
import { AddCustomerModal, EditCustomerModal } from './components/CustomerModals';
import { AddProductModal, EditProductModal, StockModal } from './components/ProductModals';
import { CustomDialog } from './components/CustomDialog';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    const saved = localStorage.getItem('currentUser');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [usersSource, setUsersSource] = useState<'supabase' | 'local' | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesSource, setCategoriesSource] = useState<'supabase' | 'local' | null>(null);
  const [showCategorySqlGuide, setShowCategorySqlGuide] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pendingTabAfterUnlock, setPendingTabAfterUnlock] = useState<string | null>(null);
  const [pendingSettingsAfterUnlock, setPendingSettingsAfterUnlock] = useState(false);
  
  // Barcode integration states
  const [barcodeInput, setBarcodeInput] = useState('');
  const [autoFocusBarcode, setAutoFocusBarcode] = useState(true);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Dashboard details expand state
  const [dashboardDetailTab, setDashboardDetailTab] = useState<'sales' | 'stock' | 'customers' | null>(null);
  const [salesFilterType, setSalesFilterType] = useState<'today' | 'date' | 'month' | 'all'>('today');
  const [salesFilterDate, setSalesFilterDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [salesFilterMonth, setSalesFilterMonth] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  
  // Settings & User Management States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'users' | 'add' | 'edit' | 'categories'>('users');
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    role: 'พนักงาน',
    pin: '',
    phone: ''
  });

  const [activeTab, setActiveTab ] = useState(() => {
    return 'dashboard';
  });

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const result = await response.json();
        setSystemUsers(result.data || []);
        if (result.source) {
          setUsersSource(result.source);
        }
      }
    } catch (err) {
      console.error("Failed to fetch system users:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const result = await response.json();
        setCategories(result.data || []);
        if (result.source) {
          setCategoriesSource(result.source);
        }
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const handleAddCategory = async (name: string) => {
    if (!name.trim()) return;
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      if (response.ok) {
        setCategoryForm({ name: '' });
        fetchCategories();
        showAlertDialog('สำเร็จ', 'เพิ่มประเภทสินค้าเรียบร้อยแล้ว', 'success');
      } else {
        const errJson = await response.json();
        showAlertDialog('เกิดข้อผิดพลาด', errJson.error || 'ไม่สามารถเพิ่มประเภทสินค้าได้', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlertDialog('เกิดข้อผิดพลาด', 'มีข้อผิดพลาดเครือข่าย', 'error');
    }
  };

  const handleEditCategory = async (id: number, name: string) => {
    if (!name.trim()) return;
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      if (response.ok) {
        setEditingCategory(null);
        setCategoryForm({ name: '' });
        fetchCategories();
        fetchProducts(); // Refresh products
        showAlertDialog('สำเร็จ', 'แก้ไขประเภทสินค้าเรียบร้อยแล้ว', 'success');
      } else {
        const errJson = await response.json();
        showAlertDialog('เกิดข้อผิดพลาด', errJson.error || 'ไม่สามารถแก้ไขประเภทสินค้าได้', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlertDialog('เกิดข้อผิดพลาด', 'มีข้อผิดพลาดเครือข่าย', 'error');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    showConfirmDialog(
      'ยืนยันการลบ',
      'คุณต้องการลบประเภทสินค้านี้หรือไม่? (สินค้าที่ใช้ประเภทนี้จะไม่ถูกลบ)',
      async () => {
        try {
          const response = await fetch(`/api/categories/${id}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            setEditingCategory(null);
            setCategoryForm({ name: '' });
            fetchCategories();
            showAlertDialog('สำเร็จ', 'ลบประเภทสินค้าเรียบร้อยแล้ว', 'success');
          } else {
            const errJson = await response.json();
            showAlertDialog('เกิดข้อผิดพลาด', errJson.error || 'ไม่สามารถลบประเภทสินค้าได้', 'error');
          }
        } catch (err) {
          console.error(err);
          showAlertDialog('เกิดข้อผิดพลาด', 'มีข้อผิดพลาดเครือข่าย', 'error');
        }
      }
    );
  };

  const handlePinKeyPress = async (val: string) => {
    setPinError('');
    if (pinInput.length < 4) {
      const newVal = pinInput + val;
      setPinInput(newVal);
      
      // Auto submit when length hits 4
      if (newVal.length === 4) {
        // Delayed check to give user visual feedback on the final dot filling up
        setTimeout(async () => {
          try {
            const response = await fetch('/api/users/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin: newVal })
            });

            if (response.ok) {
              const result = await response.json();
              const loggedInUser = result.user;
              
              setIsLoggedIn(true);
              setCurrentUser(loggedInUser);
              localStorage.setItem('isLoggedIn', 'true');
              localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
              
              setPinInput('');
              setIsPinModalOpen(false);
              showAlertDialog(
                'สำเร็จ', 
                `เข้าสู่ระบบเรียบร้อยแล้ว: ยินดีต้อนรับ คุณ ${loggedInUser.name} (${loggedInUser.role})`, 
                'success'
              );
              
              // Redirect to "การขาย" (pos) on login success as requested by the user
              setActiveTab('pos');
              setPendingTabAfterUnlock(null);

              if (pendingSettingsAfterUnlock) {
                setIsSettingsOpen(true);
                setPendingSettingsAfterUnlock(false);
                setSettingsTab('users');
                setNewPinInput('');
                setConfirmPinInput('');
                setSettingsError('');
              }
            } else {
              const errorResult = await response.json();
              setPinError(errorResult.error || 'รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่');
              setPinInput('');
            }
          } catch (error) {
            console.error('Login error:', error);
            setPinError('รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่');
            setPinInput('');
          }
        }, 150);
      }
    }
  };

  const handlePinBackspace = () => {
    setPinError('');
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleTabChange = (tabKey: string) => {
    const isRestricted = ['dashboard', 'inventory', 'reports', 'pos', 'sales'].includes(tabKey);

    if (isRestricted && !isLoggedIn) {
      setPendingTabAfterUnlock(tabKey);
      setIsPinModalOpen(true);
      setPinInput('');
      setPinError('');
    } else {
      setActiveTab(tabKey);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    showAlertDialog('ออกจากระบบ', 'คุณได้ออกจากระบบเรียบร้อยแล้ว', 'success');
    setActiveTab('dashboard');
  };
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]); 
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>({ id: null, name: 'เงินสด (Walk-in)', phone: '-' });
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [dashboardCustomerQuery, setDashboardCustomerQuery] = useState('');
  const [posView, setPosView] = useState<'products' | 'cart'>('products');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<'all' | 'unpaid'>('all');
  
  const [customDialog, setCustomDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'error' | 'success';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const showAlertDialog = (title: string, message: string, type: 'alert' | 'error' | 'success' = 'alert') => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const showConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm
    });
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
        setIsDbConnected(true);
      } else {
        setIsDbConnected(false);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setIsDbConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
        if (data.length > 0) {
           const walkIn = data.find((c: any) => c.name.includes('Walk-in')) || data[0];
           if (selectedCustomer.id === null) {
              setSelectedCustomer(walkIn);
           }
        }
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        const formatted = data.map((o: any) => {
          let items = [];
          if (o.items) {
            try {
              items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
            } catch (e) {
              console.error('Failed to parse order items:', e);
            }
          }
          
          return {
            id: o.id,
            customer: { id: null, name: o.customer_name, phone: o.customer_phone, moo: o.customer_moo },
            total: Number(o.total),
            status: o.status,
            seller_name: o.seller_name || 'เจ้าของร้าน',
            date: new Date(o.date).toLocaleString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            rawDate: o.date,
            items: (items || []).map((it: any) => ({
              product: { name: it.product?.name || it.name, price: it.product?.price || it.price },
              quantity: it.quantity
            }))
          };
        });
        setAllOrders(formatted);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchOrders();
    fetchUsers();
    fetchCategories();
  }, [retryCount]);

  useEffect(() => {
    if (activeTab === 'sales' || activeTab === 'reports' || activeTab === 'dashboard') {
      fetchOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Barcode scanner auto-focus recovery under POS tab
  useEffect(() => {
    if (activeTab === 'pos' && autoFocusBarcode) {
      const interval = setInterval(() => {
        const activeEl = document.activeElement;
        const isEditingForm = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          activeEl.hasAttribute('contenteditable') ||
          activeEl.id === 'pin-input'
        );
        if (!isEditingForm && barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [activeTab, autoFocusBarcode]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toString().includes(searchQuery) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const lowStockProducts = products.filter(p => p.stock < 5);

  const handleUpdateStock = async (id: number, amount: number, reason: string = 'ปรับยอดทั่วไป', user: string = currentUser?.name || 'เจ้าของร้าน') => {
    try {
      const response = await fetch(`/api/products/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason, user })
      });

      if (response.ok) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + amount) } : p));
        
        // Show success alert dialog
        showAlertDialog(
          'ปรับปรุงสต๊อกสำเร็จ',
          `จำนวนที่ปรับ: ${amount > 0 ? '+' : ''}${amount} ชิ้น\nคงเหลือ: ${Math.max(0, (products.find(p => p.id === id)?.stock || 0) + amount)} ชิ้น`,
          'success'
        );

        const newEntry: StockHistory = {
          id: Math.random().toString(36).substring(7),
          productId: id,
          change: amount,
          reason,
          user,
          timestamp: new Date().toLocaleString('th-TH')
        };
        setStockHistory(prev => [newEntry, ...prev]);
        if (selectedProductForStock?.id === id) {
          setSelectedProductForStock(prev => prev ? { ...prev, stock: Math.max(0, prev.stock + amount) } : null);
        }
      }
    } catch (error) {
      console.error('Stock update failed:', error);
    }
  };

  const handleAddProduct = async (newProduct: Omit<Product, 'id'>) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      if (response.ok) {
        fetchProducts();
        setIsAddModalOpen(false);
      }
    } catch (error) {
       console.error('Failed to add product:', error);
    }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    try {
      const response = await fetch(`/api/products/${updatedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      });
      if (response.ok) {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        setSelectedProductForEdit(null);
      }
    } catch (error) {
       console.error('Update failed:', error);
    }
  };

  const handleDeleteProduct = (id: number) => {
    const prodName = products.find(p => p.id === id)?.name || '';
    showConfirmDialog(
      'ยืนยันการลบสินค้า',
      `คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${prodName}"?`,
      async () => {
        try {
          const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            setProducts(prev => prev.filter(p => p.id !== id));
            setSelectedProductForEdit(null);
            showAlertDialog('สำเร็จ', 'ลบสินค้าเรียบร้อยแล้ว', 'success');
          } else {
            showAlertDialog('ผิดพลาด', 'ไม่สามารถลบสินค้าได้', 'error');
          }
        } catch (error) {
          console.error('Delete failed:', error);
          showAlertDialog('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
      }
    );
  };

  const handleAddCustomer = async (newCustomer: Omit<Customer, 'id'>) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });
      if (response.ok) {
        const result = await response.json();
        const customerWithId = { ...newCustomer, id: result.id };
        setCustomers(prev => [...prev, customerWithId]);
        setSelectedCustomer(customerWithId);
        setCustomerSearchQuery(customerWithId.name);
        setIsAddCustomerModalOpen(false);
        setIsCustomerDropdownOpen(false);
      }
    } catch (error) {
       console.error('Failed to add customer:', error);
    }
  };

  const handleEditCustomer = async (updatedCustomer: Customer) => {
    try {
      const response = await fetch(`/api/customers/${updatedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCustomer)
      });
      if (response.ok) {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        if (selectedCustomer.id === updatedCustomer.id) {
          setSelectedCustomer(updatedCustomer);
          setCustomerSearchQuery(updatedCustomer.name);
        }
        setIsEditCustomerModalOpen(false);
      }
    } catch (error) {
       console.error('Edit failed:', error);
    }
  };

  const handleDeleteCustomer = (id: number) => {
    const custName = customers.find(c => c.id === id)?.name || '';
    showConfirmDialog(
      'ยืนยันการลบลูกค้า',
      `คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้า "${custName}"?\nข้อมูลประวัติการสั่งซื้อของลูกค้าคนนี้อาจได้รับผลกระทบ`,
      async () => {
        try {
          const response = await fetch(`/api/customers/${id}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            setCustomers(prev => prev.filter(c => c.id !== id));
            if (selectedCustomer.id === id) {
              const walkIn = customers.find((c: any) => c.name.includes('Walk-in')) || customers[0];
              setSelectedCustomer(walkIn);
              setCustomerSearchQuery('');
            }
            setIsEditCustomerModalOpen(false);
            setCustomerToEdit(null);
            showAlertDialog('สำเร็จ', 'ลบข้อมูลลูกค้าเรียบร้อยแล้ว', 'success');
          } else {
            showAlertDialog('ผิดพลาด', 'ไม่สามารถลบข้อมูลลูกค้าได้', 'error');
          }
        } catch (error) {
          console.error('Delete customer failed:', error);
          showAlertDialog('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
      }
    );
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleBarcodeScan = (scannedCode: string) => {
    if (!scannedCode) return false;
    const cleanCode = scannedCode.trim();
    if (!cleanCode) return false;
    
    // Find product with matching barcode
    const foundProduct = products.find(p => 
      p.barcode === cleanCode || 
      (p.barcode && p.barcode.trim() === cleanCode)
    );
    
    if (foundProduct) {
      if (foundProduct.stock <= 0) {
        showAlertDialog('สินค้าหมด', `ขออภัย "${foundProduct.name}" ไม่มีสินค้าคงเหลือในคลัง`, 'error');
        return true;
      }
      addToCart(foundProduct);
      
      // Play a cute checkout barcode beep!
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = 1100; // pleasant crisp high pitch beep
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
      } catch (e) {
        console.log('Audio Context beep ignored/blocked:', e);
      }
      return true;
    }
    return false;
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const isSuccess = handleBarcodeScan(barcodeInput);
    if (isSuccess) {
      setBarcodeInput('');
    } else {
      showAlertDialog('ไม่พบสินค้า', `ไม่พบสินค้าที่มีบาร์โค้ด "${barcodeInput}" ในระบบ`, 'error');
      setBarcodeInput('');
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, Math.min(item.quantity + delta, item.product.stock));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleCheckout = async (status: 'Paid' | 'Unpaid' = 'Paid') => {
    if (cart.length === 0) return;
    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          total,
          items: cart.map(it => ({ product: { id: it.product.id, name: it.product.name, price: it.product.price }, quantity: it.quantity })),
          status,
          sellerName: currentUser?.name || 'เจ้าของร้าน'
        })
      });
      if (response.ok) {
        const result = await response.json();
        const orderId = result.orderId;
        fetchOrders();
        fetchProducts();
        
        const newOrder: Order = {
          id: orderId.toString(),
          customer: selectedCustomer,
          items: cart.map(it => ({ product: { name: it.product.name, price: it.product.price }, quantity: it.quantity })),
          total,
          status,
          date: new Date().toLocaleString('th-TH'),
          seller_name: currentUser?.name || 'เจ้าของร้าน'
        };

        if (status === 'Paid') {
          setLastOrder(newOrder);
          setShowReceipt(true);
        }
        
        setCart([]);
        setCustomerSearchQuery('');
        const walkIn = customers.find((c: any) => c.name.includes('Walk-in')) || customers[0];
        setSelectedCustomer(walkIn);
        setPosView('products');
      }
    } catch (error) {
       console.error('Checkout failed:', error);
    }
  };

  const handlePayOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Paid' })
      });
      if (response.ok) {
        fetchOrders();
        const order = allOrders.find(o => o.id.toString() === orderId.toString());
        if (order) {
          setLastOrder({ ...order, status: 'Paid' });
          setShowReceipt(true);
        }
      }
    } catch (error) {
       console.error('Failed to pay order:', error);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    showConfirmDialog(
      'ยืนยันการยกเลิกบิล',
      `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกบิล #${orderId}? ระบบจะคืนสินค้าเข้าคลังโดยอัตโนมัติ`,
      async () => {
        try {
          const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: 'Admin' })
          });

          if (response.ok) {
            showAlertDialog('สำเร็จ', 'ยกเลิกบิลสำเร็จและคืนสต๊อกสินค้าเรียบร้อยแล้ว', 'success');
            fetchOrders();
            fetchProducts(); // Refresh stocks in frontend
          } else {
            const err = await response.json();
            showAlertDialog('เกิดข้อผิดพลาด', `ผิดพลาด: ${err.error}`, 'error');
          }
        } catch (error) {
          console.error('Failed to cancel order:', error);
          showAlertDialog('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
      }
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-primary text-white flex flex-col transition-all duration-300 shrink-0 relative overflow-hidden no-print",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn("p-6 flex items-center", isSidebarCollapsed ? "justify-center" : "justify-between")}>
          {!isSidebarCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-2xl font-bold tracking-tight">LouangUdom_Km</h1>
              <p className="text-xs text-secondary mt-1 uppercase tracking-widest font-medium">ระบบจัดการร้านค้า</p>
            </motion.div>
          )}
          {isSidebarCollapsed && (
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-black text-xl">U</div>
          )}
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} isCollapsed={isSidebarCollapsed} onClick={() => handleTabChange('dashboard')} />
          <SidebarItem icon={<Package size={20} />} label="คลังสินค้า" active={activeTab === 'inventory'} isCollapsed={isSidebarCollapsed} onClick={() => handleTabChange('inventory')} />
          <SidebarItem icon={<ShoppingCart size={20} />} label="การขาย" active={activeTab === 'pos' || activeTab === 'sales'} isCollapsed={isSidebarCollapsed} onClick={() => handleTabChange('pos')} />
          <SidebarItem icon={<BarChart3 size={20} />} label="รายงาน" active={activeTab === 'reports'} isCollapsed={isSidebarCollapsed} onClick={() => handleTabChange('reports')} />
          
          {isLoggedIn ? (
            <SidebarItem 
              icon={<Unlock size={20} className="text-emerald-400" />} 
              label="ออกจากระบบ" 
              active={false} 
              isCollapsed={isSidebarCollapsed} 
              onClick={handleLogout} 
            />
          ) : (
            <SidebarItem 
              icon={<Lock size={20} className="text-orange-400" />} 
              label="ล็อกอินเข้าสู่ระบบ" 
              active={false} 
              isCollapsed={isSidebarCollapsed} 
              onClick={() => {
                setPendingTabAfterUnlock(null);
                setPinInput('');
                setPinError('');
                setIsPinModalOpen(true);
              }} 
            />
          )}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <SidebarItem 
            icon={<Settings size={20} />} 
            label="ตั้งค่าระบบ" 
            active={isSettingsOpen} 
            isCollapsed={isSidebarCollapsed} 
            onClick={() => {
              if (!isLoggedIn) {
                setPendingTabAfterUnlock(null);
                setPendingSettingsAfterUnlock(true);
                setPinInput('');
                setPinError('');
                setIsPinModalOpen(true);
                showAlertDialog('ต้องการสิทธิ์ผู้ดูแล', 'กรุณาใส่รหัส PIN เพื่อลงชื่อเข้าสู่ระบบก่อนเปิดหน้าตั้งค่าระบบ');
              } else {
                setIsSettingsOpen(true);
                setNewPinInput('');
                setConfirmPinInput('');
                setSettingsError('');
              }
            }} 
          />
        </div>

        {isLoggedIn && currentUser && (
          <div className="px-4 mb-2 no-print">
            <div className={cn(
              "flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/30 transition-all",
              isSidebarCollapsed && "justify-center"
            )}>
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent font-black flex items-center justify-center border border-accent/20 shrink-0 text-xs">
                {currentUser.name.charAt(0)}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col min-w-0 max-w-[130px]">
                  <span className="text-xs font-bold text-white truncate leading-tight">{currentUser.name}</span>
                  <span className="text-[9px] text-slate-400 font-bold tracking-wide mt-1 uppercase leading-none">{currentUser.role}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto px-4 pb-8 no-print">
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-xl transition-all",
            isDbConnected === true ? "bg-emerald-500/10 text-emerald-400" : 
            isDbConnected === false ? "bg-rose-500/10 text-rose-400" : "bg-slate-500/10 text-slate-400"
          )}>
            <div className={cn("w-2 h-2 rounded-full", isDbConnected === true ? "bg-emerald-50 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : isDbConnected === false ? "bg-rose-500 animate-pulse" : "bg-slate-400")} />
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-tighter">Database Status</span>
                <span className="text-[11px] font-medium opacity-80 leading-none">
                  {isDbConnected === true ? "Connected" : isDbConnected === false ? "Disconnected" : "Connecting..."}
                </span>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute bottom-24 -right-1 translate-x-1/2 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:bg-accent/90 transition-colors z-20 hidden lg:flex"
        >
          <motion.div animate={{ rotate: isSidebarCollapsed ? 180 : 0 }}>
            <ChevronLeft size={16} />
          </motion.div>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden no-print">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อสินค้า หมวดหมู่ หรือรหัส..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-accent/20 outline-none transition-all font-medium"
            />
          </div>

          <div className="flex items-center space-x-6">
            <button className="relative text-slate-500 hover:text-primary transition-colors">
              <Bell size={22} />
              {lowStockProducts.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => {
              if (isLoggedIn) {
                setIsSettingsOpen(true);
                setSettingsTab('users');
                setEditingUser(null);
                setSettingsError('');
              } else {
                setIsPinModalOpen(true);
                setPinInput('');
                setPinError('');
              }
            }}>
              <div className="text-right">
                <p className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                  {isLoggedIn && currentUser ? currentUser.name : "ยังไม่ได้ล็อกอิน"}
                </p>
                <p className="text-xs text-secondary truncate max-w-[120px]">
                  {isLoggedIn && currentUser ? currentUser.role : "กรุณาใส่รหัส PIN"}
                </p>
              </div>
              <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center overflow-hidden group-hover:border-accent transition-all text-accent font-black">
                {isLoggedIn && currentUser ? (
                  currentUser.name.charAt(0)
                ) : (
                  <User className="text-slate-500" size={20} />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            {(activeTab === 'pos' || activeTab === 'sales') && (
              <motion.div
                key="pos-sales-unified"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col gap-6 pb-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 bg-slate-50 py-2 z-10">
                  <div className="flex flex-wrap items-center gap-4">
                    <h2 className="text-xl font-bold text-primary">
                      {activeTab === 'pos' ? 'การขายสินค้า' : 'ประวัติการขาย'}
                    </h2>
                    <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                      <button onClick={() => setActiveTab('pos')} className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", activeTab === 'pos' ? "bg-accent text-white" : "text-secondary hover:bg-slate-50")}>ขายสินค้า (POS)</button>
                      <button onClick={() => setActiveTab('sales')} className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", activeTab === 'sales' ? "bg-accent text-white" : "text-secondary hover:bg-slate-50")}>ประวัติ / ค้างชำระ</button>
                    </div>

                    {activeTab === 'pos' && (
                      <div className="flex lg:hidden bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                        <button 
                          onClick={() => setPosView('products')} 
                          className={cn(
                            "px-4 py-1.5 text-xs font-bold rounded-lg transition-all", 
                            posView === 'products' ? "bg-accent text-white" : "text-secondary hover:bg-slate-50"
                          )}
                        >
                          รายการสินค้า
                        </button>
                        <button 
                          onClick={() => setPosView('cart')} 
                          className={cn(
                            "px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5", 
                            posView === 'cart' ? "bg-accent text-white" : "text-secondary hover:bg-slate-50"
                          )}
                        >
                          ตะกร้าสินค้า
                          {cart.reduce((s, i) => s + i.quantity, 0) > 0 && (
                            <span className={cn(
                              "text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold",
                              posView === 'cart' ? "bg-white text-accent border border-accent/20" : "bg-accent text-white"
                            )}>
                              {cart.reduce((s, i) => s + i.quantity, 0)}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {activeTab === 'pos' ? (
                  <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 lg:overflow-hidden relative">
                    <div className={cn("flex-1 flex flex-col gap-4 min-h-0", posView === 'cart' && "hidden lg:flex")}>
                      
                      {/* Barcode Scanner Section */}
                      <form onSubmit={handleBarcodeSubmit} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="p-2 bg-accent/10 text-accent rounded-xl">
                            <QrCode size={20} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                              ระบบค้นหาและสแกนบาร์โค้ด
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500 text-white animate-pulse">
                                Ready
                              </span>
                            </h3>
                            <p className="text-xs text-slate-400">สแกนเลขโค้ด 13 หลักเพื่อดึงเข้าตะกร้าโดยตรง</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-96">
                          <div className="relative flex-1">
                            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-accent animate-bounce" size={18} style={{ animationDuration: '3s' }} />
                            <input
                              ref={barcodeInputRef}
                              type="text"
                              value={barcodeInput}
                              onChange={(e) => setBarcodeInput(e.target.value)}
                              placeholder="สแกนบาร์โค้ดสินค้าที่นี่..."
                              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-mono"
                            />
                            {barcodeInput && (
                              <button
                                type="button"
                                onClick={() => setBarcodeInput('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-accent hover:bg-accent/90 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                          >
                            เพิ่ม
                          </button>
                        </div>

                        <div className="flex items-center gap-2 select-none border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-secondary font-medium">
                            <input
                              type="checkbox"
                              checked={autoFocusBarcode}
                              onChange={(e) => setAutoFocusBarcode(e.target.checked)}
                              className="rounded border-slate-300 text-accent focus:ring-accent/20"
                            />
                            บล็อกโฟกัสอัตโนมัติ
                          </label>
                        </div>
                      </form>

                      <div className="flex-1 overflow-y-auto pr-2 pb-24 lg:pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {filteredProducts.map(product => (
                            <button 
                              key={product.id}
                              disabled={product.stock <= 0}
                              onClick={() => addToCart(product)}
                              className={cn(
                                "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-left flex gap-4 group",
                                product.stock <= 0 && "opacity-50 grayscale cursor-not-allowed"
                              )}
                            >
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                                <img src={product.image || undefined} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                              </div>
                              <div className="flex-1 flex flex-col justify-between py-0.5">
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold text-primary line-clamp-1">{product.name}</h4>
                                  <div className="flex items-center flex-wrap gap-1.5">
                                    <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">{product.category}</p>
                                    {product.barcode && (
                                      <>
                                        <span className="text-secondary text-[8px]">•</span>
                                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-500">
                                          <QrCode size={9} className="shrink-0 text-slate-400" />
                                          {product.barcode}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-end justify-between">
                                  <span className="text-sm font-black text-accent">฿{product.price.toLocaleString()}</span>
                                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase", product.stock < 5 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>เหลือ {product.stock}</span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sticky Mobile Cart Trigger */}
                      {cart.length > 0 && (
                        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
                          <button 
                            onClick={() => setPosView('cart')} 
                            className="w-full bg-accent hover:bg-accent/90 text-white py-4 px-6 rounded-2xl font-black text-sm shadow-xl flex items-center justify-between transition-all active:scale-95"
                          >
                            <span className="flex items-center gap-2">
                              <ShoppingCart size={18} />
                              ดูตะกร้าสินค้า ({cart.reduce((s, i) => s + i.quantity, 0)} ชิ้น)
                            </span>
                            <span className="text-base font-black flex items-center gap-1">
                              ฿{cart.reduce((s, i) => s + (i.product.price * i.quantity), 0).toLocaleString()} ➜
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={cn("w-full lg:w-96 bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col overflow-hidden shrink-0", posView === 'products' ? "hidden lg:flex" : "flex h-full")}>
                      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-primary flex items-center gap-2">
                            <User size={18} className="text-accent" /> ข้อมูลการขาย
                          </h3>
                          <button 
                            onClick={() => setPosView('products')} 
                            className="lg:hidden text-xs font-bold text-accent bg-accent/5 px-3 py-1.5 rounded-lg border border-accent/15 hover:bg-accent/10 transition-all"
                          >
                            ← กลับไปเลือกสินค้า
                          </button>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">เลือกลูกค้า</label>
                          <div className="relative">
                            <div className="relative flex items-center gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                  type="text"
                                  placeholder="ค้นหาชื่อ หรือ เบอร์โทร..."
                                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                                  value={customerSearchQuery}
                                  onChange={(e) => {
                                    setCustomerSearchQuery(e.target.value);
                                    setIsCustomerDropdownOpen(true);
                                  }}
                                  onFocus={() => setIsCustomerDropdownOpen(true)}
                                />
                              </div>
                              {selectedCustomer.id !== null && (
                                <button 
                                  onClick={() => { setCustomerToEdit(selectedCustomer); setIsEditCustomerModalOpen(true); }}
                                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </div>

                            <AnimatePresence>
                              {isCustomerDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setIsCustomerDropdownOpen(false)} />
                                  <motion.div 
                                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                                    className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto"
                                  >
                                    {(() => {
                                      const filtered = customers.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || c.phone.includes(customerSearchQuery));
                                      if (filtered.length === 0 && customerSearchQuery.trim() !== '') {
                                        return (
                                          <button onClick={() => { setIsAddCustomerModalOpen(true); setIsCustomerDropdownOpen(false); }} className="w-full text-center px-4 py-4 hover:bg-slate-50 flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent"><Plus size={20} /></div>
                                            <span className="text-sm font-bold text-primary">ไม่พบลูกค้านี้</span>
                                            <span className="text-[10px] text-accent font-bold uppercase underline">คลิกเพื่อเพิ่มลูกค้าใหม่</span>
                                          </button>
                                        );
                                      }
                                      return filtered.map(customer => (
                                        <div key={customer.id} className="relative group/curr">
                                          <button
                                            onClick={() => { setSelectedCustomer(customer); setCustomerSearchQuery(customer.name === 'เงินสด (Walk-in)' ? '' : customer.name); setIsCustomerDropdownOpen(false); }}
                                            className={cn("w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-b border-slate-50 last:border-0", selectedCustomer.id === customer.id && "bg-accent/5")}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm font-bold text-primary">{customer.name}</span>
                                              {selectedCustomer.id === customer.id && <span className="w-2 h-2 bg-accent rounded-full"></span>}
                                            </div>
                                            <span className="text-[10px] text-secondary">{customer.phone}</span>
                                          </button>
                                          {customer.id !== null && (
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); setCustomerToEdit(customer); setIsEditCustomerModalOpen(true); setIsCustomerDropdownOpen(false); }}
                                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover/curr:opacity-100 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-accent transition-all"
                                            >
                                              <Eye size={14} />
                                            </button>
                                          )}
                                        </div>
                                      ));
                                    })()}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-secondary uppercase tracking-widest">รายการสินค้า</span>
                          <button onClick={() => setCart([])} className="text-[10px] text-red-500 font-bold">ล้างบิล</button>
                        </div>
                        {cart.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                            <ShoppingCart size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">ยังไม่มีสินค้าในบิล</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {cart.map(item => (
                              <div key={item.product.id} className="flex gap-3 items-center">
                                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0"><img src={item.product.image || undefined} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" /></div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-[11px] font-bold text-primary truncate">{item.product.name}</h5>
                                  <p className="text-[10px] text-accent font-black">฿{(item.product.price * item.quantity).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                                  <button onClick={() => updateCartQuantity(item.product.id, -1)} className="w-5 h-5 flex items-center justify-center"><X size={10} className="rotate-45" /></button>
                                  <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                  <button onClick={() => updateCartQuantity(item.product.id, 1)} className="w-5 h-5 flex items-center justify-center"><Plus size={10} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-sm font-bold text-primary">ยอดชำระสุทธิ</span>
                          <span className="text-2xl font-black text-accent">฿{cart.reduce((s, i) => s + (i.product.price * i.quantity), 0).toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <button onClick={() => handleCheckout('Unpaid')} disabled={cart.length === 0} className="bg-white border border-slate-200 text-primary py-4 rounded-2xl font-bold text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50">บันทึกค้างชำระ</button>
                          <button onClick={() => handleCheckout('Paid')} disabled={cart.length === 0} className="bg-accent hover:bg-accent/90 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">ชำระเงิน <ShoppingCart size={18} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-primary">รายการขายและประวัติ</h3>
                      <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                        <button onClick={() => setOrderFilter('all')} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", orderFilter === 'all' ? "bg-primary text-white" : "text-secondary hover:bg-slate-50")}>ทั้งหมด</button>
                        <button onClick={() => setOrderFilter('unpaid')} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", orderFilter === 'unpaid' ? "bg-red-500 text-white" : "text-secondary hover:bg-slate-50")}>ค้างชำระ</button>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-sm">
                      <OrdersTable 
                        orders={orderFilter === 'all' ? allOrders : allOrders.filter(o => o.status === 'Unpaid')} 
                        onShowReceipt={(order) => { setLastOrder(order); setShowReceipt(true); }} 
                        onPay={(id) => handlePayOrder(id)} 
                        onCancel={(id) => handleCancelOrder(id)}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'dashboard' && (() => {
              const dashboardTodayOrders = allOrders.filter(o => {
                if (o.status === 'Cancelled') return false;
                if (!o.rawDate) return false;
                const orderDate = new Date(o.rawDate);
                
                if (salesFilterType === 'today') {
                  const today = new Date();
                  return orderDate.getDate() === today.getDate() &&
                         orderDate.getMonth() === today.getMonth() &&
                         orderDate.getFullYear() === today.getFullYear();
                } else if (salesFilterType === 'date') {
                  if (!salesFilterDate) return true;
                  const [fYear, fMonth, fDay] = salesFilterDate.split('-').map(Number);
                  return orderDate.getFullYear() === fYear &&
                         (orderDate.getMonth() + 1) === fMonth &&
                         orderDate.getDate() === fDay;
                } else if (salesFilterType === 'month') {
                  if (!salesFilterMonth) return true;
                  const [fYear, fMonth] = salesFilterMonth.split('-').map(Number);
                  return orderDate.getFullYear() === fYear &&
                         (orderDate.getMonth() + 1) === fMonth;
                } else if (salesFilterType === 'all') {
                  return true;
                }
                return true;
              });

              const dashboardTodayTotal = dashboardTodayOrders.reduce((sum, o) => sum + o.total, 0);
              const dashboardTodayPaid = dashboardTodayOrders.filter(o => o.status === 'Paid').reduce((sum, o) => sum + o.total, 0);
              const dashboardTodayUnpaid = dashboardTodayOrders.filter(o => o.status === 'Unpaid').reduce((sum, o) => sum + o.total, 0);

              const dashboardProductsWithSales = products.map(p => {
                const soldQty = allOrders
                  .filter(o => o.status !== 'Cancelled')
                  .reduce((sum, o) => {
                    const item = o.items.find(it => it.product && it.product.name.trim() === p.name.trim());
                    return sum + (item ? item.quantity : 0);
                  }, 0);
                return {
                  ...p,
                  soldQty
                };
              });

              const last7Days = Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d;
              });

              const sevenDaysChartData = last7Days.map(date => {
                const label = date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
                const dayOrders = allOrders.filter(o => {
                  if (o.status === 'Cancelled') return false;
                  if (!o.rawDate) return false;
                  const oDate = new Date(o.rawDate);
                  return oDate.getDate() === date.getDate() &&
                         oDate.getMonth() === date.getMonth() &&
                         oDate.getFullYear() === date.getFullYear();
                });
                const paid = dayOrders.filter(o => o.status === 'Paid').reduce((sum, o) => sum + o.total, 0);
                const unpaid = dayOrders.filter(o => o.status === 'Unpaid').reduce((sum, o) => sum + o.total, 0);
                return {
                  name: label,
                  "ยอดที่ชำระ (บาท)": paid,
                  "ค้างชำระ (บาท)": unpaid,
                  "ยอดขายรวม (บาท)": paid + unpaid
                };
              });

              const stockChartData = [...dashboardProductsWithSales]
                .sort((a, b) => b.soldQty - a.soldQty)
                .slice(0, 10)
                .map(p => ({
                  name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
                  fullName: p.name,
                  "จำนวนที่ขายได้ (ชิ้น)": p.soldQty,
                  "คงเหลือในสต็อก (ชิ้น)": p.stock
                }));

              return (
                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                  <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                      label="ยอดขายวันนี้" 
                      value={`฿${dashboardTodayTotal.toLocaleString()}`} 
                      icon={<TrendingUp className="text-accent" />} 
                      trend="คลิกดูรายละเอียดค้างจ่าย"
                      onClick={() => setDashboardDetailTab(prev => prev === 'sales' ? null : 'sales')}
                      isActive={dashboardDetailTab === 'sales'}
                    />
                    <StatCard 
                      label="สินค้าในสต็อก" 
                      value={products.reduce((acc, p) => acc + p.stock, 0).toLocaleString()} 
                      icon={<PackageCheck className="text-emerald-500" />} 
                      trend="คลิกดูสรุปยอดหมวดหมู่" 
                      onClick={() => setDashboardDetailTab(prev => prev === 'stock' ? null : 'stock')}
                      isActive={dashboardDetailTab === 'stock'}
                    />
                    <StatCard 
                      label="ข้อมูลลูกค้า" 
                      value={`${customers.length} คน`} 
                      icon={<Users className="text-orange-500" />} 
                      trend="คลิกเพื่อจัดการและค้นหาลูดค้า" 
                      onClick={() => setDashboardDetailTab(prev => prev === 'customers' ? null : 'customers')}
                      isActive={dashboardDetailTab === 'customers'}
                    />
                    <StatCard 
                      label="ค้างชำระทั้งหมด" 
                      value={allOrders.filter(o => o.status === 'Unpaid').length.toString() + " บิล"} 
                      icon={<RefreshCcw className="text-red-500" />} 
                      trend="ประวัติค้างชำระ" 
                    />
                  </section>

                  {dashboardDetailTab && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
                    >
                      {dashboardDetailTab === 'sales' && (
                        <div className="space-y-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 gap-4">
                            <div>
                              <h3 className="text-lg font-black text-primary">
                                {salesFilterType === 'today' && "รายละเอียด ยอดขายวันนี้"}
                                {salesFilterType === 'date' && `รายละเอียด ยอดขายวันที่ ${new Date(salesFilterDate + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                                {salesFilterType === 'month' && (() => {
                                  const [year, month] = salesFilterMonth.split('-').map(Number);
                                  const tempDate = new Date(year, month - 1, 1);
                                  return `รายละเอียด ยอดขายประจำเดือน ${tempDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`;
                                })()}
                                {salesFilterType === 'all' && "รายละเอียด ยอดขายทั้งหมด"}
                              </h3>
                              <p className="text-xs text-secondary font-medium">ข้อมูลสรุปยอดบิลที่ชำระเงินแล้วและยอดค้างชำระตามตัวกรองที่เลือก</p>
                            </div>
                            
                            {/* Filter Action Controls */}
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => setSalesFilterType('today')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    salesFilterType === 'today' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"
                                  )}
                                >
                                  วันนี้
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSalesFilterType('date')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    salesFilterType === 'date' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"
                                  )}
                                >
                                  เลือกวันที่
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSalesFilterType('month')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    salesFilterType === 'month' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"
                                  )}
                                >
                                  เลือกเดือน
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSalesFilterType('all')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    salesFilterType === 'all' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"
                                  )}
                                >
                                  ทั้งหมด
                                </button>
                              </div>

                              {salesFilterType === 'date' && (
                                <input
                                  type="date"
                                  value={salesFilterDate}
                                  onChange={(e) => setSalesFilterDate(e.target.value)}
                                  className="p-1 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-800 font-mono h-9"
                                />
                              )}

                              {salesFilterType === 'month' && (
                                <input
                                  type="month"
                                  value={salesFilterMonth}
                                  onChange={(e) => setSalesFilterMonth(e.target.value)}
                                  className="p-1 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-800 font-mono h-9"
                                />
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-2">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {salesFilterType === 'today' && "ยอดขายรวมวันนี้"}
                                {salesFilterType === 'date' && "ยอดขายวันย้อนหลัง"}
                                {salesFilterType === 'month' && "ยอดขายรวมประจำเดือน"}
                                {salesFilterType === 'all' && "ยอดขายรวมทั้งหมด"}
                              </span>
                              <div className="text-2xl font-black text-slate-800">฿{dashboardTodayTotal.toLocaleString()}</div>
                              <p className="text-[10px] text-slate-400">รวมทั้งหมด {dashboardTodayOrders.length} บิล</p>
                            </div>

                            <div className="bg-emerald-50/60 rounded-xl p-5 border border-emerald-100/50 space-y-2">
                              <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                ยอดที่จ่ายแล้ว
                              </span>
                              <div className="text-2xl font-black text-emerald-700">฿{dashboardTodayPaid.toLocaleString()}</div>
                              <p className="text-[10px] text-emerald-600/70">ได้รับเงินเรียบร้อยแล้ว {dashboardTodayOrders.filter(o => o.status === 'Paid').length} บิล</p>
                            </div>

                            <div className="bg-rose-50/60 rounded-xl p-5 border border-rose-100/50 space-y-2">
                              <span className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                ยอดที่ค้างจ่าย
                              </span>
                              <div className="text-2xl font-black text-rose-700">฿{dashboardTodayUnpaid.toLocaleString()}</div>
                              <p className="text-[10px] text-rose-600/70">ยังไม่ได้ชำระทั้งหมด {dashboardTodayOrders.filter(o => o.status === 'Unpaid').length} บิล</p>
                            </div>
                          </div>

                          {/* 7 Days Sales Trend Chart */}
                          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-4">
                            <div>
                              <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                <TrendingUp size={16} className="text-accent" />
                                กราฟแท่งเปรียบเทียบยอดขายรายวัน (ย้อนหลัง 7 วันล่าสุด)
                              </h4>
                              <p className="text-xs text-secondary font-medium">แสดงสัดส่วนบิลที่ ชำระเงินแล้ว เทียบกับ บิลที่ค้างชำระ ย้อนหลังหนึ่งสัปดาห์</p>
                            </div>
                            <div className="h-64 sm:h-72 w-full font-sans">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sevenDaysChartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `฿${val.toLocaleString()}`} />
                                  <Tooltip 
                                    formatter={(value: any, name: string) => [`฿${Number(value).toLocaleString()}`, name]}
                                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelStyle={{ fontWeight: 'bold', color: '#1E293B', fontSize: '12px', marginBottom: '4px' }}
                                    itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                                  />
                                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                  <Bar dataKey="ยอดที่ชำระ (บาท)" stackId="a" fill="#10B981" name="ยอดชำระแล้ว" radius={[0, 0, 0, 0]} />
                                  <Bar dataKey="ค้างชำระ (บาท)" stackId="a" fill="#EF4444" name="ยอดค้างชำระ" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="mt-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                              {salesFilterType === 'today' && "รายการบิลวันนี้"}
                              {salesFilterType === 'date' && "รายการบิลตามวันที่เลือก"}
                              {salesFilterType === 'month' && "รายการบิลตามเดือนที่เลือก"}
                              {salesFilterType === 'all' && "รายการบิลทั้งหมดที่มีในระบบ"}
                            </h4>
                            {dashboardTodayOrders.length > 0 ? (
                              <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                                      <th className="p-3">เลขที่บิล</th>
                                      <th className="p-3">ลูกค้า</th>
                                      <th className="p-3">เวลา</th>
                                      <th className="p-3">ผู้ขาย</th>
                                      <th className="p-3 text-right">ยอดรวม</th>
                                      <th className="p-3 text-center">สถานะ</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {dashboardTodayOrders.map(o => (
                                      <tr key={o.id} className="hover:bg-slate-50/50">
                                        <td className="p-3 font-mono font-bold text-primary">#{o.id}</td>
                                        <td className="p-3 font-medium text-slate-700">{o.customer.name}</td>
                                        <td className="p-3 text-secondary">{o.date}</td>
                                        <td className="p-3">
                                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                            {o.seller_name || 'เจ้าของร้าน'}
                                          </span>
                                        </td>
                                        <td className="p-3 text-right font-bold text-primary">฿{o.total.toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                          <span className={cn(
                                            "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold",
                                            o.status === 'Paid' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                          )}>
                                            {o.status === 'Paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-400 font-medium text-xs">
                                ไม่มีบิลยอดขายสำหรับช่วงเวลาดังกล่าว
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {dashboardDetailTab === 'stock' && (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                            <div>
                              <h3 className="text-lg font-bold text-primary">สรุปยอดสินค้าที่ขาย และคงเหลือ แต่ละชนิด</h3>
                              <p className="text-xs text-secondary">ข้อมูลสถิติจำนวนชิ้นสินค้าที่ขายออกไป (ไม่รวมบิลที่ยกเลิก) เทียบกับจำนวนสต็อกคงเหลือปัจจุบัน</p>
                            </div>
                            <span className="self-start px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg">
                              คลังสินค้าทั้งหมด {products.length} รายการ
                            </span>
                          </div>

                          {/* Top Sold Products Chart */}
                          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-4">
                            <div>
                              <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                <PackageCheck size={16} className="text-emerald-500" />
                                กราฟแท่งเปรียบเทียบสินค้าขายได้มากไปหาน้อย (Top 10)
                              </h4>
                              <p className="text-xs text-secondary font-medium">แสดงคู่เปรียบเทียบจำนวนที่ขายได้ เทียบกับจำนวนสต็อกคงเหลือปัจจุบัน</p>
                            </div>
                            <div className="h-64 sm:h-72 w-full font-sans">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stockChartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} angle={-15} textAnchor="end" height={45} />
                                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                                  <Tooltip 
                                    formatter={(value: any, name: string) => [`${value} ชิ้น`, name]}
                                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelStyle={{ fontWeight: 'bold', color: '#1E293B', fontSize: '12px', marginBottom: '4px' }}
                                    itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                                  />
                                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                  <Bar dataKey="จำนวนที่ขายได้ (ชิ้น)" fill="#3B82F6" name="ขายได้แล้ว (ชิ้น)" radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="คงเหลือในสต็อก (ชิ้น)" fill="#10B981" name="คงเหลือในสต็อก (ชิ้น)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left border-collapse text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-slate-600 font-extrabold text-xs uppercase tracking-wider border-b border-slate-200">
                                  <th className="p-4">สินค้า</th>
                                  <th className="p-4">หมวดหมู่</th>
                                  <th className="p-4 text-right">ราคาต่อชิ้น</th>
                                  <th className="p-4 text-center">ขายได้แล้ว</th>
                                  <th className="p-4 text-center">คงเหลือในสต็อก</th>
                                  <th className="p-4 text-center">สถานะ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {dashboardProductsWithSales.map(p => {
                                  const isLow = p.stock < 5;
                                  const isOut = p.stock <= 0;
                                  
                                  return (
                                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                                      <td className="p-4 flex items-center gap-3">
                                        {p.image ? (
                                          <img src={p.image} referrerPolicy="no-referrer" alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-400">ไม่มีรูป</div>
                                        )}
                                        <div>
                                          <div className="font-bold text-primary">{p.name}</div>
                                          {p.barcode && <div className="text-[10px] font-mono font-semibold text-slate-400 mt-0.5">บาร์โค้ด: {p.barcode}</div>}
                                        </div>
                                      </td>
                                      <td className="p-4">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-secondary bg-slate-100">
                                          {p.category}
                                        </span>
                                      </td>
                                      <td className="p-4 text-right font-bold text-primary">฿{p.price.toLocaleString()}</td>
                                      <td className="p-4 text-center">
                                        <span className={cn(
                                          "px-2.5 py-1 rounded-lg text-xs font-bold font-mono",
                                          p.soldQty > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400"
                                        )}>
                                          {p.soldQty.toLocaleString()} ชิ้น
                                        </span>
                                      </td>
                                      <td className="p-4 text-center font-mono font-bold text-slate-700">
                                        <span className={cn(
                                          "inline-block min-w-[40px] px-2 py-0.5 rounded text-xs",
                                          isOut ? "bg-red-50 text-red-600 font-extrabold" : isLow ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-700"
                                        )}>
                                          {p.stock} ชิ้น
                                        </span>
                                      </td>
                                      <td className="p-4 text-center">
                                        {isOut ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">หมด</span>
                                        ) : isLow ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-600">ใกล้หมด</span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-600 font-medium">ปกติ</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {dashboardDetailTab === 'customers' && (
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
                            <div>
                              <h3 className="text-lg font-black text-primary flex items-center gap-2">
                                <Users size={20} className="text-orange-500" />
                                การจัดการข้อมูลลูกค้า
                              </h3>
                              <p className="text-xs text-secondary font-medium">ค้นหา เพิ่ม ลบ หรือแก้ไขข้อมูลเพื่ออัพเดทประวัติลูกค้าในระบบ</p>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddCustomerModalOpen(true);
                              }}
                              className="bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black shadow-md self-start"
                            >
                              <Plus size={16} />
                              เพิ่มลูกค้าใหม่
                            </button>
                          </div>

                          {/* Search Input */}
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              type="text"
                              placeholder="ค้นหาลูกค้าด้วย ชื่อ-นามสกุล, เบอร์โทรศัพท์ หรือที่อยู่..."
                              value={dashboardCustomerQuery}
                              onChange={(e) => setDashboardCustomerQuery(e.target.value)}
                              className="w-full pl-11 pr-14 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-800"
                            />
                            {dashboardCustomerQuery && (
                              <button 
                                type="button"
                                onClick={() => setDashboardCustomerQuery('')} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                              >
                                ล้าง
                              </button>
                            )}
                          </div>

                          {/* Data Table */}
                          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-left border-collapse text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-slate-600 font-extrabold text-xs uppercase tracking-wider border-b border-slate-200 animate-fadeIn">
                                  <th className="p-4 w-16">ID</th>
                                  <th className="p-4">ชื่อผู้ซื้อ</th>
                                  <th className="p-4">เบอร์โทรศัพท์</th>
                                  <th className="p-4">หมู่ที่</th>
                                  <th className="p-4">ที่อยู่ปัจจุบัน</th>
                                  <th className="p-4 text-center w-36">การจัดการ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(() => {
                                  const filtered = customers.filter(c => 
                                    (c.name || '').toLowerCase().includes(dashboardCustomerQuery.toLowerCase()) || 
                                    (c.phone || '').includes(dashboardCustomerQuery) ||
                                    (c.address || '').toLowerCase().includes(dashboardCustomerQuery.toLowerCase())
                                  );

                                  if (filtered.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={6} className="text-center py-10 text-slate-400 font-medium text-xs">
                                          ไม่พบข้อมูลลูกค้าตามเงื่อนไขที่ค้นหา
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return filtered.map(customer => {
                                    const isWalkIn = customer.id === null || customer.name.includes('Walk-in') || customer.name.includes('เงินสด');
                                    return (
                                      <tr key={customer.id || 'walkin'} className="hover:bg-slate-50/40 transition-colors">
                                        <td className="p-4 font-mono text-xs font-bold text-slate-500">
                                          {customer.id ? `#${customer.id}` : '-'}
                                        </td>
                                        <td className="p-4">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs uppercase font-mono shrink-0">
                                              {(customer.name || 'C').substring(0, 2)}
                                            </div>
                                            <div className="font-bold text-primary">{customer.name}</div>
                                          </div>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-secondary text-xs">
                                          {customer.phone || '-'}
                                        </td>
                                        <td className="p-4 font-bold text-slate-600 text-xs">
                                          {customer.moo ? `หมู่ที่ ${customer.moo}` : '-'}
                                        </td>
                                        <td className="p-4 text-xs text-secondary max-w-xs truncate">
                                          {customer.address || '-'}
                                        </td>
                                        <td className="p-4 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            {!isWalkIn ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setCustomerToEdit(customer);
                                                    setIsEditCustomerModalOpen(true);
                                                  }}
                                                  className="p-2 text-slate-500 hover:text-accent hover:bg-accent/5 rounded-lg transition-colors border border-slate-100 hover:border-accent/20 shadow-sm"
                                                  title="แก้ไขข้อมูลลูกค้า"
                                                >
                                                  <Edit2 size={14} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (customer.id) handleDeleteCustomer(customer.id);
                                                  }}
                                                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-100 hover:border-red-200 shadow-sm"
                                                  title="ลบข้อมูลลูกค้า"
                                                >
                                                  <Delete size={14} />
                                                </button>
                                              </>
                                            ) : (
                                              <span className="text-[10px] text-slate-400 font-extrabold bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">ระบบ</span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {!dashboardDetailTab && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-accent"></span>
                        สินค้าแนะนำในคลัง
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products.slice(0, 4).map(p => (
                          <ProductCard key={p.id} product={p} onManageStock={() => setSelectedProductForStock(p)} onEdit={() => setSelectedProductForEdit(p)} onDelete={() => handleDeleteProduct(p.id)} />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {activeTab === 'inventory' && (
              <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div><h2 className="text-2xl font-bold text-primary">การจัดการคลังสินค้า</h2><p className="text-sm text-secondary">รายการสินค้าทั้งหมดในระบบ</p></div>
                  <button onClick={() => setIsAddModalOpen(true)} className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-md"><Plus size={18} /> เพิ่มสินค้าใหม่</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map(p => (
                    <ProductCard key={p.id} product={p} onManageStock={() => setSelectedProductForStock(p)} onEdit={() => setSelectedProductForEdit(p)} onDelete={() => handleDeleteProduct(p.id)} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <StockModal 
        isOpen={!!selectedProductForStock} 
        onClose={() => setSelectedProductForStock(null)} 
        product={selectedProductForStock} 
        history={stockHistory.filter(h => h.productId === selectedProductForStock?.id)} 
        onUpdateStock={(amount, reason, user) => selectedProductForStock && handleUpdateStock(selectedProductForStock.id, amount, reason, user)} 
      />
      <AddProductModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddProduct} 
        categories={categories}
      />
      <EditProductModal 
        isOpen={!!selectedProductForEdit} 
        product={selectedProductForEdit} 
        onClose={() => setSelectedProductForEdit(null)} 
        onEdit={handleEditProduct} 
        onDelete={() => selectedProductForEdit && handleDeleteProduct(selectedProductForEdit.id)} 
        categories={categories}
      />
      <ReceiptModal 
        isOpen={showReceipt} 
        onClose={() => setShowReceipt(false)} 
        order={lastOrder} 
      />
      <AddCustomerModal 
        isOpen={isAddCustomerModalOpen} 
        onClose={() => setIsAddCustomerModalOpen(false)} 
        onAdd={handleAddCustomer} 
        initialName={customerSearchQuery} 
      />
      <EditCustomerModal 
        isOpen={isEditCustomerModalOpen} 
        customer={customerToEdit} 
        onClose={() => setIsEditCustomerModalOpen(false)} 
        onSave={handleEditCustomer} 
        onDelete={() => customerToEdit && customerToEdit.id && handleDeleteCustomer(customerToEdit.id)}
      />

      <CustomDialog
        isOpen={customDialog.isOpen}
        title={customDialog.title}
        message={customDialog.message}
        type={customDialog.type}
        onClose={() => setCustomDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={customDialog.onConfirm}
      />

      {/* Pin Unlock Modal (Approach 2 PIN Code Login) */}
      <AnimatePresence>
        {isPinModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900/95 text-white p-8 rounded-[32px] border border-slate-800 w-full max-w-sm flex flex-col items-center relative shadow-2xl"
            >
              <button 
                onClick={() => { setIsPinModalOpen(false); setPendingTabAfterUnlock(null); }} 
                className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700/80 rounded-full transition-colors inline-flex"
              >
                <X size={16} />
              </button>

              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4 border border-accent/20">
                <Lock className="text-accent" size={28} />
              </div>

              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                ล็อกอินเข้าใช้งานระบบ
              </h3>
              <p className="text-center text-xs text-slate-400 mt-1 max-w-[250px]">
                กรอกรหัส PIN 4 หลักเพื่อเข้าใช้งานระบบเมนูต่างๆ
              </p>

              {/* Password dot illumination indicators */}
              <div className="flex justify-center gap-4 my-8">
                {[0, 1, 2, 3].map((index) => (
                  <motion.div
                    key={index}
                    animate={{ scale: pinInput.length > index ? [1, 1.25, 1] : 1 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all duration-200",
                      pinInput.length > index 
                        ? "bg-accent border-accent shadow-[0_0_12px_rgba(235,94,40,0.6)]" 
                        : "border-slate-600 bg-transparent"
                    )}
                  />
                ))}
              </div>

              <div className="h-6 mb-4">
                {pinError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-xs text-rose-500 font-bold block text-center"
                  >
                    {pinError}
                  </motion.p>
                )}
              </div>

              {/* Number Keypad Grid */}
              <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-[260px] mx-auto mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinKeyPress(num.toString())}
                    className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black text-xl flex items-center justify-center transition-all active:scale-95 shadow-md"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => { setPinInput(''); setPinError(''); }}
                  className="w-14 h-14 rounded-full bg-slate-800 hover:bg-red-500/10 text-rose-400 font-bold text-sm flex items-center justify-center transition-all active:scale-95 shadow-md"
                >
                  ล้าง
                </button>
                <button
                  onClick={() => handlePinKeyPress('0')}
                  className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black text-xl flex items-center justify-center transition-all active:scale-95 shadow-md"
                >
                  0
                </button>
                <button
                  onClick={handlePinBackspace}
                  className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xl flex items-center justify-center transition-all active:scale-95 shadow-md"
                >
                  <Delete size={18} />
                </button>
              </div>

              <span className="text-[10px] text-slate-500 font-bold mt-2">
                *รหัส PIN เริ่มต้นของผู้ดูแลระบบคือ: <span className="text-accent underline font-mono">1234</span>
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal - Modern User Database & PIN Change Dashboard */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-slate-800 p-8 rounded-[32px] border border-slate-200 w-full max-w-2xl flex flex-col relative shadow-2xl overflow-hidden max-h-[85vh]"
            >
              <button 
                onClick={() => {
                  setIsSettingsOpen(false);
                  setSettingsTab('users');
                  setEditingUser(null);
                  setSettingsError('');
                }} 
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors inline-flex"
              >
                <X size={16} />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="p-2.5 bg-accent/10 rounded-2xl text-accent">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">ระบบจัดการผู้ใช้งานและสิทธิ์</h3>
                  <p className="text-secondary text-xs">สำหรับจัดการข้อมูลพนักงาน กำหนดสิทธิ์ และควบคุมการเข้าถึงระบบความปลอดภัย</p>
                </div>
              </div>

              {/* Tab Controls */}
              <div className="flex border-b border-slate-100 mb-6 p-1 bg-slate-100 rounded-xl">
                <button 
                  type="button"
                  onClick={() => {
                    setSettingsTab('users');
                    setEditingUser(null);
                    setSettingsError('');
                  }}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    settingsTab === 'users' ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary"
                  )}
                >
                  รายชื่อผู้ใช้ทั้งหมด ({systemUsers.length})
                </button>
                
                <button 
                  type="button"
                  onClick={() => {
                    setSettingsTab('add');
                    setUserForm({ name: '', role: 'พนักงาน', pin: '', phone: '' });
                    setSettingsError('');
                  }}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    settingsTab === 'add' ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary"
                  )}
                >
                  + เพิ่มผู้ใช้งานใหม่
                </button>

                {/* Edit current user's direct PIN as a shortcut tab */}
                <button 
                  type="button"
                  onClick={() => {
                    setSettingsTab('edit');
                    setEditingUser(currentUser);
                    setUserForm({
                      name: currentUser?.name || '',
                      role: currentUser?.role || 'พนักงาน',
                      pin: currentUser?.pin || '',
                      phone: currentUser?.phone || ''
                    });
                    setSettingsError('');
                  }}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    settingsTab === 'edit' && editingUser?.id === currentUser?.id ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary"
                  )}
                >
                  ข้อมูลส่วนตัวของฉัน ({currentUser?.name})
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setSettingsTab('categories');
                    setEditingCategory(null);
                    setCategoryForm({ name: '' });
                    setSettingsError('');
                  }}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    settingsTab === 'categories' ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary"
                  )}
                >
                  ประเภทสินค้า ({categories.length})
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto pr-1">

                {/* TAB 1: User List (users) */}
                {settingsTab === 'users' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-secondary text-xs font-bold px-1">
                      <span>จัดการข้อมูลผู้ใช้</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        กำลังใช้งานโดย: {currentUser?.name}
                      </span>
                    </div>

                    {/* Database Storage Engine Indicator */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-bold">แหล่งจัดเก็บข้อมูล (User Database):</span>
                        {usersSource === 'supabase' ? (
                          <span className="text-[10px] bg-emerald-500 text-white font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            Supabase Cloud (Active)
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500 text-white font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            Local Storage Fallback
                          </span>
                        )}
                      </div>
                      
                      {usersSource !== 'supabase' ? (
                        <div className="text-[11px] text-slate-600 leading-relaxed bg-amber-50/40 border border-amber-100 p-2.5 rounded-xl">
                          <p className="font-semibold text-amber-800">
                            ⚠️ ยังไม่พบตาราง <code className="font-mono bg-white px-1 border border-amber-200 rounded text-amber-900 text-xs font-bold">system_users</code> บน Supabase Cloud
                          </p>
                          <p className="mt-1">
                            ขณะนี้ข้อมูลถูกจัดเก็บไว้บนเซิร์ฟเวอร์โลคัล (Local Storage) เพื่อสำรองข้อมูลให้ทำงานได้ทันที กรุณาสร้างตารางใหม่บน Supabase ของท่านเพื่อเชื่อมต่อแบบ Cloud ร่วมกัน
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowSqlGuide(!showSqlGuide)}
                            className="mt-2 text-[10px] text-accent font-black underline hover:text-accent/80 transition-colors uppercase cursor-pointer"
                          >
                            {showSqlGuide ? "✕ ซ่อนสคริปต์ SQL" : "☞ แสดงชุดคำสั่ง SQL สำหรับสร้างตารางบน Supabase"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400">
                          ข้อมูลรหัสพนักงานทั้งหมด ซิงค์แบบคลาวด์เรียลไทม์กับดาต้าเบส Supabase ตาราง: <code className="font-mono bg-slate-100 px-1 border border-slate-200/50 rounded font-bold text-slate-600">system_users</code>
                        </p>
                      )}

                      {/* Expandable SQL Guide */}
                      {showSqlGuide && (
                        <div className="p-3 bg-slate-950 text-emerald-400 rounded-xl space-y-2 border border-slate-800 font-mono text-[10px] select-all leading-normal">
                          <div className="flex justify-between items-center text-[9px] text-slate-400 border-b border-slate-800 pb-1 mb-1 font-sans font-bold">
                            <span>คัดลอก SQL นี้ไปกดรันใน SQL Editor ของ Supabase:</span>
                            <span className="text-emerald-500">SQL Schema</span>
                          </div>
                          <pre className="overflow-x-auto whitespace-pre">
{`CREATE TABLE IF NOT EXISTS public.system_users (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT ''
);

-- เพิ่มข้อมูลของเจ้าของร้านคนแรก เริ่มต้นด้วยรหัสผ่าน 1234
INSERT INTO public.system_users (name, role, pin, phone)
VALUES ('เจ้าของร้าน', 'เจ้าของร้าน', '1234', '-')
ON CONFLICT (pin) DO NOTHING;`}
                          </pre>
                        </div>
                      )}
                    </div>

                    {systemUsers.length === 0 ? (
                      <div className="py-12 text-center text-secondary text-xs">
                        ไม่พบฐานข้อมูลหรือผู้ใช้งานระบบ...
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
                        {systemUsers.map((user) => (
                          <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                                user.role === 'เจ้าของร้าน' 
                                  ? "bg-accent/15 text-accent border border-accent/20" 
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              )}>
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-primary flex items-center gap-2">
                                  {user.name}
                                  <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                                    user.role === 'เจ้าของร้าน' ? "bg-accent text-white" : "bg-slate-100 text-secondary border border-slate-200"
                                  )}>
                                    {user.role}
                                  </span>
                                </div>
                                <div className="text-[10px] text-secondary mt-0.5">
                                  เบอร์โทร: {user.phone || '-'} | รหัส PIN: <span className="font-mono text-xs font-black text-slate-700 select-all">••••</span> 
                                  {currentUser?.role === 'เจ้าของร้าน' && (
                                    <span className="font-mono text-[10px] text-accent font-bold ml-1">({user.pin})</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setSettingsTab('edit');
                                  setUserForm({
                                    name: user.name,
                                    role: user.role,
                                    pin: user.pin,
                                    phone: user.phone || ''
                                  });
                                  setSettingsError('');
                                }}
                                className="p-1 px-2 text-xs font-bold text-accent bg-accent/5 hover:bg-accent/10 border border-accent/20 rounded-lg transition-all"
                              >
                                แก้ไข
                              </button>
                              
                              {/* Only allow deleting if it's not the user itself and role is เจ้าของร้าน */}
                              {currentUser?.id !== user.id && (
                                <button
                                  onClick={() => {
                                    showConfirmDialog(
                                      'ยืนยันการลบผู้ใช้งาน?',
                                      `คุณต้องการลบข้อมูลของคุณ "${user.name}" ออกจากระบบถาวรหรือไม่?`,
                                      async () => {
                                        try {
                                          const response = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
                                          if (response.ok) {
                                            showAlertDialog('สำเร็จ', 'ลบผู้ใช้งานเรียบร้อยแล้ว', 'success');
                                            fetchUsers();
                                          } else {
                                            const resJson = await response.json();
                                            showAlertDialog('เกิดข้อผิดพลาด', resJson.error || 'ไม่สามารถลบผู้ใช้ได้');
                                          }
                                        } catch (e) {
                                          showAlertDialog('เกิดข้อผิดพลาด', 'มีข้อผิดพลาดเครือข่าย');
                                        }
                                      }
                                    );
                                  }}
                                  className="p-1 px-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all"
                                >
                                  ลบ
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Add User (add) */}
                {settingsTab === 'add' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!userForm.name.trim()) return setSettingsError('กรุณากรอกชื่อผู้ใช้');
                    if (!userForm.pin.trim() || userForm.pin.length !== 4) return setSettingsError('กรุณากรอกรหัส PIN จำนวน 4 หลัก');
                    
                    setSettingsError('');
                    try {
                      const response = await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userForm)
                      });
                      
                      if (response.ok) {
                        showAlertDialog('สำเร็จ', `เพิ่มผู้ใช้งาน "${userForm.name}" เรียบร้อยแล้ว`, 'success');
                        fetchUsers();
                        setSettingsTab('users');
                      } else {
                        const r = await response.json();
                        setSettingsError(r.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
                      }
                    } catch (err) {
                      setSettingsError('มีข้อผิดพลาดเครือข่าย');
                    }
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block mb-1">
                          ชื่อ-นามสกุลพนักงาน <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="เช่น สมชาย มีสุข"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm font-medium"
                          value={userForm.name}
                          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block mb-1">
                          บทบาท / ตำแหน่ง <span className="text-rose-500">*</span>
                        </label>
                        <select 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm font-semibold"
                          value={userForm.role}
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        >
                          <option value="พนักงาน">พนักงาน (สิทธิ์เข้าคลัง/ขาย เท่านั้น)</option>
                          <option value="เจ้าของร้าน">เจ้าของร้าน (สิทธิ์อ่านรายงานและแก้ไขสต๊อกทั้งหมด)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block mb-1">
                          รหัส PIN ส่วนตัวสำหรับล็อกอิน (4 หลัก) <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="password" 
                          required
                          maxLength={4} 
                          placeholder="••••"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-black tracking-widest focus:ring-2 focus:ring-accent/20 outline-none transition-all mr-2"
                          value={userForm.pin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length <= 4) setUserForm({ ...userForm, pin: val });
                          }}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block mb-1">
                          เบอร์โทรศัพท์ (ถ้ามี)
                        </label>
                        <input 
                          type="tel" 
                          placeholder="เช่น 0891234567"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm"
                          value={userForm.phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setUserForm({ ...userForm, phone: val });
                          }}
                        />
                      </div>
                    </div>

                    {settingsError && (
                      <div className="p-3 bg-red-50 text-rose-600 rounded-xl text-xs font-bold text-center">
                        {settingsError}
                      </div>
                    )}

                    <div className="flex gap-3 justify-end mt-4">
                      <button 
                        type="button"
                        onClick={() => setSettingsTab('users')} 
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl transition-all text-xs"
                      >
                        ยกเลิก
                      </button>
                      <button 
                        type="submit"
                        className="bg-accent hover:bg-accent/90 text-white py-2.5 px-5 rounded-xl transition-all font-bold text-xs"
                      >
                        บันทึกข้อมูลและสร้าง PIN
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 3: Edit User (edit) */}
                {settingsTab === 'edit' && editingUser && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!userForm.name.trim()) return setSettingsError('กรุณากรอกชื่อผู้ใช้');
                    if (!userForm.pin.trim() || userForm.pin.length !== 4) return setSettingsError('กรุณากรอกรหัส PIN จำนวน 4 หลัก');
                    
                    setSettingsError('');
                    try {
                      const response = await fetch(`/api/users/${editingUser.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userForm)
                      });
                      
                      if (response.ok) {
                        showAlertDialog('สำเร็จ', `ปรับปรุงข้อมูลผู้ใช้งาน "${userForm.name}" เรียบร้อยแล้ว`, 'success');
                        
                        // If we are editing currently logged in user, refresh their session
                        if (currentUser?.id === editingUser.id) {
                          const refreshedUser = { ...editingUser, ...userForm };
                          setCurrentUser(refreshedUser);
                          localStorage.setItem('currentUser', JSON.stringify(refreshedUser));
                        }

                        fetchUsers();
                        setSettingsTab('users');
                        setEditingUser(null);
                      } else {
                        const r = await response.json();
                        setSettingsError(r.error || 'เกิดข้อผิดพลาดในการปรับปรุงข้อมูล');
                      }
                    } catch (err) {
                      setSettingsError('มีข้อผิดพลาดเครือข่าย');
                    }
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block mb-1">
                          ชื่อ-นามสกุลพนักงาน <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="เช่น สมชาย มีสุข"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm font-medium"
                          value={userForm.name}
                          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block mb-1">
                          บทบาท / ตำแหน่ง <span className="text-rose-500">*</span>
                        </label>
                        <select 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm font-semibold"
                          value={userForm.role}
                          disabled={currentUser?.id === editingUser.id && currentUser.role === 'เจ้าของร้าน'} // Don't let primary owner change their own role accidentally to staff!
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        >
                          <option value="พนักงาน">พนักงาน (สิทธิ์เข้าคลัง/ขาย เท่านั้น)</option>
                          <option value="เจ้าของร้าน">เจ้าของร้าน (สิทธิ์อ่านรายงานและแก้ไขสต๊อกทั้งหมด)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block mb-1">
                          รหัส PIN ส่วนตัวสำหรับล็อกอิน (4 หลัก) <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="password" 
                          required
                          maxLength={4} 
                          placeholder="••••"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-black tracking-widest focus:ring-2 focus:ring-accent/20 outline-none transition-all mr-2"
                          value={userForm.pin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length <= 4) setUserForm({ ...userForm, pin: val });
                          }}
                        />
                        <span className="text-[9px] text-secondary mt-1 block px-1">
                          *กรุณาจำรหัสผ่านนี้เพื่อความปลอดภัย
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block mb-1">
                          เบอร์โทรศัพท์
                        </label>
                        <input 
                          type="tel" 
                          placeholder="เช่น 0891234567"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm"
                          value={userForm.phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setUserForm({ ...userForm, phone: val });
                          }}
                        />
                      </div>
                    </div>

                    {settingsError && (
                      <div className="p-3 bg-red-50 text-rose-600 rounded-xl text-xs font-bold text-center">
                        {settingsError}
                      </div>
                    )}

                    <div className="flex gap-3 justify-end mt-4">
                      <button 
                        type="button"
                        onClick={() => {
                          setSettingsTab('users');
                          setEditingUser(null);
                        }} 
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl transition-all text-xs"
                      >
                        ยกเลิก
                      </button>
                      <button 
                        type="submit"
                        className="bg-accent hover:bg-accent/90 text-white py-2.5 px-5 rounded-xl transition-all font-bold text-xs"
                      >
                        บันทึกการแก้ไข
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 4: Manage Categories (categories) */}
                {settingsTab === 'categories' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-secondary text-xs font-bold px-1">
                      <span>จัดการหมวดหมู่ / ประเภทสินค้า</span>
                      {categoriesSource === 'supabase' ? (
                        <span className="text-[10px] bg-emerald-500 text-white font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          Supabase Cloud (Active)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500 text-white font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          Local Database Fallback
                        </span>
                      )}
                    </div>

                    {/* Database Storage Engine Indicator for Categories */}
                    {categoriesSource !== 'supabase' && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl flex flex-col gap-2">
                        <div className="text-[11px] text-slate-600 leading-relaxed bg-amber-50/40 border border-amber-100 p-2.5 rounded-xl">
                          <p className="font-semibold text-amber-800">
                            ⚠️ ยังไม่พบตาราง <code className="font-mono bg-white px-1 border border-amber-200 rounded text-amber-900 text-xs font-bold">categories</code> บน Supabase Cloud
                          </p>
                          <p className="mt-1">
                            ขณะนี้ระบบสร้างหมวดหมู่ในตัวจัดเก็บข้อมูลท้องถิ่น (Local Storage) เพื่อให้ใช้งานได้ทันที กรุณาสร้างตารางใหม่บนคลาวด์ Supabase ของท่านเพื่อทำงานแบบเรียลไทม์
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowCategorySqlGuide(!showCategorySqlGuide)}
                            className="mt-2 text-[10px] text-accent font-black underline hover:text-accent/80 transition-colors uppercase cursor-pointer"
                          >
                            {showCategorySqlGuide ? "✕ ซ่อนสคริปต์ SQL" : "☞ แสดงชุดคำสั่ง SQL สำหรับสร้างตารางบน Supabase"}
                          </button>
                        </div>

                        {showCategorySqlGuide && (
                          <div className="p-3 bg-slate-950 text-emerald-400 rounded-xl space-y-2 border border-slate-800 font-mono text-[10px] select-all leading-normal">
                            <div className="flex justify-between items-center text-[9px] text-slate-400 border-b border-slate-800 pb-1 mb-1 font-sans font-bold">
                              <span>คัดลอก SQL นี้ไปกดรันใน SQL Editor ของ Supabase:</span>
                              <span className="text-emerald-500 font-bold">SQL Schema</span>
                            </div>
                            <pre className="overflow-x-auto whitespace-pre">
{`CREATE TABLE IF NOT EXISTS public.categories (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL UNIQUE
);`}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add / Edit Category Input Form */}
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!categoryForm.name.trim()) return;
                        if (editingCategory) {
                          await handleEditCategory(editingCategory.id, categoryForm.name);
                        } else {
                          await handleAddCategory(categoryForm.name);
                        }
                      }}
                      className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-end gap-3"
                    >
                      <div className="flex-1">
                        <label className="text-[10px] font-extrabold text-secondary uppercase tracking-widest block mb-1">
                          {editingCategory ? "แก้ไขชื่อประเภทสินค้า" : "เพิ่มประเภทสินค้าใหม่"}
                        </label>
                        <input 
                          type="text"
                          required
                          placeholder="เช่น เครื่องดื่ม, ของหวาน, อาหารแห้ง..."
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm font-semibold"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ name: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {editingCategory && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(null);
                              setCategoryForm({ name: '' });
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                          >
                            ยกเลิก
                          </button>
                        )}
                        <button
                          type="submit"
                          className="bg-accent hover:bg-accent/90 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md transition-all flex items-center gap-1"
                        >
                          {editingCategory ? "บันทึก" : "เพิ่ม"}
                        </button>
                      </div>
                    </form>

                    {/* Categories List View */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 p-3 px-4 border-b border-slate-100 text-[10px] font-bold text-secondary uppercase tracking-widest">
                        รายการประเภทสินค้าทั้งหมด ({categories.length})
                      </div>
                      <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto bg-white">
                        {categories.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                            ไม่มีประเภทสินค้าในระบบ
                          </div>
                        ) : (
                          categories.map((cat) => (
                            <div key={cat.id} className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <span className="font-bold text-sm text-primary flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                                {cat.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategory(cat);
                                    setCategoryForm({ name: cat.name });
                                  }}
                                  className="p-1 px-2.5 text-xs font-bold text-accent bg-accent/5 hover:bg-accent/10 border border-accent/20 rounded-lg transition-all flex items-center gap-1"
                                >
                                  <Edit2 size={12} /> แก้ไข
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1 px-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all"
                                >
                                  ลบ
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
