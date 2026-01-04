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
    date: string;
    amount: number;
    category: string;
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
    repayments: Repayment[];
    timestamp: number;
}

export interface VehicleSettings {
    tankCapacity: number;
    reserveCapacity: number;
}

// --- NEW: Subscription Interface ---
export interface SubscriptionDetails {
    plan: 'free' | 'monthly' | 'yearly';
    status: 'active' | 'expired';
    expiryDate: string | null; // e.g., "12 Jan 2025"
    daysLeft: number;
}

export type TabView = 'dashboard' | 'history' | 'analytics';
export type DashboardMode = 'wallet' | 'vehicle';