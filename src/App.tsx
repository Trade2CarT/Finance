// src/App.tsx
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
  doc,
  setDoc
} from 'firebase/firestore';
import {
  Car, Fuel, Plus, Download, Trash2, Edit2, History, ShoppingBag,
  Home, Handshake, Gauge, LogOut, Lock, MessageCircle, ChevronDown,
  Clock, Banknote, Settings
} from 'lucide-react';

import type { MileageLog, ExpenseLog, LoanLog, TabView, DashboardMode, VehicleSettings, SubscriptionDetails } from './components/types';
import { formatCurrency, formatDate } from './components/utils';
import { ExpenseModal, MileageModal, LoanModal, RepaymentModal, SettingsModal } from './components/Modals';
import Auth from './components/Auth';
import { auth, db, appId } from './components/firebaseConfig';

// --- LAZY LOAD CHARTS ---
const Recharts = React.lazy(() => import('recharts').then(module => ({
  default: ({ data, expenses }: { data: any[], expenses: any[] }) => {
    const { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = module;
    const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];

    return (
      <>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-80">
          <p className="text-xs font-bold text-slate-400 uppercase mb-6 tracking-wider">Spending by Category</p>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={Object.entries(expenses.reduce((acc, curr) => {
                  acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
                  return acc;
                }, {} as any)).map(([name, value]) => ({ name, value }))}
                innerRadius={65} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none"
              >
                {expenses.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-80">
          <p className="text-xs font-bold text-slate-400 uppercase mb-6 tracking-wider">Loan Portfolio</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} width={70} />
              <Tooltip formatter={(value: number | undefined) => [formatCurrency(value || 0), "Amount"]} cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
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
    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-slate-900"></div>
  </div>
);

// --- LOCKED SCREEN COMPONENT ---
const LockedScreen = ({ onLogout }: { onLogout: () => void }) => {
  const message = encodeURIComponent("Hello, I want to subscribe to Trade2cart Finance.\n\nPrices:\n- Monthly: ₹10\n- Yearly: ₹100\n\nPlease let me know the payment details.");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full border border-slate-100">
        <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 ring-8 ring-red-50/50">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Access Expired</h2>
        <p className="text-slate-500 mb-8 text-sm font-medium leading-relaxed">
          Your free trial has ended. Secure your data and continue using premium features by subscribing.
        </p>

        <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100">
          <p className="text-xs font-extrabold text-slate-400 uppercase mb-4 tracking-wider">Premium Plans</p>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-slate-600">Monthly</span>
            <span className="text-sm font-black text-slate-800">₹10 / mo</span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-200 pt-3">
            <span className="text-sm font-bold text-slate-600">Yearly</span>
            <span className="text-sm font-black text-slate-800 text-emerald-600">₹100 / yr</span>
          </div>
        </div>

        <button
          onClick={() => window.open(`https://wa.me/918903166106?text=${message}`, '_blank')}
          className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all active:scale-95 mb-4"
        >
          <MessageCircle className="w-5 h-5" />
          Subscribe on WhatsApp
        </button>

        <button onClick={onLogout} className="text-slate-400 text-xs font-bold hover:text-slate-600 uppercase tracking-wide">
          Log Out Account
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
  const [subDetails, setSubDetails] = useState<SubscriptionDetails>({
    plan: 'free', status: 'active', expiryDate: null, daysLeft: 0
  });

  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [dashMode, setDashMode] = useState<DashboardMode>('wallet');

  // Data State
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseLog[]>([]);
  const [loans, setLoans] = useState<LoanLog[]>([]);

  // Settings State
  const [vehicleSettings, setVehicleSettings] = useState<VehicleSettings | null>(null);

  // Pagination
  const [historyLimit, setHistoryLimit] = useState(20);

  // UI State
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [modalType, setModalType] = useState<'mileage' | 'expense' | 'loan' | 'repayment' | 'settings' | null>(null);
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
      setVehicleSettings(null);
      return;
    }

    const unsubSub = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid), (docSnap) => {
      const data = docSnap.data();
      const now = Date.now();

      if (data?.settings) setVehicleSettings(data.settings);

      let createdAt = now;
      if (data?.createdAt) createdAt = typeof data.createdAt.toMillis === 'function' ? data.createdAt.toMillis() : data.createdAt;

      let subDate = 0;
      if (data?.subscriptionDate) subDate = typeof data.subscriptionDate.toMillis === 'function' ? data.subscriptionDate.toMillis() : data.subscriptionDate;

      const subType = data?.subscription || 'free';
      let allowed = false;
      let expDateTimestamp: number | null = null;
      let days = 0;

      if (subType === 'free') {
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const timePassed = now - createdAt;
        expDateTimestamp = createdAt + sevenDays;

        if (timePassed < sevenDays) {
          allowed = true;
          days = Math.ceil((sevenDays - timePassed) / (24 * 60 * 60 * 1000));
        }
      } else if (subType === 'monthly') {
        const duration = 30 * 24 * 60 * 60 * 1000;
        expDateTimestamp = subDate + duration;
        if ((now - subDate) < duration) {
          allowed = true;
          days = Math.ceil((duration - (now - subDate)) / (24 * 60 * 60 * 1000));
        }
      } else if (subType === 'yearly') {
        const duration = 365 * 24 * 60 * 60 * 1000;
        expDateTimestamp = subDate + duration;
        if ((now - subDate) < duration) {
          allowed = true;
          days = Math.ceil((duration - (now - subDate)) / (24 * 60 * 60 * 1000));
        }
      }

      setHasAccess(allowed);
      const formattedExpiry = expDateTimestamp ? new Date(expDateTimestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

      setSubDetails({
        plan: subType,
        status: allowed ? 'active' : 'expired',
        expiryDate: formattedExpiry,
        daysLeft: days
      });
      setLoading(false);
    });

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

  const handleSave = async (e: React.FormEvent, type: 'mileage' | 'expense' | 'loan' | 'repayment' | 'settings') => {
    e.preventDefault();
    if (!user) return;
    const form = e.target as HTMLFormElement;

    if (type === 'settings') {
      const tankCapacity = parseFloat((form.elements.namedItem('tankCapacity') as HTMLInputElement).value);
      const reserveCapacity = parseFloat((form.elements.namedItem('reserveCapacity') as HTMLInputElement).value);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid), { settings: { tankCapacity, reserveCapacity } }, { merge: true });
    }

    else if (type === 'mileage') {
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

      // Get the NEW MANDATORY fields for Fuel
      const linkedOdometerEl = form.elements.namedItem('linkedOdometer') as HTMLInputElement | null;
      // Get Radio button value for fuelStatus
      const fuelStatusEl = (form.elements.namedItem('fuelStatus') as RadioNodeList | null);
      const fuelStatus = fuelStatusEl ? fuelStatusEl.value : null;

      const data = {
        date, category, amount, note, timestamp: Date.now(),
        fuelPrice: fuelPriceEl?.value ? parseFloat(fuelPriceEl.value) : null,
        fuelVolume: fuelVolumeEl?.value ? parseFloat(fuelVolumeEl.value) : null,
      };

      if (editItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', editItem.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), data);

        // --- AUTO SAVE MILEAGE LOG IF CATEGORY IS FUEL ---
        if (category === 'Fuel' && linkedOdometerEl?.value && fuelStatus) {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'mileage_logs'), {
            date,
            odometer: parseFloat(linkedOdometerEl.value),
            distance: 0,
            fuelStatus: fuelStatus, // NOW SAVING STATUS CORRECTLY
            timestamp: Date.now()
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
    <div className="min-h-screen bg-slate-50/80 pb-28 font-sans text-slate-800">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.PNG" alt="Logo" className="h-10 w-10 rounded-lg bg-white p-0.5 shadow-sm object-contain border border-slate-100" />
            <div>
              <span className="font-extrabold text-lg text-slate-800 block leading-tight tracking-tight">Trade2cart</span>
              <span className="text-[10px] text-slate-400 font-bold tracking-widest">FINANCE</span>
            </div>
          </div>
          <div className="flex gap-2">
            {subDetails.plan === 'free' && subDetails.daysLeft > 0 && <span className="flex items-center text-[10px] bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold shadow-sm">{subDetails.daysLeft} days trial</span>}
            <button onClick={() => setModalType('settings')} className="text-slate-400 hover:text-slate-600 p-2.5 bg-slate-100 rounded-full transition-all hover:bg-slate-200">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-red-500 p-2.5 bg-slate-100 rounded-full transition-all hover:bg-red-50">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
              <button onClick={() => setDashMode('wallet')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${dashMode === 'wallet' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600 shadow-none'}`}>Wallet</button>
              <button onClick={() => setDashMode('vehicle')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${dashMode === 'vehicle' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600 shadow-none'}`}>Vehicle</button>
            </div>

            {dashMode === 'wallet' ? (
              <>
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-7 text-white shadow-2xl shadow-slate-300 overflow-hidden">
                  {/* --- BRANDED WATERMARK --- */}
                  {/* <div className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md p-1.5
                flex items-center justify-center border border-white/20 shadow-lg">
                    <img
                      src="/logo.PNG"
                      alt="Icon"
                      className="w-full h-full object-contain invert brightness-0 opacity-90"
                    />
                  </div> */}


                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Total Spent This Month</p>
                  <h2 className="text-5xl font-black tracking-tight relative z-10">{formatCurrency(stats.monthlySpend)}</h2>

                  <div className="mt-8 pt-5 border-t border-white/10 flex gap-4 relative z-10">
                    <div className="bg-white/5 flex-1 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                      <p className="text-[10px] text-red-300 uppercase mb-1 font-bold tracking-wide">To Pay</p>
                      <p className="font-bold text-xl">{formatCurrency(stats.owedByMe)}</p>
                    </div>
                    <div className="bg-white/5 flex-1 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                      <p className="text-[10px] text-emerald-300 uppercase mb-1 font-bold tracking-wide">To Receive</p>
                      <p className="font-bold text-xl">{formatCurrency(stats.owedToMe)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
                  {expenses.slice(0, 3).map(e => (
                    <div key={e.id} className="p-5 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${['Fuel', 'Service'].includes(e.category) ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {['Fuel', 'Service'].includes(e.category) ? <Car className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800">{e.category}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{formatDate(e.date)}</p>
                        </div>
                      </div>
                      <span className="font-black text-slate-700">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 mb-3"><Car className="w-5 h-5" /></div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Odometer</p>
                    <p className="text-xl font-black text-slate-800 mt-1">{stats.currentOdometer.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-medium">km</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600 mb-3"><Gauge className="w-5 h-5" /></div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg. Mileage</p>
                    <p className="text-xl font-black text-slate-800 mt-1">{stats.averageMileage}</p>
                    <p className="text-[10px] text-slate-400 font-medium">km/L</p>
                  </div>
                </div>

                <div className="bg-blue-600 rounded-3xl p-7 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>

                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Vehicle Spending</p>
                      <h2 className="text-4xl font-black mt-2">{formatCurrency(stats.vehicleExpenses)}</h2>
                    </div>
                    <Fuel className="w-10 h-10 text-blue-200 opacity-80" />
                  </div>
                  <div className="mt-6 flex gap-6 text-xs text-blue-100 border-t border-blue-500/50 pt-5 relative z-10">
                    <div><span className="opacity-70 font-medium block mb-1">Running Cost</span><p className="font-bold text-lg text-white">{stats.costPerKm === '---' ? '---' : `₹${stats.costPerKm}`}<span className="text-xs font-normal opacity-70">/km</span></p></div>
                    <div><span className="opacity-70 font-medium block mb-1">Total Driven</span><p className="font-bold text-lg text-white">{stats.totalDistance.toLocaleString()} <span className="text-xs font-normal opacity-70">km</span></p></div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-xs font-black text-slate-400 px-3 tracking-widest">TRANSACTIONS</span>
              <button onClick={exportCSV} className="bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 text-slate-700 border border-slate-100"><Download className="w-3 h-3" /> Export CSV</button>
            </div>

            <div className="space-y-6 pb-20">
              {Object.entries(visibleHistory).map(([date, items]) => (
                <div key={date}>
                  <p className="text-xs font-bold text-slate-400 mb-3 ml-2 uppercase tracking-wide">{date}</p>
                  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    {items.map((item: any) => {
                      if (item.type === 'expense') {
                        return (
                          <div key={item.id} className="p-5 border-b border-slate-50 last:border-0 flex justify-between group hover:bg-slate-50 transition-colors">
                            <div className="flex gap-4">
                              <div className={`w-1.5 h-10 rounded-full ${item.category === 'Fuel' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                              <div><p className="font-bold text-sm text-slate-800">{item.category}</p><p className="text-xs text-slate-400 font-medium">{item.note}</p></div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-800">{formatCurrency(item.amount)}</p>
                              <div className="flex justify-end gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditItem(item); setModalType('expense'); }}><Edit2 className="w-3.5 h-3.5 text-blue-500 hover:scale-110 transition-transform" /></button>
                                <button onClick={() => deleteItem('expenses', item.id)}><Trash2 className="w-3.5 h-3.5 text-red-500 hover:scale-110 transition-transform" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (item.type === 'loan') {
                        const l = item as LoanLog;
                        const totalPaid = (l.repayments || []).reduce((sum, r) => sum + r.amount, 0);
                        const balance = l.amount - totalPaid;
                        const progress = Math.min(100, (totalPaid / l.amount) * 100);
                        const isPaid = balance <= 0;
                        return (
                          <div key={l.id} className={`p-5 border-b border-slate-50 last:border-0 flex flex-col gap-4 group ${isPaid ? 'opacity-60 bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}>
                            <div className="flex justify-between">
                              <div className="flex gap-4">
                                <div className={`w-1.5 h-10 rounded-full ${l.loanType === 'taken' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className={`font-bold text-sm ${isPaid ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                      {l.loanType === 'taken' ? 'Borrowed from' : 'Lent to'} {l.person}
                                    </p>
                                    {!isPaid && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold border border-blue-100">OPEN</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                                    <Clock className="w-3 h-3" /> Due: {l.dueDate}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-black ${l.loanType === 'taken' ? 'text-red-600' : 'text-green-600'} ${isPaid ? 'line-through opacity-50' : ''}`}>
                                  {l.loanType === 'taken' ? '+' : '-'}{formatCurrency(l.amount)}
                                </p>
                                <p className="text-xs text-slate-400 font-bold">Bal: {formatCurrency(balance)}</p>
                              </div>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ease-out ${isPaid ? 'bg-green-400' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                            </div>

                            {!isPaid && (
                              <div className="flex justify-end gap-2 pt-1">
                                <button onClick={() => { setSelectedLoan(l); setModalType('repayment') }} className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl hover:bg-emerald-100 border border-emerald-100 transition-colors shadow-sm">
                                  <Banknote className="w-3.5 h-3.5" /> Pay
                                </button>
                                <button onClick={() => { setEditItem(l); setModalType('loan'); }} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => deleteItem('loans', l.id)} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        const m = item as MileageLog;
                        return (
                          <div key={m.id} className="p-5 border-b border-slate-50 last:border-0 flex justify-between group bg-slate-50/30 hover:bg-slate-50 transition-colors">
                            <div className="flex gap-4">
                              <div className="w-1.5 h-10 rounded-full bg-slate-300"></div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm text-slate-700">{m.odometer.toLocaleString()} km</p>
                                  {m.fuelStatus === 'Main' && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">MAIN</span>}
                                  {m.fuelStatus === 'Reserve' && <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded border border-orange-200">RESERVE</span>}
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Odometer Update</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditItem(m); setModalType('mileage'); }}><Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-500" /></button>
                              <button onClick={() => deleteItem('mileage_logs', m.id)}><Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" /></button>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              ))}
              {historyLimit < combinedHistory.length && (
                <button onClick={() => setHistoryLimit(prev => prev + 20)} className="w-full py-4 bg-white rounded-2xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 border border-slate-100 shadow-sm transition-all">
                  Load More History <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Suspense fallback={<div className="h-80 bg-slate-100 rounded-3xl animate-pulse"></div>}>
              <Recharts data={loanStatsData} expenses={expenses} />
            </Suspense>
          </div>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-28 right-5 z-30 flex flex-col items-end gap-4 pointer-events-none">
        {isFabOpen && (
          <div className="pointer-events-auto flex flex-col items-end gap-3 animate-in slide-in-from-bottom-10 fade-in duration-200 pb-2">
            <button onClick={() => { setModalType('loan'); setIsFabOpen(false) }} className="flex items-center gap-3 bg-slate-800 text-white pl-5 pr-2 py-2.5 rounded-full shadow-xl hover:scale-105 transition-transform"><span className="font-bold text-sm">Loan / Debt</span><div className="bg-white/20 p-1.5 rounded-full"><Handshake className="w-4 h-4" /></div></button>
            <button onClick={() => { setModalType('expense'); setIsFabOpen(false) }} className="flex items-center gap-3 bg-emerald-600 text-white pl-5 pr-2 py-2.5 rounded-full shadow-xl hover:scale-105 transition-transform"><span className="font-bold text-sm">Expense</span><div className="bg-white/20 p-1.5 rounded-full"><ShoppingBag className="w-4 h-4" /></div></button>
            <button onClick={() => { setModalType('mileage'); setIsFabOpen(false) }} className="flex items-center gap-3 bg-blue-600 text-white pl-5 pr-2 py-2.5 rounded-full shadow-xl hover:scale-105 transition-transform"><span className="font-bold text-sm">Odometer</span><div className="bg-white/20 p-1.5 rounded-full"><Car className="w-4 h-4" /></div></button>
          </div>
        )}
        <button onClick={() => setIsFabOpen(!isFabOpen)} className={`pointer-events-auto h-16 w-16 rounded-full shadow-2xl shadow-orange-200 flex items-center justify-center transition-all duration-300 ${isFabOpen ? 'bg-slate-800 rotate-45 scale-90' : 'bg-orange-600 rotate-0 hover:scale-110'} text-white`}>
          <Plus className="w-8 h-8" />
        </button>
      </div>

      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-100 pb-safe pt-2 z-40">
        <div className="flex justify-around max-w-md mx-auto relative">
          {/* Center Curve Cutout Effect simulation */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-transparent rounded-full border-[6px] border-slate-50/0 pointer-events-none"></div>

          <button onClick={() => setActiveTab('dashboard')} className={`p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'dashboard' ? 'text-orange-600' : 'text-slate-300 hover:text-slate-500'}`}>
            <Home className={`w-6 h-6 ${activeTab === 'dashboard' ? 'fill-orange-100' : ''}`} />
            <span className="text-[10px] font-bold tracking-wide">Home</span>
          </button>

          <div className="w-16"></div> {/* Spacer for FAB */}

          <button onClick={() => setActiveTab('history')} className={`p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'history' ? 'text-orange-600' : 'text-slate-300 hover:text-slate-500'}`}>
            <History className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wide">History</span>
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'analytics' ? 'text-orange-600' : 'text-slate-300 hover:text-slate-500'}`}>
            <Gauge className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wide">Analytics</span>
          </button>
        </div>
      </nav>

      {/* MODALS */}
      {modalType === 'expense' && <ExpenseModal onClose={() => setModalType(null)} onSave={(e) => handleSave(e, 'expense')} editItem={editItem} currentOdometer={stats.currentOdometer} />}
      {modalType === 'mileage' && <MileageModal onClose={() => setModalType(null)} onSave={(e) => handleSave(e, 'mileage')} editItem={editItem} currentOdometer={stats.currentOdometer} />}
      {modalType === 'loan' && <LoanModal onClose={() => setModalType(null)} onSave={(e) => handleSave(e, 'loan')} editItem={editItem} />}
      {modalType === 'repayment' && <RepaymentModal onClose={() => setModalType(null)} onSave={(e) => handleSave(e, 'repayment')} selectedLoan={selectedLoan} />}
      {modalType === 'settings' && <SettingsModal onClose={() => setModalType(null)} onSave={(e) => handleSave(e, 'settings')} settings={vehicleSettings} subDetails={subDetails} />}
    </div>
  );
}