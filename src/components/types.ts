// src/components/types.ts

export interface MileageLog {
    id: string;
    type: 'mileage';
    date: string;
    odometer: number;
    distance: number;
    fuelStatus?: 'Main' | 'Reserve';
    timestamp: number;
}

export interface ExpenseLog {
    id: string;
    type: 'expense';
    txnType: 'income' | 'expense';
    date: string;
    amount: number;
    category: string;
    paymentSource?: string; // Where money came from (Salary, Savings...)
    note: string;
    fuelPrice?: number;
    fuelVolume?: number;
    timestamp: number;
}

export interface Repayment {
    id: string;
    amount: number;
    date: string;
    note?: string;
    paymentSource: string; // Where did I pay from? OR Where did I deposit this?
}

export interface LoanLog {
    id: string;
    type: 'loan';
    loanType: 'given' | 'taken';
    person: string;
    amount: number;
    date: string;
    dueDate: string;
    note: string;
    paymentSource?: string; // If 'given', where did I take money from?
    repayments: Repayment[];
    timestamp: number;
}

export interface VehicleSettings {
    tankCapacity: number;
    reserveCapacity: number;
}

export interface SubscriptionDetails {
    plan: 'free' | 'monthly' | 'yearly';
    status: 'active' | 'expired';
    expiryDate: string | null;
    daysLeft: number;
}

export type TabView = 'dashboard' | 'history' | 'analytics';
export type DashboardMode = 'wallet' | 'vehicle';