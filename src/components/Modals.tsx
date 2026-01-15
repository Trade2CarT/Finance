// src/components/Modals.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    Fuel, X, Crown, Mail, MessageCircle, HelpCircle, Check, ShieldCheck,
    Gauge, Zap, Droplet, ArrowDownLeft, ArrowUpRight, Plane, Wallet,
    Briefcase, TrendingUp, DollarSign, Gift, ChevronDown, Landmark,
    CreditCard, Coins, PiggyBank, AlertTriangle, Wrench, BellRing
} from 'lucide-react';
import type { ExpenseLog, MileageLog, LoanLog, VehicleSettings, SubscriptionDetails } from './types';

// --- SHARED CONSTANTS ---
const FUNDS_LIST = [
    { name: 'Salary', icon: <Briefcase className="w-4 h-4 text-emerald-600" /> },
    { name: 'Savings', icon: <PiggyBank className="w-4 h-4 text-pink-500" /> },
    { name: 'Bonus', icon: <Gift className="w-4 h-4 text-purple-500" /> },
    { name: 'Stocks', icon: <TrendingUp className="w-4 h-4 text-blue-600" /> },
    { name: 'Cash', icon: <Coins className="w-4 h-4 text-orange-500" /> },
    { name: 'Borrowed', icon: <ArrowDownLeft className="w-4 h-4 text-red-500" /> },
    { name: 'Others', icon: <HelpCircle className="w-4 h-4 text-slate-400" /> },
];

interface BaseModalProps {
    onClose: () => void;
    onSave: (e: React.FormEvent) => void;
}

