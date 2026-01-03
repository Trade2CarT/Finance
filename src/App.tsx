import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
  Car, Fuel, Plus, Download, Trash2, Edit2, History, ShoppingBag,
  Home, Wallet, Handshake, Clock, Banknote, Gauge
} from 'lucide-react';

// --- Imports from Split Files ---
import { MileageLog, ExpenseLog, LoanLog, Repayment, TabView, DashboardMode } from './types';
import { formatCurrency, formatDate } from './utils';
import { ExpenseModal, MileageModal, LoanModal, RepaymentModal } from './Modals';
// --- ADD THIS ---
import { auth, db, appId } from './firebaseConfig';

// // --- Firebase Config ---
// // Ensure these variables are defined in your build environment
// declare const __firebase_config: string;
// declare const __app_id: string;
// declare const __initial_auth_token: string | undefined;

// const firebaseConfig = JSON.parse(__firebase_config);
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const db = getFirestore(app);
// const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];

// --- Components ---
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen bg-slate-50">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [dashMode, setDashMode] = useState<DashboardMode>('wallet');

  // Data State
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseLog[]>([]);
  const [loans, setLoans] = useState<LoanLog[]>([]);

  // UI State
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [modalType, setModalType] = useState<'mileage' | 'expense' | 'loan' | 'repayment' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanLog | null>(null);

  // --- Auth & Sync ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubMileage = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'mileage_logs'), (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, type: 'mileage', ...d.data() } as MileageLog));
      logs.sort((a, b) => b.odometer - a.odometer);
      setMileageLogs(logs);
    });

    const unsubExpenses = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, type: 'expense', ...d.data() } as ExpenseLog));
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(logs);
      setLoading(false);
    });

    const unsubLoans = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'loans'), (snap) => {
      const logs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          type: 'loan',
          ...data,
          repayments: data.repayments || [],
        } as LoanLog;
      });
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLoans(logs);
    });

    return () => { unsubMileage(); unsubExpenses(); unsubLoans(); };
  }, [user]);

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    const currentOdometer = mileageLogs.length > 0 ? mileageLogs[0].odometer : 0;
    const totalDistance = mileageLogs.reduce((acc, log) => acc + log.distance, 0);
    const vehicleExpenses = expenses
      .filter(e => ['Fuel', 'Maintenance', 'Service', 'Insurance', 'Toll'].includes(e.category))
      .reduce((acc, log) => acc + log.amount, 0);

    const totalFuelVolume = expenses
      .filter(e => e.category === 'Fuel' && e.fuelVolume)
      .reduce((acc, log) => acc + (log.fuelVolume || 0), 0);

    const costPerKm = totalDistance > 0 ? (vehicleExpenses / totalDistance).toFixed(2) : '---';
    const averageMileage = totalFuelVolume > 0 && totalDistance > 0
      ? (totalDistance / totalFuelVolume).toFixed(1)
      : '---';

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlySpend = expenses
      .filter(e => e.date.startsWith(currentMonth))
      .reduce((acc, log) => acc + log.amount, 0);

    let owedByMe = 0;
    let owedToMe = 0;

    loans.forEach(l => {
      const totalRepaid = (l.repayments || []).reduce((sum, r) => sum + r.amount, 0);
      const balance = l.amount - totalRepaid;
      if (balance > 0) {
        if (l.loanType === 'taken') owedByMe += balance;
        else owedToMe += balance;
      }
    });

    const netBalance = owedToMe - owedByMe;

    return {
      currentOdometer,
      totalDistance,
      vehicleExpenses,
      costPerKm,
      averageMileage,
      monthlySpend,
      owedByMe,
      owedToMe,
      netBalance
    };
  }, [mileageLogs, expenses, loans]);

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
        const lastReading = stats.currentOdometer;
        if (mileageLogs.length > 0 && reading <= lastReading) {
          alert(`New reading must be greater than ${lastReading} km`);
          return;
        }
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'mileage_logs'), {
          date, odometer: reading, distance: mileageLogs.length === 0 ? 0 : reading - lastReading, fuelStatus, timestamp: Date.now()
        });
      }
    } else if (type === 'expense') {
      const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
      const category = (form.elements.namedItem('category') as HTMLInputElement).value;
      const fuelPriceEl = form.elements.namedItem('fuelPrice') as HTMLInputElement | null;
      const fuelVolumeEl = form.elements.namedItem('fuelVolume') as HTMLInputElement | null;
      const linkedOdometerEl = form.elements.namedItem('linkedOdometer') as HTMLInputElement | null;

      const data = {
        date: (form.elements.namedItem('date') as HTMLInputElement).value,
        category: category,
        amount,
        note: (form.elements.namedItem('note') as HTMLInputElement).value,
        fuelPrice: fuelPriceEl?.value ? parseFloat(fuelPriceEl.value) : null,
        fuelVolume: fuelVolumeEl?.value ? parseFloat(fuelVolumeEl.value) : null,
      };

      if (editItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', editItem.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), { ...data, timestamp: Date.now() });

        // Auto-create mileage log
        if (category === 'Fuel' && linkedOdometerEl?.value) {
          const reading = parseFloat(linkedOdometerEl.value);
          const lastReading = stats.currentOdometer;
          if (reading > lastReading) {
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'mileage_logs'), {
              date: data.date,
              odometer: reading,
              distance: mileageLogs.length === 0 ? 0 : reading - lastReading,
              fuelStatus: 'Main',
              timestamp: Date.now()
            });
          }
        }
      }
    } else if (type === 'loan') {
      const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
      const currentRepayments = editItem?.repayments || [];

      const data = {
        loanType: (form.elements.namedItem('loanType') as HTMLInputElement).value,
        person: (form.elements.namedItem('person') as HTMLInputElement).value,
        amount,
        date: (form.elements.namedItem('date') as HTMLInputElement).value,
        dueDate: (form.elements.namedItem('dueDate') as HTMLInputElement).value,
        note: (form.elements.namedItem('note') as HTMLInputElement).value,
        repayments: currentRepayments
      };

      if (editItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', editItem.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'loans'), { ...data, timestamp: Date.now() });
      }
    } else if (type === 'repayment') {
      if (!selectedLoan) return;
      const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
      const newRepayment: Repayment = {
        id: crypto.randomUUID(),
        amount,
        date: (form.elements.namedItem('date') as HTMLInputElement).value,
        note: (form.elements.namedItem('note') as HTMLInputElement).value
      };
      const updatedRepayments = [...(selectedLoan.repayments || []), newRepayment];
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', selectedLoan.id), {
        repayments: updatedRepayments
      });
    }

    setModalType(null);
    setEditItem(null);
    setSelectedLoan(null);
    setIsFabOpen(false);
  };

  const deleteItem = async (col: string, id: string) => {
    if (confirm("Delete this item permanently?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user!.uid, col, id));
    }
  };

  const exportCSV = () => {
    let csvContent = "Type,Date,Category/Person,Amount,Paid,Balance,Status,Note\n";
    expenses.forEach(e => csvContent += `Expense,${e.date},${e.category},${e.amount},-,-,-,${e.note}\n`);
    mileageLogs.forEach(m => csvContent += `Mileage,${m.date},${m.fuelStatus || 'N/A'},${m.odometer}km,-,-,-,Distance: ${m.distance}\n`);
    loans.forEach(l => {
      const paid = (l.repayments || []).reduce((s, r) => s + r.amount, 0);
      const balance = l.amount - paid;
      const status = balance <= 0 ? 'Settled' : paid > 0 ? 'Partial' : 'Open';
      csvContent += `Loan,${l.date},${l.loanType} - ${l.person},${l.amount},${paid},${balance},${status},${l.note}\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: "text/csv" }));
    link.download = "vyaya_full_report.csv";
    link.click();
  };

  // --- Render ---

  if (loading) return <LoadingSpinner />;

  const combinedHistory = [
    ...expenses,
    ...mileageLogs,
    ...loans
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.timestamp - a.timestamp);

  const groupedHistory = combinedHistory.reduce((groups, item) => {
    const date = formatDate(item.date);
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
    return groups;
  }, {} as Record<string, (ExpenseLog | MileageLog | LoanLog)[]>);

  const loanStatsData = [
    { name: 'Owed to Me', value: stats.owedToMe, fill: '#10B981' },
    { name: 'I Owe', value: stats.owedByMe, fill: '#EF4444' }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans text-slate-800">

      {/* Header */}
      <header className="bg-white sticky top-0 z-20 border-b border-slate-100 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-600"><Wallet className="w-5 h-5" /></div>
            <span className="font-bold text-lg text-slate-800">Vyaya</span>
          </div>
          <div className="text-xs font-semibold bg-slate-100 px-3 py-1.5 rounded-full text-slate-600">
            {new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              <button onClick={() => setDashMode('wallet')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${dashMode === 'wallet' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Wallet</button>
              <button onClick={() => setDashMode('vehicle')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${dashMode === 'vehicle' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Vehicle</button>
            </div>

            {dashMode === 'wallet' && (
              <>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Spent This Month</p>
                  <h2 className="text-4xl font-bold">{formatCurrency(stats.monthlySpend)}</h2>
                  <div className="mt-6 pt-4 border-t border-slate-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400 uppercase font-bold">Net Balance Position</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${stats.netBalance >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {stats.netBalance >= 0 ? 'Credit' : 'Debt'}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <div className="bg-white/5 flex-1 p-3 rounded-lg border border-white/10">
                        <p className="text-[10px] text-red-300 uppercase mb-0.5">I Owe (Pending)</p>
                        <p className="font-bold text-lg">{formatCurrency(stats.owedByMe)}</p>
                      </div>
                      <div className="bg-white/5 flex-1 p-3 rounded-lg border border-white/10">
                        <p className="text-[10px] text-green-300 uppercase mb-0.5">Owed to Me</p>
                        <p className="font-bold text-lg">{formatCurrency(stats.owedToMe)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Simplified List View for Dashboard */}
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
            )}

            {dashMode === 'vehicle' && (
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
                <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Vehicle Spending</p>
                      <h2 className="text-3xl font-bold mt-1">{formatCurrency(stats.vehicleExpenses)}</h2>
                    </div>
                    <Fuel className="w-8 h-8 text-blue-200" />
                  </div>
                  <div className="mt-4 flex gap-4 text-xs text-blue-100 border-t border-blue-500/50 pt-4">
                    <div>
                      <span className="opacity-70">Running Cost</span>
                      <p className="font-bold text-base text-white">{stats.costPerKm === '---' ? '---' : `₹${stats.costPerKm}`}/km</p>
                    </div>
                    <div>
                      <span className="opacity-70">Total Driven</span>
                      <p className="font-bold text-base text-white">{stats.totalDistance.toLocaleString()} km</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-slate-100 p-2 rounded-xl">
              <span className="text-xs font-bold text-slate-500 px-2">FULL HISTORY</span>
              <button onClick={exportCSV} className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 text-slate-700"><Download className="w-3 h-3" /> CSV</button>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedHistory).map(([date, items]) => (
                <div key={date}>
                  <p className="text-xs font-bold text-slate-400 mb-2 ml-1 uppercase">{date}</p>
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    {items.map(item => {
                      if (item.type === 'expense') {
                        const e = item as ExpenseLog;
                        return (
                          <div key={e.id} className="p-4 border-b border-slate-50 last:border-0 flex justify-between group">
                            <div className="flex gap-3">
                              <div className={`w-1 h-10 rounded-full ${e.category === 'Fuel' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                              <div>
                                <p className="font-bold text-sm text-slate-700">{e.category}</p>
                                <p className="text-xs text-slate-400">{e.note || e.category}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-800">{formatCurrency(e.amount)}</p>
                              <div className="flex justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditItem(e); setModalType('expense'); }}><Edit2 className="w-3 h-3 text-blue-500" /></button>
                                <button onClick={() => deleteItem('expenses', e.id)}><Trash2 className="w-3 h-3 text-red-500" /></button>
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
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in">
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
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm h-72">
              <p className="text-xs font-bold text-slate-400 uppercase mb-4">Loan Portfolio</p>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={loanStatsData} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
                  <RechartsTooltip formatter={(val: number) => formatCurrency(val)} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                    {loanStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-3 pointer-events-none">
        {isFabOpen && (
          <div className="pointer-events-auto flex flex-col items-end gap-3 animate-in slide-in-from-bottom-10 fade-in duration-200">
            <button onClick={() => { setModalType('loan'); setIsFabOpen(false) }} className="flex items-center gap-3 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-transform">
              <span className="font-bold text-sm">Loan / Debt</span>
              <div className="bg-white/20 p-1 rounded-full"><Handshake className="w-4 h-4" /></div>
            </button>
            <button onClick={() => { setModalType('expense'); setIsFabOpen(false) }} className="flex items-center gap-3 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-transform">
              <span className="font-bold text-sm">Expense</span>
              <div className="bg-white/20 p-1 rounded-full"><ShoppingBag className="w-4 h-4" /></div>
            </button>
            <button onClick={() => { setModalType('mileage'); setIsFabOpen(false) }} className="flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-transform">
              <span className="font-bold text-sm">Odometer</span>
              <div className="bg-white/20 p-1 rounded-full"><Car className="w-4 h-4" /></div>
            </button>
          </div>
        )}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`pointer-events-auto h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${isFabOpen ? 'bg-slate-800 rotate-45' : 'bg-orange-600 rotate-0'} text-white hover:scale-110 active:scale-90`}
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-100 pb-safe pt-2 z-40">
        <div className="flex justify-around max-w-md mx-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-orange-600' : 'text-slate-300'}`}>
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <div className="w-12"></div>
          <button onClick={() => setActiveTab('history')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-orange-600' : 'text-slate-300'}`}>
            <History className="w-6 h-6" />
            <span className="text-[10px] font-bold">History</span>
          </button>
        </div>
      </nav>

      {/* Render Modals with Props */}
      {modalType === 'expense' && (
        <ExpenseModal
          onClose={() => setModalType(null)}
          onSave={(e) => handleSave(e, 'expense')}
          editItem={editItem}
          currentOdometer={stats.currentOdometer}
        />
      )}
      {modalType === 'mileage' && (
        <MileageModal
          onClose={() => setModalType(null)}
          onSave={(e) => handleSave(e, 'mileage')}
          editItem={editItem}
          currentOdometer={stats.currentOdometer}
        />
      )}
      {modalType === 'loan' && (
        <LoanModal
          onClose={() => setModalType(null)}
          onSave={(e) => handleSave(e, 'loan')}
          editItem={editItem}
        />
      )}
      {modalType === 'repayment' && (
        <RepaymentModal
          onClose={() => setModalType(null)}
          onSave={(e) => handleSave(e, 'repayment')}
          selectedLoan={selectedLoan}
        />
      )}

    </div>
  );
}