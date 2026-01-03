import React, { useState, useEffect } from 'react';
import { Fuel, X, Zap, Droplet, ArrowDownLeft, ArrowUpRight, Banknote } from 'lucide-react';
import type { ExpenseLog, MileageLog, LoanLog } from './types';

interface BaseModalProps {
    onClose: () => void;
    onSave: (e: React.FormEvent) => void;
}

interface ExpenseModalProps extends BaseModalProps {
    editItem: ExpenseLog | null;
    currentOdometer: number;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ onClose, onSave, editItem, currentOdometer }) => {
    // Default to Fuel if adding from "Vehicle Mode" logic could be added, but standard is fine
    const [cat, setCat] = useState(editItem?.category || 'Groceries');
    const [price, setPrice] = useState(editItem?.fuelPrice?.toString() || '');
    const [vol, setVol] = useState(editItem?.fuelVolume?.toString() || '');
    const [amt, setAmt] = useState(editItem?.amount?.toString() || '');

    // Auto-calculate Volume when Price or Amount changes
    useEffect(() => {
        if (cat === 'Fuel' && price && amt) {
            const p = parseFloat(price);
            const a = parseFloat(amt);
            if (p > 0) {
                // Only update vol if it wasn't manually typed recently (simple check)
                setVol((a / p).toFixed(2));
            }
        }
    }, [price, amt, cat]);

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">{editItem ? 'Edit Expense' : 'Add Expense'}</h3>
                    <button onClick={onClose} type="button" className="bg-slate-100 p-2 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <form onSubmit={onSave} className="space-y-4">
                    <div className="text-center">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Amount</label>
                        <div className="flex items-center justify-center text-4xl font-bold text-slate-800 mt-1">
                            <span className="text-slate-300 mr-2">₹</span>
                            <input name="amount" type="number" step="0.01" required placeholder="0" value={amt} onChange={e => setAmt(e.target.value)} className="w-48 text-center bg-transparent outline-none placeholder:text-slate-200" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium text-slate-600">Category</label>
                            <select name="category" value={cat} onChange={e => setCat(e.target.value)} className="w-full p-3 mt-1 bg-slate-50 rounded-xl border border-slate-200 outline-none text-slate-700 font-medium">
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
                        </div>

                        {cat === 'Fuel' && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                                <div className="flex items-center gap-2 text-blue-700 font-semibold border-b border-blue-100 pb-2">
                                    <Fuel className="w-4 h-4" /> Fuel Details
                                </div>

                                {!editItem && (
                                    <div>
                                        <label className="text-xs text-blue-600 font-bold block mb-1">Current Odometer (Optional)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                name="linkedOdometer"
                                                type="number"
                                                placeholder={currentOdometer.toString()}
                                                className="w-full p-2 rounded-lg border-blue-200 outline-none font-bold text-slate-700"
                                            />
                                            <span className="text-xs text-blue-400 font-medium">km</span>
                                        </div>
                                        <p className="text-[10px] text-blue-400 mt-1">Enter to auto-update mileage log</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-blue-600 font-bold block mb-1">Price / L</label>
                                        <input name="fuelPrice" type="number" step="0.01" placeholder="e.g. 102" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 rounded-lg border-blue-200 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-blue-600 font-bold block mb-1">Liters</label>
                                        {/* Removed readOnly so you can fix it manually */}
                                        <input name="fuelVolume" type="number" step="0.01" placeholder="Liters" value={vol} onChange={e => setVol(e.target.value)} className="w-full p-2 rounded-lg border-blue-200 bg-white outline-none font-bold" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-sm font-medium text-slate-600">Date</label><input name="date" type="date" required defaultValue={editItem?.date || new Date().toISOString().split('T')[0]} className="w-full p-3 mt-1 bg-slate-50 rounded-xl border border-slate-200 outline-none" /></div>
                            <div><label className="text-sm font-medium text-slate-600">Note</label><input name="note" placeholder="Short note..." defaultValue={editItem?.note} className="w-full p-3 mt-1 bg-slate-50 rounded-xl border border-slate-200 outline-none" /></div>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 mt-4">Save</button>
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Update Odometer</h3>
                <button onClick={onClose} type="button" className="bg-slate-100 p-2 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={onSave} className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-slate-600">New Reading (km)</label>
                    <div className="flex items-center mt-1"><input name="reading" type="number" step="0.1" required defaultValue={editItem?.odometer || (currentOdometer ? currentOdometer + 10 : '')} placeholder="0" className="w-full text-2xl font-bold p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" /></div>
                    {!editItem && <p className="text-xs text-slate-400 mt-2">Current: {currentOdometer} km</p>}
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-600">Fuel Status</label>
                    <div className="flex gap-2 mt-1">
                        <label className="flex-1 cursor-pointer">
                            <input type="radio" name="fuelStatus" value="Main" defaultChecked={!editItem || editItem?.fuelStatus === 'Main'} className="peer sr-only" />
                            <div className="p-3 text-center rounded-xl border border-slate-200 text-slate-500 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 transition-all font-bold text-sm flex items-center justify-center gap-2"><Zap className="w-4 h-4" /> Main</div>
                        </label>
                        <label className="flex-1 cursor-pointer">
                            <input type="radio" name="fuelStatus" value="Reserve" defaultChecked={editItem?.fuelStatus === 'Reserve'} className="peer sr-only" />
                            <div className="p-3 text-center rounded-xl border border-slate-200 text-slate-500 peer-checked:bg-orange-500 peer-checked:text-white peer-checked:border-orange-500 transition-all font-bold text-sm flex items-center justify-center gap-2"><Droplet className="w-4 h-4" /> Reserve</div>
                        </label>
                    </div>
                </div>
                <div><label className="text-sm font-medium text-slate-600">Date</label><input name="date" type="date" required defaultValue={editItem?.date || new Date().toISOString().split('T')[0]} className="w-full p-3 mt-1 bg-slate-50 rounded-xl border border-slate-200 outline-none" /></div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 mt-4">Update</button>
            </form>
        </div>
    </div>
);

interface LoanModalProps extends BaseModalProps {
    editItem: LoanLog | null;
}

export const LoanModal: React.FC<LoanModalProps> = ({ onClose, onSave, editItem }) => (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">{editItem ? 'Edit Loan' : 'Add Loan/Debt'}</h3>
                <button onClick={onClose} type="button" className="bg-slate-100 p-2 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={onSave} className="space-y-4">

                <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer">
                        <input type="radio" name="loanType" value="taken" defaultChecked={!editItem || editItem?.loanType === 'taken'} className="peer sr-only" />
                        <div className="p-3 rounded-xl border border-slate-200 text-slate-500 peer-checked:bg-red-500 peer-checked:text-white peer-checked:border-red-500 transition-all flex flex-col items-center gap-1">
                            <ArrowDownLeft className="w-5 h-5" />
                            <span className="text-xs font-bold">I Borrowed</span>
                        </div>
                    </label>
                    <label className="cursor-pointer">
                        <input type="radio" name="loanType" value="given" defaultChecked={editItem?.loanType === 'given'} className="peer sr-only" />
                        <div className="p-3 rounded-xl border border-slate-200 text-slate-500 peer-checked:bg-green-500 peer-checked:text-white peer-checked:border-green-500 transition-all flex flex-col items-center gap-1">
                            <ArrowUpRight className="w-5 h-5" />
                            <span className="text-xs font-bold">I Lent</span>
                        </div>
                    </label>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-600">Person Name</label>
                    <input name="person" type="text" required placeholder="e.g. Rahul, Shopkeeper" defaultValue={editItem?.person} className="w-full p-3 mt-1 bg-slate-50 rounded-xl border border-slate-200 outline-none" />
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-600">Total Amount</label>
                    <div className="relative mt-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input name="amount" type="number" required placeholder="0" defaultValue={editItem?.amount} className="w-full p-3 pl-8 bg-slate-50 rounded-xl border border-slate-200 outline-none font-bold text-lg" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium text-slate-600">Date Taken</label><input name="date" type="date" required defaultValue={editItem?.date || new Date().toISOString().split('T')[0]} className="w-full p-3 mt-1 bg-slate-50 rounded-xl border border-slate-200 outline-none" /></div>
                    <div><label className="text-sm font-medium text-slate-600 text-red-500">Repay Due Date</label><input name="dueDate" type="date" required defaultValue={editItem?.dueDate} className="w-full p-3 mt-1 bg-red-50 rounded-xl border border-red-100 outline-none text-red-600 font-medium" /></div>
                </div>

                <div><label className="text-sm font-medium text-slate-600">Note</label><input name="note" placeholder="Optional details..." defaultValue={editItem?.note} className="w-full p-3 mt-1 bg-slate-50 rounded-xl border border-slate-200 outline-none" /></div>

                <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 mt-4">Save Record</button>
            </form>
        </div>
    </div>
);

interface RepaymentModalProps extends BaseModalProps {
    selectedLoan: LoanLog | null;
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({ onClose, onSave, selectedLoan }) => (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Add Repayment</h3>
                    <p className="text-xs text-slate-400">for {selectedLoan?.person}</p>
                </div>
                <button onClick={onClose} type="button" className="bg-slate-100 p-2 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={onSave} className="space-y-4">

                <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Total Loan</span>
                        <span className="font-bold">₹{selectedLoan?.amount}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Paid So Far</span>
                        <span className="font-bold text-green-600">₹{(selectedLoan?.repayments || []).reduce((s, r) => s + r.amount, 0)}</span>
                    </div>
                    <div className="border-t border-slate-200 my-2"></div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Remaining</span>
                        <span className="font-bold text-red-500">₹{(selectedLoan?.amount || 0) - ((selectedLoan?.repayments || []).reduce((s, r) => s + r.amount, 0))}</span>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-600">Repayment Amount</label>
                    <div className="relative mt-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input name="amount" type="number" step="0.01" required placeholder="0" max={(selectedLoan?.amount || 0) - ((selectedLoan?.repayments || []).reduce((s, r) => s + r.amount, 0))} className="w-full p-3 pl-8 bg-slate-50 rounded-xl border border-slate-200 outline-none font-bold text-lg" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium text-slate-600">Date Paid</label><input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-3 mt-1 bg-slate-50 rounded-xl border border-slate-200 outline-none" /></div>
                    <div><label className="text-sm font-medium text-slate-600">Note</label><input name="note" placeholder="UPI / Cash..." className="w-full p-3 mt-1 bg-slate-50 rounded-xl border border-slate-200 outline-none" /></div>
                </div>

                <button type="submit" className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 mt-4">Record Payment</button>
            </form>
        </div>
    </div>
);