// Helper for Dropdowns
const CustomDropdown = ({ label, value, onChange, options, error }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick);
    }, []);
    const currentIcon = options.find((o: any) => o.name === value)?.icon || <Wallet className="w-4 h-4" />;

    return (
        <div className="relative" ref={ref}>
            <label className="text-sm font-bold text-slate-700 ml-1 mb-1.5 block">{label}</label>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className={`w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold flex items-center justify-between transition-all ${error ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-100 focus:ring-4 focus:ring-blue-50'}`}>
                <div className="flex items-center gap-3"><div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">{currentIcon}</div><span className="text-slate-700">{value}</span></div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {error && <p className="text-xs text-red-500 font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</p>}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 max-h-60 overflow-y-auto p-2">
                    <div className="grid grid-cols-2 gap-2">
                        {options.map((o: any) => (
                            <button key={o.name} type="button" onClick={() => { onChange(o.name); setIsOpen(false); }} className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold transition-all ${value === o.name ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                                {o.icon} {o.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface ExpenseModalProps extends BaseModalProps {
    editItem: ExpenseLog | null;
    currentOdometer: number;
    pots: Record<string, number>;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ onClose, onSave, editItem, currentOdometer, pots }) => {
    const [txnType, setTxnType] = useState<'expense' | 'income'>(editItem?.txnType || 'expense');
    const [cat, setCat] = useState(editItem?.category || (txnType === 'expense' ? 'Groceries' : 'Salary'));
    const [source, setSource] = useState(editItem?.paymentSource || 'Salary');
    const [amt, setAmt] = useState(editItem?.amount?.toString() || '');
    const [error, setError] = useState<string | null>(null);

    // Fuel specific
    const [price, setPrice] = useState(editItem?.fuelPrice?.toString() || '');
    const [vol, setVol] = useState(editItem?.fuelVolume?.toString() || '');

    useEffect(() => {
        const isCurrentExpense = CATEGORIES.expense.some(c => c.name === cat);
        if (txnType === 'expense' && !isCurrentExpense) setCat('Groceries');
        if (txnType === 'income') setCat('Salary');
        setError(null);
    }, [txnType]);

    useEffect(() => { if (cat === 'Fuel' && price && amt) setVol((parseFloat(amt) / parseFloat(price)).toFixed(2)); }, [price, amt, cat]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(amt);
        if (txnType === 'expense') {
            const currentBalance = pots[source] || 0;
            if (amount > currentBalance) {
                setError(`Insufficient funds in ${source}. Available: ₹${currentBalance}`);
                return;
            }
        }
        onSave(e);
    };

    const CATEGORIES = {
        expense: [
            { name: 'Groceries', icon: <Wallet className="w-4 h-4 text-orange-500" /> },
            { name: 'Fuel', icon: <Fuel className="w-4 h-4 text-blue-500" /> },
            { name: 'Travels', icon: <Plane className="w-4 h-4 text-sky-500" /> },
            { name: 'Dining Out', icon: <DollarSign className="w-4 h-4 text-red-500" /> },
            { name: 'Maintenance', icon: <Gauge className="w-4 h-4 text-slate-500" /> },
            { name: 'Service', icon: <Zap className="w-4 h-4 text-yellow-500" /> },
            { name: 'Insurance', icon: <ShieldCheck className="w-4 h-4 text-indigo-500" /> },
            { name: 'Rent', icon: <Wallet className="w-4 h-4 text-purple-500" /> },
            { name: 'Bills', icon: <DollarSign className="w-4 h-4 text-gray-500" /> },
            { name: 'Shopping', icon: <CreditCard className="w-4 h-4 text-pink-500" /> },
            { name: 'Savings', icon: <Landmark className="w-4 h-4 text-emerald-500" /> },
            { name: 'Others', icon: <HelpCircle className="w-4 h-4 text-slate-400" /> },
        ],
        income: FUNDS_LIST.filter(f => f.name !== 'Borrowed')
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 max-h-[90vh] overflow-y-auto ring-1 ring-white/50">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{editItem ? 'Edit Transaction' : 'New Transaction'}</h3>
                    <button onClick={onClose} type="button" className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <input type="hidden" name="category" value={cat} />
                    <input type="hidden" name="paymentSource" value={source} />
                    <input type="hidden" name="txnType" value={txnType} />

                    <div className="bg-slate-100 p-1 rounded-2xl flex relative">
                        <button type="button" onClick={() => setTxnType('expense')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all relative z-10 ${txnType === 'expense' ? 'text-slate-900 shadow-sm bg-white' : 'text-slate-400 hover:text-slate-600'}`}>Expense</button>
                        <button type="button" onClick={() => setTxnType('income')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all relative z-10 ${txnType === 'income' ? 'text-emerald-700 shadow-sm bg-white' : 'text-slate-400 hover:text-slate-600'}`}>Income</button>
                    </div>

                    <div className="text-center py-2 relative">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{txnType === 'income' ? 'Amount Received' : 'Total Spent'}</label>
                        <div className={`flex items-center justify-center text-5xl font-black mt-2 ${txnType === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            <span className="text-slate-300 text-3xl mr-2 font-medium">₹</span>
                            <input name="amount" type="number" step="0.01" required placeholder="0" value={amt} onChange={e => { setAmt(e.target.value); setError(null); }} className="w-48 text-center bg-transparent outline-none placeholder:text-slate-200" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CustomDropdown label="Category" value={cat} onChange={setCat} options={CATEGORIES[txnType]} />

                        {txnType === 'expense' && (
                            <CustomDropdown
                                label="Pay From (Source)"
                                value={source}
                                onChange={(val: string) => { setSource(val); setError(null); }}
                                options={FUNDS_LIST}
                                error={error}
                            />
                        )}

                        {cat === 'Fuel' && txnType === 'expense' && (
                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-blue-700 font-bold border-b border-blue-100 pb-2"><Fuel className="w-4 h-4" /> Fuel Log (Required)</div>
                                <div><label className="text-xs text-blue-600 font-bold block mb-1.5 flex items-center gap-1"><Gauge className="w-3 h-3" /> Current Odometer</label><input name="linkedOdometer" type="number" required placeholder={currentOdometer ? `${currentOdometer} (Previous)` : "e.g. 12500"} className="w-full p-3 rounded-xl border border-blue-200 bg-white outline-none font-bold text-slate-700 text-lg" /></div>
                                <div><label className="text-xs text-blue-600 font-bold block mb-2">Current Bike Status</label><div className="flex gap-3"><label className="flex-1 cursor-pointer group"><input type="radio" name="fuelStatus" value="Main" required className="peer sr-only" /><div className="p-3 text-center rounded-xl border-2 border-blue-100 bg-white text-slate-400 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 peer-checked:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2"><Zap className="w-4 h-4" /> Main</div></label><label className="flex-1 cursor-pointer group"><input type="radio" name="fuelStatus" value="Reserve" required className="peer sr-only" /><div className="p-3 text-center rounded-xl border-2 border-blue-100 bg-white text-slate-400 peer-checked:bg-orange-500 peer-checked:text-white peer-checked:border-orange-500 peer-checked:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2"><Droplet className="w-4 h-4" /> Reserve</div></label></div></div>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-100">
                                    <div><label className="text-xs text-blue-600 font-bold block mb-1.5">Price / L</label><input name="fuelPrice" type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 bg-white rounded-xl border border-blue-200 outline-none font-bold text-slate-700" /></div>
                                    <div><label className="text-xs text-blue-600 font-bold block mb-1.5">Liters</label><input name="fuelVolume" type="number" step="0.01" value={vol} onChange={e => setVol(e.target.value)} className="w-full p-3 bg-blue-100/50 rounded-xl border border-blue-200 outline-none font-bold text-blue-800" /></div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-sm font-bold text-slate-700 ml-1">Date</label><input name="date" type="date" required defaultValue={editItem?.date || new Date().toISOString().split('T')[0]} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-medium text-slate-600 focus:border-slate-300 transition-colors" /></div>
                            <div><label className="text-sm font-bold text-slate-700 ml-1">Note</label><input name="note" placeholder="Short note..." defaultValue={editItem?.note} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-medium focus:border-slate-300 transition-colors" /></div>
                        </div>
                    </div>
                    <button type="submit" className={`w-full text-white font-bold py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-base ${txnType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}>{txnType === 'income' ? 'Save Income' : 'Save Expense'}</button>
                </form>
            </div>
        </div>
    );
};

interface LoanModalProps extends BaseModalProps {
    editItem: LoanLog | null;
    pots: Record<string, number>;
}

export const LoanModal: React.FC<LoanModalProps> = ({ onClose, onSave, editItem, pots }) => {
    const [loanType, setLoanType] = useState<'given' | 'taken'>(editItem?.loanType || 'taken');
    const [source, setSource] = useState(editItem?.paymentSource || 'Salary');
    const [amt, setAmt] = useState(editItem?.amount?.toString() || '');
    const [error, setError] = useState<string | null>(null);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(amt);
        if (loanType === 'given') {
            const currentBalance = pots[source] || 0;
            if (amount > currentBalance) {
                setError(`Insufficient funds in ${source}. Available: ₹${currentBalance}`);
                return;
            }
        }
        onSave(e);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 ring-1 ring-white/50">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{editItem ? 'Edit Loan' : 'Add Loan / Debt'}</h3>
                    <button onClick={onClose} type="button" className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <input type="hidden" name="paymentSource" value={source} />

                    <div className="grid grid-cols-2 gap-3">
                        <label className="cursor-pointer group">
                            <input type="radio" name="loanType" value="taken" checked={loanType === 'taken'} onChange={() => { setLoanType('taken'); setError(null); }} className="peer sr-only" />
                            <div className="p-4 rounded-2xl border-2 border-slate-100 text-slate-400 peer-checked:bg-red-500 peer-checked:text-white peer-checked:border-red-500 peer-checked:shadow-lg transition-all flex flex-col items-center gap-2"><ArrowDownLeft className="w-6 h-6" /><span className="text-xs font-bold uppercase tracking-wider">I Borrowed</span></div>
                        </label>
                        <label className="cursor-pointer group">
                            <input type="radio" name="loanType" value="given" checked={loanType === 'given'} onChange={() => { setLoanType('given'); setError(null); }} className="peer sr-only" />
                            <div className="p-4 rounded-2xl border-2 border-slate-100 text-slate-400 peer-checked:bg-green-500 peer-checked:text-white peer-checked:border-green-500 peer-checked:shadow-lg transition-all flex flex-col items-center gap-2"><ArrowUpRight className="w-6 h-6" /><span className="text-xs font-bold uppercase tracking-wider">I Lent</span></div>
                        </label>
                    </div>

                    <div className="space-y-4">
                        <div><label className="text-sm font-bold text-slate-700 ml-1">Person Name</label><input name="person" type="text" required placeholder="e.g. Rahul" defaultValue={editItem?.person} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-slate-800" /></div>
                        <div><label className="text-sm font-bold text-slate-700 ml-1">Amount</label><input name="amount" type="number" required placeholder="0" value={amt} onChange={e => { setAmt(e.target.value); setError(null); }} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-black text-xl text-slate-800" /></div>

                        {loanType === 'given' && (
                            <CustomDropdown
                                label="Lend From (Source)"
                                value={source}
                                onChange={(val: string) => { setSource(val); setError(null); }}
                                options={FUNDS_LIST}
                                error={error}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-sm font-bold text-slate-700 ml-1">Date Taken</label><input name="date" type="date" required defaultValue={editItem?.date || new Date().toISOString().split('T')[0]} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-medium text-slate-600" /></div>
                            <div><label className="text-sm font-bold text-red-500 ml-1">Due Date</label><input name="dueDate" type="date" required defaultValue={editItem?.dueDate} className="w-full p-3.5 mt-1.5 bg-red-50 rounded-2xl border border-red-100 outline-none text-red-600 font-bold" /></div>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-95 transition-all text-base mt-2">Save Record</button>
                </form>
            </div>
        </div>
    );
};

interface RepaymentModalProps extends BaseModalProps {
    selectedLoan: LoanLog | null;
    pots: Record<string, number>;
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({ onClose, onSave, selectedLoan, pots }) => {
    const isPayingDebt = selectedLoan?.loanType === 'taken';
    const [source, setSource] = useState('Salary');
    const [amt, setAmt] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(amt);
        if (isPayingDebt) {
            const currentBalance = pots[source] || 0;
            if (amount > currentBalance) {
                setError(`Insufficient funds in ${source}. Available: ₹${currentBalance}`);
                return;
            }
        }
        onSave(e);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 ring-1 ring-white/50">
                <div className="flex justify-between items-center mb-6">
                    <div><h3 className="text-xl font-bold text-slate-800 tracking-tight">{isPayingDebt ? 'Repay Debt' : 'Receive Payment'}</h3><p className="text-xs font-medium text-slate-400">Loan with {selectedLoan?.person}</p></div>
                    <button onClick={onClose} type="button" className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <input type="hidden" name="paymentSource" value={source} />

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex justify-between text-sm mb-2"><span className="text-slate-500 font-medium">Total Amount</span><span className="font-bold text-slate-800">₹{selectedLoan?.amount}</span></div>
                        <div className="flex justify-between text-base"><span className="text-slate-600 font-bold">Remaining</span><span className="font-black text-red-500">₹{(selectedLoan?.amount || 0) - ((selectedLoan?.repayments || []).reduce((s, r) => s + r.amount, 0))}</span></div>
                    </div>

                    <div><label className="text-sm font-bold text-slate-700 ml-1">Amount</label><input name="amount" type="number" step="0.01" required placeholder="0" max={(selectedLoan?.amount || 0) - ((selectedLoan?.repayments || []).reduce((s, r) => s + r.amount, 0))} value={amt} onChange={e => { setAmt(e.target.value); setError(null); }} className="w-full p-4 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-black text-2xl text-slate-800" /></div>

                    <CustomDropdown
                        label={isPayingDebt ? "Pay From (Source)" : "Deposit To (Destination)"}
                        value={source}
                        onChange={(val: string) => { setSource(val); setError(null); }}
                        options={FUNDS_LIST}
                        error={error}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-sm font-bold text-slate-700 ml-1">Date</label><input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-medium text-slate-600" /></div>
                        <div><label className="text-sm font-bold text-slate-700 ml-1">Note</label><input name="note" placeholder="UPI..." className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-medium" /></div>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-95 transition-all text-base">Confirm</button>
                </form>
            </div>
        </div>
    );
};

interface MileageModalProps extends BaseModalProps {
    editItem: MileageLog | null;
    currentOdometer: number;
}

export const MileageModal: React.FC<MileageModalProps> = ({ onClose, onSave, editItem, currentOdometer }) => (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 ring-1 ring-white/50">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Update Odometer</h3>
                <button onClick={onClose} type="button" className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={onSave} className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">New Reading (km)</label>
                    <div className="flex items-center"><input name="reading" type="number" step="0.1" required defaultValue={editItem?.odometer || (currentOdometer ? currentOdometer + 10 : '')} placeholder="0" className="w-full text-4xl font-black bg-transparent outline-none text-slate-800 placeholder:text-slate-200" /></div>
                    {!editItem && <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Last: {currentOdometer} km</p>}
                </div>

                <div>
                    <label className="text-sm font-bold text-slate-700 ml-1">Current Fuel Status</label>
                    <div className="flex gap-3 mt-2">
                        <label className="flex-1 cursor-pointer group">
                            <input type="radio" name="fuelStatus" value="Main" defaultChecked={!editItem || editItem?.fuelStatus === 'Main'} className="peer sr-only" />
                            <div className="p-3.5 text-center rounded-2xl border-2 border-slate-100 text-slate-400 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 peer-checked:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2 group-hover:border-slate-200"><Zap className="w-4 h-4" /> Main</div>
                        </label>
                        <label className="flex-1 cursor-pointer group">
                            <input type="radio" name="fuelStatus" value="Reserve" defaultChecked={editItem?.fuelStatus === 'Reserve'} className="peer sr-only" />
                            <div className="p-3.5 text-center rounded-2xl border-2 border-slate-100 text-slate-400 peer-checked:bg-orange-500 peer-checked:text-white peer-checked:border-orange-500 peer-checked:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2 group-hover:border-slate-200"><Droplet className="w-4 h-4" /> Reserve</div>
                        </label>
                    </div>
                </div>

                <div><label className="text-sm font-bold text-slate-700 ml-1">Date</label><input name="date" type="date" required defaultValue={editItem?.date || new Date().toISOString().split('T')[0]} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-medium text-slate-600 focus:border-slate-300 transition-colors" /></div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 active:scale-95 transition-all text-base">Update Odometer</button>
            </form>
        </div>
    </div>
);

interface SettingsModalProps extends BaseModalProps {
    settings: VehicleSettings | null;
    subDetails: SubscriptionDetails;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSave, settings, subDetails }) => {
    const handleSubscribe = (plan: 'monthly' | 'yearly') => {
        const text = plan === 'monthly'
            ? "Hello, I want to subscribe to the Monthly Plan (₹10) for Trade2cart Finance. Please share payment details."
            : "Hello, I want to subscribe to the Yearly Plan (₹100) for Trade2cart Finance. Please share payment details.";
        window.open(`https://wa.me/918903166106?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 max-h-[90vh] overflow-y-auto ring-1 ring-white/50">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Profile & Store</h3>
                    <button onClick={onClose} type="button" className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
                </div>
                <form onSubmit={onSave} className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Crown className="w-5 h-5 text-orange-500 fill-orange-500" />
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Membership Status</h4>
                        </div>
                        <div className={`p-5 rounded-2xl border-2 ${subDetails.status === 'active' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'} relative overflow-hidden`}>
                            {subDetails.status === 'active' && <div className="absolute top-[-10px] right-[-10px] bg-emerald-100 w-20 h-20 rounded-full blur-2xl opacity-50"></div>}
                            <div className="flex justify-between items-center relative z-10">
                                <div>
                                    <p className="font-black text-slate-800 capitalize text-xl tracking-tight">{subDetails.plan} Member</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${subDetails.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                        <p className={`text-xs font-bold uppercase tracking-wide ${subDetails.status === 'active' ? 'text-emerald-700' : 'text-red-700'}`}>
                                            {subDetails.status === 'active' ? 'Active' : 'Expired'}
                                        </p>
                                    </div>
                                </div>
                                {subDetails.expiryDate && (
                                    <div className="text-right bg-white/60 px-3 py-1.5 rounded-lg border border-white/50 backdrop-blur-sm">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Expires On</p>
                                        <p className="text-sm font-bold text-slate-800">{subDetails.expiryDate}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <button type="button" onClick={() => handleSubscribe('monthly')} className="relative group p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50/30 transition-all text-left shadow-sm hover:shadow-md">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Flexible</p>
                                <p className="text-2xl font-black text-slate-800">₹10<span className="text-xs font-medium text-slate-400 ml-0.5">/mo</span></p>
                                <div className="mt-3 text-xs font-bold text-orange-600 bg-orange-100 w-fit px-3 py-1 rounded-full group-hover:bg-orange-200 transition-colors">Select Plan</div>
                            </button>
                            <button type="button" onClick={() => handleSubscribe('yearly')} className="relative group p-4 rounded-2xl border-2 border-slate-800 bg-slate-900 hover:bg-slate-800 transition-all text-left shadow-xl shadow-slate-200 overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 blur-2xl rounded-full"></div>
                                <div className="absolute top-0 right-0 bg-yellow-400 text-[10px] text-slate-900 font-black px-3 py-1 rounded-bl-xl shadow-sm">BEST VALUE</div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Yearly</p>
                                <p className="text-2xl font-black text-white">₹100<span className="text-xs font-medium text-slate-400 ml-0.5">/yr</span></p>
                                <div className="mt-3 text-xs font-bold text-slate-900 bg-white w-fit px-3 py-1 rounded-full flex items-center gap-1 group-hover:scale-105 transition-transform">Subscribe <Check className="w-3 h-3" /></div>
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 bg-slate-50 py-2 rounded-lg border border-slate-100">
                            <ShieldCheck className="w-3 h-3 text-green-500" />
                            <span>Secure payments processed via WhatsApp</span>
                        </div>
                    </div>
                    <div className="h-px bg-slate-100"></div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Fuel className="w-5 h-5 text-blue-500" />
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Vehicle Specs</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-1.5 block ml-1">Tank Capacity</label>
                                <div className="relative">
                                    <input name="tankCapacity" type="number" step="0.1" required defaultValue={settings?.tankCapacity} placeholder="0" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-all font-bold text-slate-800" />
                                    <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">L</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-1.5 block ml-1">Reserve</label>
                                <div className="relative">
                                    <input name="reserveCapacity" type="number" step="0.1" required defaultValue={settings?.reserveCapacity} placeholder="0" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-all font-bold text-slate-800" />
                                    <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">L</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="h-px bg-slate-100"></div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-purple-500" />
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Help Center</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => window.open(`https://wa.me/918903166106`, '_blank')} className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all group">
                                <MessageCircle className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold text-slate-700">Chat Support</span>
                            </button>
                            <button type="button" onClick={() => window.open(`mailto:trade@trade2cart.in`, '_blank')} className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all group">
                                <Mail className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold text-slate-700">Email Us</span>
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-95 transition-all text-base tracking-wide">Save & Close</button>
                </form>
            </div>
        </div>
    );
};

interface ServiceModalProps extends BaseModalProps {
    currentOdometer: number;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ onClose, onSave, currentOdometer }) => {
    const [task, setTask] = useState('Engine Oil');
    const [cost, setCost] = useState('');
    const [currentOdo, setCurrentOdo] = useState(currentOdometer?.toString() || '');
    const [intervalKm, setIntervalKm] = useState('3000');
    const [intervalDays, setIntervalDays] = useState('90');

    // Preset maintenance schedules
    const SERVICE_TASKS = [
        { name: 'Engine Oil', km: 3000, days: 90 },
        { name: 'Chain Lube', km: 500, days: 15 },
        { name: 'Air Filter', km: 5000, days: 180 },
        { name: 'Spark Plug', km: 12000, days: 365 },
        { name: 'Brake Pads', km: 5000, days: 180 },
        { name: 'General Service', km: 3000, days: 120 },
        { name: 'Coolant', km: 10000, days: 365 },
    ];

    const handleTaskChange = (newTask: string) => {
        setTask(newTask);
        const preset = SERVICE_TASKS.find(t => t.name === newTask);
        if (preset) {
            setIntervalKm(preset.km.toString());
            setIntervalDays(preset.days.toString());
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 ring-1 ring-white/50 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Record Maintenance</h3>
                    <button onClick={onClose} type="button" className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>

                <form onSubmit={onSave} className="space-y-5">
                    {/* Hidden Inputs for logic */}
                    <input type="hidden" name="taskName" value={task} />

                    {/* Task Selector */}
                    <div>
                        <label className="text-sm font-bold text-slate-700 ml-1 mb-2 block">Service Task</label>
                        <div className="grid grid-cols-2 gap-2">
                            {SERVICE_TASKS.map(t => (
                                <button
                                    key={t.name}
                                    type="button"
                                    onClick={() => handleTaskChange(t.name)}
                                    className={`p-3 rounded-xl text-xs font-bold border transition-all ${task === t.name ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider border-b border-slate-200 pb-2 mb-2">
                            <Wrench className="w-3 h-3" /> Service Details
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Odometer Now</label>
                                <input name="odometer" type="number" required value={currentOdo} onChange={e => setCurrentOdo(e.target.value)} className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-800 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Cost (₹)</label>
                                <input name="cost" type="number" placeholder="0" value={cost} onChange={e => setCost(e.target.value)} className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-800 outline-none focus:border-blue-500" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Date</label>
                            <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-800 outline-none" />
                        </div>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 space-y-4">
                        <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-wider border-b border-orange-200 pb-2 mb-2">
                            <BellRing className="w-3 h-3" /> Set Next Reminder
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Repeat after (km)</label>
                                <input name="intervalKm" type="number" value={intervalKm} onChange={e => setIntervalKm(e.target.value)} className="w-full p-2 bg-white rounded-lg border border-orange-200 font-bold text-orange-800 outline-none focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Repeat after (Days)</label>
                                <input name="intervalDays" type="number" value={intervalDays} onChange={e => setIntervalDays(e.target.value)} className="w-full p-2 bg-white rounded-lg border border-orange-200 font-bold text-orange-800 outline-none focus:border-orange-500" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-95 transition-all text-base">Save Service Record</button>
                </form>
            </div>
        </div>
    );
};