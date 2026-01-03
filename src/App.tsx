import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  onAuthStateChanged,
  signOut,
 type User
} from 'firebase/auth';
import {
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';
// import img from "../logo.PNG";
import {
  Car, Fuel, Plus, Download, Trash2, Edit2, History, ShoppingBag,
  Home, Handshake, Gauge, LogOut, Lock, MessageCircle, ChevronDown, Info,
  Clock, Banknote // <--- Added these back because they are used in Loan cards
  // Wallet was removed because you commented it out
} from 'lucide-react';

import type { MileageLog, ExpenseLog, LoanLog, TabView, DashboardMode } from './components/types';
import { formatCurrency, formatDate } from './components/utils';
import { ExpenseModal, MileageModal, LoanModal, RepaymentModal } from './components/Modals';
import Auth from './components/Auth';
import { auth, db, appId } from './components/firebaseConfig';

// --- LAZY LOAD CHARTS ---
const Recharts = React.lazy(() => import('recharts').then(module => ({
  default: ({ data, expenses }: { data: any[], expenses: any[] }) => {
    const { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = module;
    const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];

    return (
      <>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm h-72">
          <p className="text-xs font-bold text-slate-400 uppercase mb-4">Spending by Category</p>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={Object.entries(expenses.reduce((acc, curr) => {
                  acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
                  return acc;
                }, {} as any)).map(([name, value]) => ({ name, value }))}
                innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
              >
                {expenses.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm h-72">
          <p className="text-xs font-bold text-slate-400 uppercase mb-4">Loan Portfolio</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
              {/* Fixed Type Error: Handle undefined value properly */}
              <Tooltip formatter={(value: number | undefined) => [formatCurrency(value || 0), "Amount"]} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>
    );
  }
})));

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen bg-slate-50">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
  </div>
);

// --- LOCKED SCREEN COMPONENT ---
const LockedScreen = ({ onLogout }: { onLogout: () => void }) => {
  const message = encodeURIComponent("Hello, I want to subscribe to Trade2cart Finance.\n\nPrices:\n- Monthly: ₹10\n- Yearly: ₹100\n\nPlease let me know the payment details.");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Free Trial Expired</h2>
        <p className="text-slate-500 mb-6 text-sm">
          Your 7-day free trial has ended. Subscribe to continue using the app.
        </p>

        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Subscription Plans</p>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-600">Monthly</span>
            <span className="text-sm font-bold text-slate-800">₹10 / mo</span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-200 pt-2">
            <span className="text-sm font-medium text-slate-600">Yearly</span>
            <span className="text-sm font-bold text-slate-800">₹100 / yr</span>
          </div>
        </div>

        <button
          onClick={() => window.open(`https://wa.me/918903166106?text=${message}`, '_blank')}
          className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all active:scale-95 mb-4"
        >
          <MessageCircle className="w-5 h-5" />
          Subscribe via WhatsApp
        </button>

        <button onClick={onLogout} className="text-slate-400 text-sm font-bold hover:text-slate-600">
          Log Out
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Access State
  const [hasAccess, setHasAccess] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [dashMode, setDashMode] = useState<DashboardMode>('wallet');

  // Data State
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseLog[]>([]);
  const [loans, setLoans] = useState<LoanLog[]>([]);

  // Pagination
  const [historyLimit, setHistoryLimit] = useState(20);

  // UI State
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [modalType, setModalType] = useState<'mileage' | 'expense' | 'loan' | 'repayment' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanLog | null>(null);

  // --- Auth Listener ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Data & Subscription Sync ---
  useEffect(() => {
    if (!user) {
      setMileageLogs([]);
      setExpenses([]);
      setLoans([]);
      return;
    }

    // 1. Subscription Logic
    const unsubSub = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid), (docSnap) => {
      const data = docSnap.data();
      const now = Date.now();

      let createdAt = now;
      if (data?.createdAt) {
        createdAt = typeof data.createdAt.toMillis === 'function' ? data.createdAt.toMillis() : data.createdAt;
      }

      let subDate = 0;
      if (data?.subscriptionDate) {
        subDate = typeof data.subscriptionDate.toMillis === 'function' ? data.subscriptionDate.toMillis() : data.subscriptionDate;
      }

      const subType = data?.subscription || 'free';

      let allowed = false;
      if (subType === 'free') {
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const timePassed = now - createdAt;
        if (timePassed < sevenDays) {
          allowed = true;
          setDaysLeft(Math.ceil((sevenDays - timePassed) / (24 * 60 * 60 * 1000)));
        } else {
          setDaysLeft(0);
        }
      } else if (subType === 'monthly') {
        if ((now - subDate) < (30 * 24 * 60 * 60 * 1000)) allowed = true;
      } else if (subType === 'yearly') {
        if ((now - subDate) < (365 * 24 * 60 * 60 * 1000)) allowed = true;
      }

      setHasAccess(allowed);
      setLoading(false);
    });

    // 2. Data Listeners
    const unsubMileage = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'mileage_logs'), (snap) => {
      setMileageLogs(snap.docs.map(d => ({ id: d.id, type: 'mileage', ...d.data() } as MileageLog)).sort((a, b) => b.odometer - a.odometer));
    });

    const unsubExpenses = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, type: 'expense', ...d.data() } as ExpenseLog)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    const unsubLoans = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'loans'), (snap) => {
      setLoans(snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, type: 'loan', ...data, repayments: data.repayments || [] } as LoanLog;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    return () => { unsubSub(); unsubMileage(); unsubExpenses(); unsubLoans(); };
  }, [user]);

  // --- Handlers ---
  const handleSave = async (e: React.FormEvent, type: 'mileage' | 'expense' | 'loan' | 'repayment') => {
    e.preventDefault();
    if (!user) return;
    const form = e.target as HTMLFormElement;

    if (type === 'mileage') {
      const reading = parseFloat((form.elements.namedItem('reading') as HTMLInputElement).value);
      const date = (form.elements.namedItem('date') as HTMLInputElement).value;
      const fuelStatus = (form.elements.namedItem('fuelStatus') as HTMLInputElement).value;
      if (editItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'mileage_logs', editItem.id), { odometer: reading, date, fuelStatus });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'mileage_logs'), { date, odometer: reading, distance: 0, fuelStatus, timestamp: Date.now() });
      }
    } else if (type === 'expense') {
      const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
      const category = (form.elements.namedItem('category') as HTMLInputElement).value;
      const note = (form.elements.namedItem('note') as HTMLInputElement).value;
      const date = (form.elements.namedItem('date') as HTMLInputElement).value;
      const fuelPriceEl = form.elements.namedItem('fuelPrice') as HTMLInputElement | null;
      const fuelVolumeEl = form.elements.namedItem('fuelVolume') as HTMLInputElement | null;
      const linkedOdometerEl = form.elements.namedItem('linkedOdometer') as HTMLInputElement | null;

      const data = {
        date, category, amount, note, timestamp: Date.now(),
        fuelPrice: fuelPriceEl?.value ? parseFloat(fuelPriceEl.value) : null,
        fuelVolume: fuelVolumeEl?.value ? parseFloat(fuelVolumeEl.value) : null,
      };

      if (editItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', editItem.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), data);
        if (category === 'Fuel' && linkedOdometerEl?.value) {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'mileage_logs'), {
            date, odometer: parseFloat(linkedOdometerEl.value), distance: 0, fuelStatus: 'Main', timestamp: Date.now()
          });
        }
      }
    } else if (type === 'loan') {
      const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
      const data = {
        loanType: (form.elements.namedItem('loanType') as HTMLInputElement).value,
        person: (form.elements.namedItem('person') as HTMLInputElement).value,
        amount,
        date: (form.elements.namedItem('date') as HTMLInputElement).value,
        dueDate: (form.elements.namedItem('dueDate') as HTMLInputElement).value,
        note: (form.elements.namedItem('note') as HTMLInputElement).value,
        repayments: editItem?.repayments || []
      };
      if (editItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', editItem.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'loans'), { ...data, timestamp: Date.now() });
      }
    } else if (type === 'repayment' && selectedLoan) {
      const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
      const rep = {
        id: crypto.randomUUID(),
        amount,
        date: (form.elements.namedItem('date') as HTMLInputElement).value,
        note: (form.elements.namedItem('note') as HTMLInputElement).value
      };
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', selectedLoan.id), {
        repayments: [...selectedLoan.repayments, rep]
      });
    }
    setModalType(null); setEditItem(null); setSelectedLoan(null); setIsFabOpen(false);
  };

  const deleteItem = async (col: string, id: string) => {
    if (confirm("Delete this item?")) await deleteDoc(doc(db, 'artifacts', appId, 'users', user!.uid, col, id));
  };

  const exportCSV = () => {
    let csv = "Type,Date,Details,Amount,Status\n";
    expenses.forEach(e => csv += `Expense,${e.date},${e.category} - ${e.note},${e.amount},Completed\n`);
    loans.forEach(l => csv += `Loan,${l.date},${l.loanType} ${l.person},${l.amount},${(l.repayments || []).reduce((s, r) => s + r.amount, 0) >= l.amount ? 'Settled' : 'Open'}\n`);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "trade2cart_finance.csv";
    link.click();
  };

  // --- STATS ---
  const stats = useMemo(() => {
    const sortedLogs = [...mileageLogs].sort((a, b) => b.odometer - a.odometer);
    const currentOdometer = sortedLogs.length > 0 ? sortedLogs[0].odometer : 0;
    const initialOdometer = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].odometer : 0;
    const totalDistance = currentOdometer - initialOdometer;

    const vehicleExpenses = expenses.filter(e => ['Fuel', 'Maintenance', 'Service', 'Insurance', 'Toll'].includes(e.category)).reduce((acc, log) => acc + log.amount, 0);
    const totalFuelVolume = expenses.filter(e => e.category === 'Fuel' && e.fuelVolume).reduce((acc, log) => acc + (log.fuelVolume || 0), 0);

    const costPerKm = totalDistance > 0 ? (vehicleExpenses / totalDistance).toFixed(2) : '---';
    const averageMileage = totalFuelVolume > 0 && totalDistance > 0 ? (totalDistance / totalFuelVolume).toFixed(1) : '---';

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlySpend = expenses.filter(e => e.date.startsWith(currentMonth)).reduce((acc, log) => acc + log.amount, 0);

    let owedByMe = 0; let owedToMe = 0;
    loans.forEach(l => {
      const balance = l.amount - (l.repayments || []).reduce((sum, r) => sum + r.amount, 0);
      if (balance > 0) l.loanType === 'taken' ? owedByMe += balance : owedToMe += balance;
    });

    return {
      currentOdometer, totalDistance, vehicleExpenses, costPerKm, averageMileage, monthlySpend, owedByMe, owedToMe, netBalance: owedToMe - owedByMe,
      needsMoreData: mileageLogs.length === 1
    };
  }, [mileageLogs, expenses, loans]);

  // --- HISTORY ---
  const combinedHistory = useMemo(() => {
    return [...expenses, ...mileageLogs, ...loans]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.timestamp - a.timestamp);
  }, [expenses, mileageLogs, loans]);

  const visibleHistory = useMemo(() => {
    return combinedHistory.slice(0, historyLimit).reduce((groups, item) => {
      const date = formatDate(item.date);
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    }, {} as Record<string, any[]>);
  }, [combinedHistory, historyLimit]);

  if (loading) return <LoadingSpinner />;
  if (!user) return <Auth />;
  if (!hasAccess) return <LockedScreen onLogout={() => signOut(auth)} />;

  const loanStatsData = [{ name: 'Owed to Me', value: stats.owedToMe, fill: '#10B981' }, { name: 'I Owe', value: stats.owedByMe, fill: '#EF4444' }];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans text-slate-800">

      {/* Header */}
      <header className="bg-white sticky top-0 z-20 border-b border-slate-100 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Wallet icon commented out as per your code */}
            {/* <div className="bg-orange-100 p-2 rounded-xl text-orange-600"><Wallet className="w-5 h-5" /></div> */}
            <img
              src="/logo.PNG"
              alt="Logo"
              className="h-12 w-12 rounded-lg bg-white p-1 shadow-md object-contain"
            />
            <div>
              <span className="font-bold text-lg text-slate-800 block leading-tight">Trade2cart</span>
              <span className="text-[10px] text-slate-400 font-bold tracking-wider">FINANCE</span>
            </div>
            {daysLeft > 0 && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{daysLeft} days trial</span>}
          </div>
          <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-red-500 p-2 bg-slate-50 rounded-full transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              <button onClick={() => setDashMode('wallet')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${dashMode === 'wallet' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Wallet</button>
              <button onClick={() => setDashMode('vehicle')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${dashMode === 'vehicle' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Vehicle</button>
            </div>

            {dashMode === 'wallet' ? (
              <>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Spent This Month</p>
                  <h2 className="text-4xl font-bold">{formatCurrency(stats.monthlySpend)}</h2>
                  <div className="mt-6 pt-4 border-t border-slate-700/50 flex gap-3">
                    <div className="bg-white/5 flex-1 p-3 rounded-lg border border-white/10">
                      <p className="text-[10px] text-red-300 uppercase mb-0.5">I Owe</p>
                      <p className="font-bold text-lg">{formatCurrency(stats.owedByMe)}</p>
                    </div>
                    <div className="bg-white/5 flex-1 p-3 rounded-lg border border-white/10">
                      <p className="text-[10px] text-green-300 uppercase mb-0.5">Owed to Me</p>
                      <p className="font-bold text-lg">{formatCurrency(stats.owedToMe)}</p>
                    </div>
                  </div>
                </div>
                {/* Recent Items */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
                  {expenses.slice(0, 3).map(e => (
                    <div key={e.id} className="p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${['Fuel', 'Service'].includes(e.category) ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {['Fuel', 'Service'].includes(e.category) ? <Car className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-800">{e.category}</p>
                          <p className="text-xs text-slate-400">{formatDate(e.date)}</p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-700">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <Car className="w-6 h-6 text-blue-600 mb-2" />
                    <p className="text-xs text-slate-400 font-bold uppercase">Odometer</p>
                    <p className="text-xl font-bold text-slate-800">{stats.currentOdometer.toLocaleString()} km</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <Gauge className="w-6 h-6 text-emerald-500 mb-2" />
                    <p className="text-xs text-slate-400 font-bold uppercase">Avg. Mileage</p>
                    <p className="text-xl font-bold text-slate-800">{stats.averageMileage}<span className="text-xs text-slate-400 font-normal"> km/L</span></p>
                  </div>
                </div>

                {stats.needsMoreData && (
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex gap-3 animate-in fade-in">
                    <div className="bg-orange-100 p-2 h-fit rounded-full text-orange-600"><Info className="w-4 h-4" /></div>
                    <div>
                      <p className="font-bold text-sm text-orange-800">Add One More Reading!</p>
                      <p className="text-xs text-orange-600 mt-1">To calculate "Total Driven", add start & end logs.</p>
                    </div>
                  </div>
                )}

                <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Vehicle Spending</p>
                      <h2 className="text-3xl font-bold mt-1">{formatCurrency(stats.vehicleExpenses)}</h2>
                    </div>
                    <Fuel className="w-8 h-8 text-blue-200" />
                  </div>
                  <div className="mt-4 flex gap-4 text-xs text-blue-100 border-t border-blue-500/50 pt-4">
                    <div><span className="opacity-70">Running Cost</span><p className="font-bold text-base text-white">{stats.costPerKm === '---' ? '---' : `₹${stats.costPerKm}`}/km</p></div>
                    <div><span className="opacity-70">Total Driven</span><p className="font-bold text-base text-white">{stats.totalDistance.toLocaleString()} km</p></div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-slate-100 p-2 rounded-xl">
              <span className="text-xs font-bold text-slate-500 px-2">HISTORY</span>
              <button onClick={exportCSV} className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 text-slate-700"><Download className="w-3 h-3" /> CSV</button>
            </div>

            <div className="space-y-6">
              {Object.entries(visibleHistory).map(([date, items]) => (
                <div key={date}>
                  <p className="text-xs font-bold text-slate-400 mb-2 ml-1 uppercase">{date}</p>
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    {items.map((item: any) => {
                      if (item.type === 'expense') {
                        return (
                          <div key={item.id} className="p-4 border-b border-slate-50 last:border-0 flex justify-between group">
                            <div className="flex gap-3">
                              <div className={`w-1 h-10 rounded-full ${item.category === 'Fuel' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                              <div><p className="font-bold text-sm text-slate-700">{item.category}</p><p className="text-xs text-slate-400">{item.note}</p></div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-800">{formatCurrency(item.amount)}</p>
                              <div className="flex justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditItem(item); setModalType('expense'); }}><Edit2 className="w-3 h-3 text-blue-500" /></button>
                                <button onClick={() => deleteItem('expenses', item.id)}><Trash2 className="w-3 h-3 text-red-500" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      else if (item.type === 'loan') {
                        const l = item as LoanLog;
                        const totalPaid = (l.repayments || []).reduce((sum, r) => sum + r.amount, 0);
                        const balance = l.amount - totalPaid;
                        const progress = Math.min(100, (totalPaid / l.amount) * 100);
                        const isPaid = balance <= 0;
                        const isPartial = totalPaid > 0 && !isPaid;

                        return (
                          <div key={l.id} className={`p-4 border-b border-slate-50 last:border-0 flex flex-col gap-3 group ${isPaid ? 'opacity-60 bg-slate-50' : 'bg-white'}`}>
                            <div className="flex justify-between">
                              <div className="flex gap-3">
                                <div className={`w-1 h-10 rounded-full ${l.loanType === 'taken' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className={`font-bold text-sm ${isPaid ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                      {l.loanType === 'taken' ? 'Borrowed from' : 'Lent to'} {l.person}
                                    </p>
                                    {isPaid && <span className="text-[10px] bg-slate-200 px-1.5 rounded text-slate-500 font-bold">SETTLED</span>}
                                    {isPartial && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 rounded font-bold border border-orange-200">PARTIAL</span>}
                                    {!isPaid && !isPartial && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded font-bold border border-blue-100">OPEN</span>}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                    <Clock className="w-3 h-3" /> Due: {l.dueDate}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold ${l.loanType === 'taken' ? 'text-red-600' : 'text-green-600'} ${isPaid ? 'line-through opacity-50' : ''}`}>
                                  {l.loanType === 'taken' ? '+' : '-'}{formatCurrency(l.amount)}
                                </p>
                                <p className="text-xs text-slate-400">Bal: {formatCurrency(balance)}</p>
                              </div>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${isPaid ? 'bg-green-400' : 'bg-blue-400'}`} style={{ width: `${progress}%` }}></div>
                            </div>

                            {!isPaid && (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => { setSelectedLoan(l); setModalType('repayment') }}
                                  className="flex items-center gap-1 text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 border border-green-100"
                                >
                                  <Banknote className="w-3 h-3" /> Pay / Record
                                </button>
                                <button onClick={() => { setEditItem(l); setModalType('loan'); }} className="p-1.5 bg-slate-50 rounded text-slate-400 hover:text-blue-500"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => deleteItem('loans', l.id)} className="p-1.5 bg-slate-50 rounded text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            )}
                          </div>
                        )
                      }
                      else {
                        const m = item as MileageLog;
                        return (
                          <div key={m.id} className="p-4 border-b border-slate-50 last:border-0 flex justify-between group bg-slate-50/50">
                            <div className="flex gap-3">
                              <div className="w-1 h-10 rounded-full bg-slate-400"></div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm text-slate-700">{m.odometer.toLocaleString()} km</p>
                                  {m.fuelStatus === 'Reserve' && <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded border border-orange-200">RESERVE</span>}
                                  {m.fuelStatus === 'Main' && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200">MAIN</span>}
                                </div>
                                <p className="text-xs text-slate-400">Odometer Update</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditItem(m); setModalType('mileage'); }}><Edit2 className="w-3 h-3 text-blue-500" /></button>
                                <button onClick={() => deleteItem('mileage_logs', m.id)}><Trash2 className="w-3 h-3 text-red-500" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              ))}
              {historyLimit < combinedHistory.length && (
                <button onClick={() => setHistoryLimit(prev => prev + 20)} className="w-full py-3 bg-slate-100 rounded-xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200">
                  Load More <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in">
            <Suspense fallback={<div className="h-72 bg-slate-100 rounded-2xl animate-pulse"></div>}>
              <Recharts data={loanStatsData} expenses={expenses} />
            </Suspense>
          </div>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-3 pointer-events-none">
        {isFabOpen && (
          <div className="pointer-events-auto flex flex-col items-end gap-3 animate-in slide-in-from-bottom-10 fade-in duration-200">
            <button onClick={() => { setModalType('loan'); setIsFabOpen(false) }} className="flex items-center gap-3 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg"><span className="font-bold text-sm">Loan / Debt</span><div className="bg-white/20 p-1 rounded-full"><Handshake className="w-4 h-4" /></div></button>
            <button onClick={() => { setModalType('expense'); setIsFabOpen(false) }} className="flex items-center gap-3 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg"><span className="font-bold text-sm">Expense</span><div className="bg-white/20 p-1 rounded-full"><ShoppingBag className="w-4 h-4" /></div></button>
            <button onClick={() => { setModalType('mileage'); setIsFabOpen(false) }} className="flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg"><span className="font-bold text-sm">Odometer</span><div className="bg-white/20 p-1 rounded-full"><Car className="w-4 h-4" /></div></button>
          </div>
        )}
        <button onClick={() => setIsFabOpen(!isFabOpen)} className={`pointer-events-auto h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${isFabOpen ? 'bg-slate-800 rotate-45' : 'bg-orange-600 rotate-0'} text-white hover:scale-110 active:scale-90`}><Plus className="w-7 h-7" /></button>
      </div>

      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-100 pb-safe pt-2 z-40">
        <div className="flex justify-around max-w-md mx-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-orange-600' : 'text-slate-300'}`}><Home className="w-6 h-6" /><span className="text-[10px] font-bold">Home</span></button>
          <div className="w-12"></div>
          <button onClick={() => setActiveTab('history')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-orange-600' : 'text-slate-300'}`}><History className="w-6 h-6" /><span className="text-[10px] font-bold">History</span></button>
          <button onClick={() => setActiveTab('analytics')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'analytics' ? 'text-orange-600' : 'text-slate-300'}`}><Gauge className="w-6 h-6" /><span className="text-[10px] font-bold">Analytics</span></button>
        </div>
      </nav>

      {modalType === 'expense' && <ExpenseModal onClose={() => setModalType(null)} onSave={(e) => handleSave(e, 'expense')} editItem={editItem} currentOdometer={stats.currentOdometer} />}
      {modalType === 'mileage' && <MileageModal onClose={() => setModalType(null)} onSave={(e) => handleSave(e, 'mileage')} editItem={editItem} currentOdometer={stats.currentOdometer} />}
      {modalType === 'loan' && <LoanModal onClose={() => setModalType(null)} onSave={(e) => handleSave(e, 'loan')} editItem={editItem} />}
      {modalType === 'repayment' && <RepaymentModal onClose={() => setModalType(null)} onSave={(e) => handleSave(e, 'repayment')} selectedLoan={selectedLoan} />}
    </div>
  );
}