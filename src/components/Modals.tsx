// src/components/Modals.tsx
import React, { useState, useEffect } from 'react';
import { Fuel, X, Crown, Mail, MessageCircle, HelpCircle, Check, ShieldCheck, ChevronRight, Gauge, Zap, Droplet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { ExpenseLog, MileageLog, LoanLog, VehicleSettings, SubscriptionDetails } from './types';

interface BaseModalProps {
    onClose: () => void;
    onSave: (e: React.FormEvent) => void;
}

interface ExpenseModalProps extends BaseModalProps {
    editItem: ExpenseLog | null;
    currentOdometer: number;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ onClose, onSave, editItem, currentOdometer }) => {
    const [cat, setCat] = useState(editItem?.category || 'Groceries');
    const [price, setPrice] = useState(editItem?.fuelPrice?.toString() || '');
    const [vol, setVol] = useState(editItem?.fuelVolume?.toString() || '');
    const [amt, setAmt] = useState(editItem?.amount?.toString() || '');

    // Auto-calculate liters
    useEffect(() => {
        if (cat === 'Fuel' && price && amt) {
            const p = parseFloat(price);
            const a = parseFloat(amt);
            if (p > 0) setVol((a / p).toFixed(2));
        }
    }, [price, amt, cat]);

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 max-h-[90vh] overflow-y-auto ring-1 ring-white/50">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{editItem ? 'Edit Expense' : 'Add Expense'}</h3>
                    <button onClick={onClose} type="button" className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <form onSubmit={onSave} className="space-y-6">
                    <div className="text-center py-2 relative">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Amount</label>
                        <div className="flex items-center justify-center text-5xl font-black text-slate-800 mt-2">
                            <span className="text-slate-300 text-3xl mr-2 font-medium">₹</span>
                            <input name="amount" type="number" step="0.01" required placeholder="0" value={amt} onChange={e => setAmt(e.target.value)} className="w-48 text-center bg-transparent outline-none placeholder:text-slate-200" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 ml-1">Category</label>
                            <div className="relative mt-1.5">
                                <select name="category" value={cat} onChange={e => setCat(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-slate-700 font-bold appearance-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all">
                                    <optgroup label="Daily Essentials">
                                        <option>Groceries</option>
                                        <option>Vegetables/Fruits</option>
                                        <option>Milk & Dairy</option>
                                        <option>Dining Out</option>
                                    </optgroup>
                                    <optgroup label="Vehicle">
                                        <option>Fuel</option>
                                        <option>Maintenance</option>
                                        <option>Service</option>
                                        <option>Insurance</option>
                                        <option>Toll</option>
                                    </optgroup>
                                    <optgroup label="Home & Bills">
                                        <option>Rent</option>
                                        <option>EMI</option>
                                        <option>Bills (Elec/Water)</option>
                                        <option>Medical</option>
                                        <option>Shopping</option>
                                        <option>Other</option>
                                    </optgroup>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronRight className="w-5 h-5 rotate-90" /></div>
                            </div>
                        </div>

                        {cat === 'Fuel' && (
                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-blue-700 font-bold border-b border-blue-100 pb-2">
                                    <Fuel className="w-4 h-4" /> Fuel Log (Required)
                                </div>

                                {/* 1. Odometer (MANDATORY) */}
                                <div>
                                    <label className="text-xs text-blue-600 font-bold block mb-1.5 flex items-center gap-1">
                                        <Gauge className="w-3 h-3" /> Current Odometer
                                    </label>
                                    <input
                                        name="linkedOdometer"
                                        type="number"
                                        required
                                        placeholder={currentOdometer ? `${currentOdometer} (Previous)` : "e.g. 12500"}
                                        className="w-full p-3 rounded-xl border border-blue-200 bg-white outline-none font-bold text-slate-700 text-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                                    />
                                </div>

                                {/* 2. Fuel Status (MANDATORY) */}
                                <div>
                                    <label className="text-xs text-blue-600 font-bold block mb-2">Current Bike Status</label>
                                    <div className="flex gap-3">
                                        <label className="flex-1 cursor-pointer group">
                                            <input type="radio" name="fuelStatus" value="Main" required className="peer sr-only" />
                                            <div className="p-3 text-center rounded-xl border-2 border-blue-100 bg-white text-slate-400 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 peer-checked:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2">
                                                <Zap className="w-4 h-4" /> Main
                                            </div>
                                        </label>
                                        <label className="flex-1 cursor-pointer group">
                                            <input type="radio" name="fuelStatus" value="Reserve" required className="peer sr-only" />
                                            <div className="p-3 text-center rounded-xl border-2 border-blue-100 bg-white text-slate-400 peer-checked:bg-orange-500 peer-checked:text-white peer-checked:border-orange-500 peer-checked:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2">
                                                <Droplet className="w-4 h-4" /> Reserve
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* 3. Price & Liters */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-100">
                                    <div>
                                        <label className="text-xs text-blue-600 font-bold block mb-1.5">Price / L</label>
                                        <input name="fuelPrice" type="number" step="0.01" required placeholder="e.g. 102" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 bg-white rounded-xl border border-blue-200 outline-none font-bold text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-blue-600 font-bold block mb-1.5">Liters</label>
                                        <input name="fuelVolume" type="number" step="0.01" placeholder="Auto" value={vol} onChange={e => setVol(e.target.value)} className="w-full p-3 bg-blue-100/50 rounded-xl border border-blue-200 outline-none font-bold text-blue-800" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-sm font-bold text-slate-700 ml-1">Date</label><input name="date" type="date" required defaultValue={editItem?.date || new Date().toISOString().split('T')[0]} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-medium text-slate-600 focus:border-slate-300 transition-colors" /></div>
                            <div><label className="text-sm font-bold text-slate-700 ml-1">Note</label><input name="note" placeholder="Short note..." defaultValue={editItem?.note} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-medium focus:border-slate-300 transition-colors" /></div>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-95 transition-all text-base">Save Expense</button>
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

                {/* Standard Status Selection for Manual Updates */}
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

interface LoanModalProps extends BaseModalProps {
    editItem: LoanLog | null;
}

export const LoanModal: React.FC<LoanModalProps> = ({ onClose, onSave, editItem }) => (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 ring-1 ring-white/50">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">{editItem ? 'Edit Loan' : 'Add Loan / Debt'}</h3>
                <button onClick={onClose} type="button" className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={onSave} className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer group">
                        <input type="radio" name="loanType" value="taken" defaultChecked={!editItem || editItem?.loanType === 'taken'} className="peer sr-only" />
                        <div className="p-4 rounded-2xl border-2 border-slate-100 text-slate-400 peer-checked:bg-red-500 peer-checked:text-white peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-200 transition-all flex flex-col items-center gap-2 group-hover:border-slate-200"><ArrowDownLeft className="w-6 h-6" /><span className="text-xs font-bold uppercase tracking-wider">I Borrowed</span></div>
                    </label>
                    <label className="cursor-pointer group">
                        <input type="radio" name="loanType" value="given" defaultChecked={editItem?.loanType === 'given'} className="peer sr-only" />
                        <div className="p-4 rounded-2xl border-2 border-slate-100 text-slate-400 peer-checked:bg-green-500 peer-checked:text-white peer-checked:border-green-500 peer-checked:shadow-lg peer-checked:shadow-green-200 transition-all flex flex-col items-center gap-2 group-hover:border-slate-200"><ArrowUpRight className="w-6 h-6" /><span className="text-xs font-bold uppercase tracking-wider">I Lent</span></div>
                    </label>
                </div>

                <div className="space-y-4">
                    <div><label className="text-sm font-bold text-slate-700 ml-1">Person Name</label><input name="person" type="text" required placeholder="e.g. Rahul" defaultValue={editItem?.person} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-slate-800" /></div>
                    <div><label className="text-sm font-bold text-slate-700 ml-1">Amount</label><input name="amount" type="number" required placeholder="0" defaultValue={editItem?.amount} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-black text-xl text-slate-800" /></div>
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

interface RepaymentModalProps extends BaseModalProps {
    selectedLoan: LoanLog | null;
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({ onClose, onSave, selectedLoan }) => (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 ring-1 ring-white/50">
            <div className="flex justify-between items-center mb-6">
                <div><h3 className="text-xl font-bold text-slate-800 tracking-tight">Record Payment</h3><p className="text-xs font-medium text-slate-400">Loan with {selectedLoan?.person}</p></div>
                <button onClick={onClose} type="button" className="bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={onSave} className="space-y-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex justify-between text-sm mb-2"><span className="text-slate-500 font-medium">Total Loan Amount</span><span className="font-bold text-slate-800">₹{selectedLoan?.amount}</span></div>
                    <div className="flex justify-between text-sm mb-2"><span className="text-slate-500 font-medium">Paid So Far</span><span className="font-bold text-emerald-600">₹{(selectedLoan?.repayments || []).reduce((s, r) => s + r.amount, 0)}</span></div>
                    <div className="h-px bg-slate-200 my-3"></div>
                    <div className="flex justify-between text-base"><span className="text-slate-600 font-bold">Remaining Balance</span><span className="font-black text-red-500">₹{(selectedLoan?.amount || 0) - ((selectedLoan?.repayments || []).reduce((s, r) => s + r.amount, 0))}</span></div>
                </div>
                <div><label className="text-sm font-bold text-slate-700 ml-1">Payment Amount</label><input name="amount" type="number" step="0.01" required placeholder="0" max={(selectedLoan?.amount || 0) - ((selectedLoan?.repayments || []).reduce((s, r) => s + r.amount, 0))} className="w-full p-4 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-black text-2xl text-slate-800" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-bold text-slate-700 ml-1">Date</label><input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-medium text-slate-600" /></div>
                    <div><label className="text-sm font-bold text-slate-700 ml-1">Method / Note</label><input name="note" placeholder="UPI..." className="w-full p-3.5 mt-1.5 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-medium" /></div>
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-95 transition-all text-base">Confirm Payment</button>
            </form>
        </div>
    </div>
);

// --- SETTINGS MODAL (No Changes needed here, kept for completeness) ---
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