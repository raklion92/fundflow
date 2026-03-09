/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings2, 
  QrCode, 
  BookOpen, 
  Bell, 
  Settings,
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Copy,
  Download,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { API_BASE_URL } from './config';

// --- Types ---
interface Role {
  id: number;
  role_name: string;
  monthly_amount: number;
}

interface Member {
  id: number;
  full_name: string;
  role_id: number;
  role_name: string;
  monthly_amount: number;
  status: string;
  current_payment_status: string | null;
  total_paid: number;
}

interface Transaction {
  id: number;
  type: 'Income' | 'Expense';
  description: string;
  amount: number;
  date: string;
  created_by: string;
}

interface Stats {
  balance: number;
  collected: number;
  expected: number;
  paidCount: number;
  unpaidCount: number;
  totalIncome: number;
  totalExpense: number;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon: Icon, color, subtitle }: { title: string, value: string, icon: any, color: string, subtitle?: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {subtitle && <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{subtitle}</span>}
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1 font-display">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 font-display">{value}</p>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="px-6 py-4 border-bottom border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 font-display">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Form states
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, rolesRes, membersRes, transRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/stats`),
        fetch(`${API_BASE_URL}/api/roles`),
        fetch(`${API_BASE_URL}/api/members`),
        fetch(`${API_BASE_URL}/api/transactions`),
        fetch(`${API_BASE_URL}/api/settings`)
      ]);

      setStats(await statsRes.json());
      setRoles(await rolesRes.json());
      setMembers(await membersRes.json());
      setTransactions(await transRes.json());
      setSettings(await settingsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleTogglePayment = async (memberId: number) => {
    const now = new Date();
    await fetch(`${API_BASE_URL}/api/payments/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId,
        month: now.getMonth() + 1,
        year: now.getFullYear()
      })
    });
    fetchData();
  };

  const handleSaveMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      full_name: formData.get('full_name'),
      role_id: parseInt(formData.get('role_id') as string),
      monthly_amount: parseInt(formData.get('monthly_amount') as string),
      status: formData.get('status')
    };

    const url = editingMember ? `/api/members/${editingMember.id}` : '/api/members';
    const method = editingMember ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    setIsMemberModalOpen(false);
    setEditingMember(null);
    fetchData();
  };

  const handleDeleteMember = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa thành viên này?')) {
      await fetch(`/api/members/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleSaveRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      role_name: formData.get('role_name'),
      monthly_amount: parseInt(formData.get('monthly_amount') as string)
    };

    const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
    const method = editingRole ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    setIsRoleModalOpen(false);
    setEditingRole(null);
    fetchData();
  };

  const handleSaveTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get('type'),
      description: formData.get('description'),
      amount: parseInt(formData.get('amount') as string),
      date: new Date().toISOString()
    };

    await fetch(`${API_BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    setIsTransactionModalOpen(false);
    fetchData();
  };

  const handleUpdateQR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await fetch(`${API_BASE_URL}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'qr_image', value: base64String })
        });
        fetchData();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateThreshold = async (val: string) => {
    await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'low_balance_threshold', value: val })
    });
    fetchData();
  };

  const generateReminder = () => {
    const unpaid = members.filter(m => m.status === 'Active' && m.current_payment_status !== 'Paid');
    if (unpaid.length === 0) return "Tất cả thành viên đã đóng quỹ tháng này!";

    const amount = unpaid[0]?.monthly_amount || 0;
    const memberList = unpaid.map(m => `* ${m.full_name}`).join('\n');

    return `Chào mọi người,

Đây là lời nhắc đóng góp quỹ hàng tháng.

Các thành viên sau đây chưa hoàn thành đóng góp cho tháng này:

${memberList}

Mức đóng góp hàng tháng: ${formatCurrency(amount)}

Vui lòng chuyển khoản bằng mã QR bên dưới.

Trân trọng cảm ơn.`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Đang tải FundFlow...</p>
      </div>
    </div>
  );

  const isLowBalance = stats && stats.balance < parseInt(settings.low_balance_threshold || '0');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 p-6 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Wallet className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">FundFlow</h1>
        </div>

        <nav className="space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Bảng điều khiển" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Users} label="Thành viên" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
          <SidebarItem icon={Settings2} label="Cài đặt Chức vụ" active={activeTab === 'roles'} onClick={() => setActiveTab('roles')} />
          <SidebarItem icon={QrCode} label="QR Thanh toán" active={activeTab === 'qr'} onClick={() => setActiveTab('qr')} />
          <SidebarItem icon={BookOpen} label="Sổ quỹ" active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} />
          <SidebarItem icon={Bell} label="Lời nhắc" active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} />
          <SidebarItem icon={Settings} label="Cài đặt" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="absolute bottom-8 left-6 right-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase mb-2">Số dư hiện tại</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(stats?.balance || 0)}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 capitalize font-display">{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               Hệ thống Trực tuyến
             </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {isLowBalance && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4 text-amber-800"
            >
              <AlertTriangle className="text-amber-500 shrink-0" />
              <div>
                <p className="font-bold">Cảnh báo Số dư Thấp</p>
                <p className="text-sm opacity-90">Số dư quỹ hiện tại thấp hơn ngưỡng an toàn đã thiết lập là {formatCurrency(parseInt(settings.low_balance_threshold || '0'))}.</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Tổng số dư" value={formatCurrency(stats?.balance || 0)} icon={Wallet} color="bg-indigo-600" />
                <StatCard title="Đã thu (Tháng này)" value={formatCurrency(stats?.collected || 0)} icon={TrendingUp} color="bg-emerald-500" subtitle={`${stats?.paidCount} Đã đóng`} />
                <StatCard title="Dự kiến (Tháng này)" value={formatCurrency(stats?.expected || 0)} icon={TrendingDown} color="bg-slate-400" subtitle={`${stats?.unpaidCount} Chưa đóng`} />
                <StatCard title="Tổng chi phí" value={formatCurrency(stats?.totalExpense || 0)} icon={Trash2} color="bg-rose-500" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 font-display">Trạng thái Đóng góp</h3>
                  <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded uppercase">{new Date().toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Thành viên</th>
                        <th className="px-6 py-4 font-semibold">Chức vụ</th>
                        <th className="px-6 py-4 font-semibold">Số tiền</th>
                        <th className="px-6 py-4 font-semibold">Trạng thái</th>
                        <th className="px-6 py-4 font-semibold">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {members.filter(m => m.status === 'Active').map(member => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{member.full_name}</td>
                          <td className="px-6 py-4 text-slate-600">{member.role_name}</td>
                          <td className="px-6 py-4 text-slate-600">{formatCurrency(member.monthly_amount)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              member.current_payment_status === 'Paid' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {member.current_payment_status === 'Paid' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {member.current_payment_status === 'Paid' ? 'Đã đóng' : 'Chưa đóng'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => handleTogglePayment(member.id)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                                member.current_payment_status === 'Paid'
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                              }`}
                            >
                              {member.current_payment_status === 'Paid' ? 'Đánh dấu Chưa đóng' : 'Đánh dấu Đã đóng'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm thành viên..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <button 
                  onClick={() => { setEditingMember(null); setIsMemberModalOpen(true); }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  <Plus size={20} /> Thêm Thành viên
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Họ và tên</th>
                      <th className="px-6 py-4 font-semibold">Chức vụ</th>
                      <th className="px-6 py-4 font-semibold">Mức đóng hàng tháng</th>
                      <th className="px-6 py-4 font-semibold">Tổng đã đóng</th>
                      <th className="px-6 py-4 font-semibold">Trạng thái</th>
                      <th className="px-6 py-4 font-semibold">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map(member => (
                      <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{member.full_name}</td>
                        <td className="px-6 py-4 text-slate-600">{member.role_name}</td>
                        <td className="px-6 py-4 text-slate-600">{formatCurrency(member.monthly_amount)}</td>
                        <td className="px-6 py-4 text-indigo-600 font-bold">{formatCurrency(member.total_paid)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            member.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {member.status === 'Active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => { setEditingMember(member); setIsMemberModalOpen(true); }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button 
                  onClick={() => { setEditingRole(null); setIsRoleModalOpen(true); }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  <Plus size={20} /> Thêm Chức vụ
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                  <div key={role.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Settings2 size={24} />
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingRole(role); setIsRoleModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={async () => { if(confirm('Xóa chức vụ này?')) { await fetch(`/api/roles/${role.id}`, { method: 'DELETE' }); fetchData(); } }} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1 font-display">{role.role_name}</h4>
                    <p className="text-indigo-600 font-bold text-xl font-display">{formatCurrency(role.monthly_amount)}</p>
                    <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-medium">Đóng góp hàng tháng</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 font-display">Cài đặt QR Thanh toán</h3>
                  <p className="text-slate-500">Tải lên mã QR tài khoản ngân hàng của bạn. Mã này sẽ được đính kèm trong các lời nhắc thanh toán.</p>
                </div>

                <div className="relative group mx-auto w-64 h-64 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden mb-8">
                  {settings.qr_image ? (
                    <>
                      <img src={settings.qr_image} alt="Mã QR" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                          <Edit2 size={16} /> Thay đổi ảnh
                          <input type="file" className="hidden" accept="image/*" onChange={handleUpdateQR} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-3 text-slate-400 hover:text-indigo-600 transition-colors">
                      <QrCode size={48} />
                      <span className="font-medium">Nhấp để tải lên mã QR</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleUpdateQR} />
                    </label>
                  )}
                </div>

                {settings.qr_image && (
                  <div className="flex justify-center gap-4">
                    <button onClick={() => { const link = document.createElement('a'); link.href = settings.qr_image; link.download = 'payment-qr.png'; link.click(); }} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold transition-colors">
                      <Download size={18} /> Tải xuống
                    </button>
                    <button onClick={async () => { if(confirm('Xóa mã QR?')) { await fetch(`${API_BASE_URL}/api/settings`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({key: 'qr_image', value: ''}) }); fetchData(); } }} className="flex items-center gap-2 text-slate-600 hover:text-rose-600 font-bold transition-colors">
                      <Trash2 size={18} /> Xóa
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">Số dư hiện tại</p>
                  <p className="text-2xl font-bold text-slate-900 font-display">{formatCurrency(stats?.balance || 0)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-emerald-600 text-sm font-medium mb-1 font-display">Tổng Thu</p>
                  <p className="text-2xl font-bold text-emerald-600 font-display">+{formatCurrency(stats?.totalIncome || 0)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-rose-600 text-sm font-medium mb-1 font-display">Tổng Chi</p>
                  <p className="text-2xl font-bold text-rose-600 font-display">-{formatCurrency(stats?.totalExpense || 0)}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => setIsTransactionModalOpen(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  <Plus size={20} /> Ghi nhận Giao dịch
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Ngày</th>
                      <th className="px-6 py-4 font-semibold">Loại</th>
                      <th className="px-6 py-4 font-semibold">Mô tả</th>
                      <th className="px-6 py-4 font-semibold">Số tiền</th>
                      <th className="px-6 py-4 font-semibold">Người tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-600 text-sm">{new Date(tx.date).toLocaleDateString('vi-VN')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            tx.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {tx.type === 'Income' ? 'Thu' : 'Chi'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-medium">{tx.description}</td>
                        <td className={`px-6 py-4 font-bold ${tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'Income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{tx.created_by === 'Admin' ? 'Quản trị viên' : tx.created_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reminders' && (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 font-display">Tạo Lời nhắc Thanh toán</h3>
                  <p className="text-slate-500">Tạo thông điệp nhắc nhở chuyên nghiệp cho các thành viên chưa đóng quỹ.</p>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nội dung Thông điệp</label>
                    <textarea 
                      readOnly
                      value={generateReminder()}
                      className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none text-slate-700 font-mono text-sm resize-none"
                    />
                      <button 
                        onClick={() => { navigator.clipboard.writeText(generateReminder()); alert('Đã sao chép vào bộ nhớ tạm!'); }}
                        className="absolute right-4 bottom-4 bg-white text-indigo-600 p-2 rounded-xl border border-slate-200 shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 font-bold text-xs"
                      >
                        <Copy size={16} /> Sao chép Nội dung
                      </button>
                  </div>

                  <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-600 text-white rounded-xl">
                        <QrCode size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-indigo-900">Đính kèm Mã QR</p>
                        <p className="text-sm text-indigo-700 opacity-80">Mã QR đã sẵn sàng để tải xuống.</p>
                      </div>
                    </div>
                    {settings.qr_image ? (
                      <button onClick={() => { const link = document.createElement('a'); link.href = settings.qr_image; link.download = 'payment-qr.png'; link.click(); }} className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-2">
                        <Download size={18} /> Tải xuống QR
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Chưa thiết lập QR</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-400 text-sm italic">
                    <ChevronRight size={16} />
                    <span>Mẹo: Sao chép thông điệp và dán vào nhóm Zalo hoặc Email của bạn.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 font-display">Cài đặt Chung</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Ngưỡng Cảnh báo Số dư Thấp (VNĐ)</label>
                    <div className="flex gap-4">
                      <input 
                        type="number" 
                        defaultValue={settings.low_balance_threshold}
                        onBlur={(e) => handleUpdateThreshold(e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all">Lưu</button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Hệ thống sẽ hiển thị cảnh báo nếu số dư giảm xuống dưới mức này.</p>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-4">Thông tin Hệ thống</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Tổng Thành viên</p>
                        <p className="text-lg font-bold text-slate-900">{members.length}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Chức vụ Hoạt động</p>
                        <p className="text-lg font-bold text-slate-900">{roles.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title={editingMember ? 'Sửa Thành viên' : 'Thêm Thành viên Mới'}>
        <form onSubmit={handleSaveMember} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Họ và tên</label>
            <input name="full_name" defaultValue={editingMember?.full_name} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Chức vụ</label>
            <select 
              name="role_id" 
              defaultValue={editingMember?.role_id} 
              required 
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              onChange={(e) => {
                const role = roles.find(r => r.id === parseInt(e.target.value));
                if (role) {
                  const amountInput = document.getElementById('monthly_amount_input') as HTMLInputElement;
                  if (amountInput) amountInput.value = role.monthly_amount.toString();
                }
              }}
            >
              <option value="">Chọn một chức vụ</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Mức đóng hàng tháng (VNĐ)</label>
            <input id="monthly_amount_input" name="monthly_amount" type="number" defaultValue={editingMember?.monthly_amount} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Trạng thái</label>
            <select name="status" defaultValue={editingMember?.status || 'Active'} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="Active">Đang hoạt động</option>
              <option value="Inactive">Ngừng hoạt động</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            {editingMember ? 'Cập nhật Thành viên' : 'Thêm Thành viên'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title={editingRole ? 'Sửa Chức vụ' : 'Thêm Chức vụ Mới'}>
        <form onSubmit={handleSaveRole} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tên Chức vụ</label>
            <input name="role_name" defaultValue={editingRole?.role_name} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Mức đóng hàng tháng (VNĐ)</label>
            <input name="monthly_amount" type="number" defaultValue={editingRole?.monthly_amount} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            {editingRole ? 'Cập nhật Chức vụ' : 'Thêm Chức vụ'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} title="Ghi nhận Giao dịch">
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Loại</label>
            <select name="type" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="Income">Thu</option>
              <option value="Expense">Chi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Mô tả</label>
            <input name="description" required placeholder="VD: Văn phòng phẩm, Quỹ cà phê..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Số tiền (VNĐ)</label>
            <input name="amount" type="number" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            Ghi nhận Giao dịch
          </button>
        </form>
      </Modal>
    </div>
  );
}
