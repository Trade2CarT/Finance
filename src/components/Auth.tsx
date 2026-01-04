import React, { useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, appId } from './firebaseConfig';
import { Wallet, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [isReset, setIsReset] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            if (isReset) {
                await sendPasswordResetEmail(auth, email);
                setMessage('Password reset email sent! Check your inbox.');
                setIsReset(false);
            } else if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                // CREATE USER DOC with Free status
                await setDoc(doc(db, 'artifacts', appId, 'users', user.uid), {
                    email: user.email,
                    subscription: 'free',
                    createdAt: Date.now(),
                    subscriptionDate: null
                });
            }
        } catch (err: any) {
            const msg = err.code?.replace('auth/', '').replace(/-/g, ' ') || 'An error occurred';
            setError(msg.charAt(0).toUpperCase() + msg.slice(1));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-xl border border-slate-100">
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo.PNG" alt="Logo" className="h-10 w-10 rounded-lg bg-white p-0.5 shadow-sm object-contain border border-slate-100" />
                    
                    <h1 className="text-2xl font-bold text-slate-800">Trade2cart Finance</h1>
                    <p className="text-slate-400 text-sm">Track expenses & loans</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">{error}</div>}
                    {message && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg text-center font-medium">{message}</div>}
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label><div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200"><Mail className="w-5 h-5 text-slate-400" /><input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent w-full outline-none text-slate-800 font-medium placeholder:text-slate-300" /></div></div>
                    {!isReset && (<div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label><div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200"><Lock className="w-5 h-5 text-slate-400" /><input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-transparent w-full outline-none text-slate-800 font-medium placeholder:text-slate-300" /></div></div>)}
                    <button type="submit" disabled={loading} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-70">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>{isReset ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Create Account')} {!isReset && <ArrowRight className="w-4 h-4" />}</>)}</button>
                </form>
                <div className="mt-6 space-y-3 text-center">
                    {!isReset ? (<><button onClick={() => setIsReset(true)} className="text-sm text-slate-400 hover:text-orange-600 font-medium">Forgot Password?</button><div className="border-t border-slate-100 pt-3"><p className="text-sm text-slate-500">{isLogin ? "Don't have an account?" : "Already have an account?"}<button onClick={() => setIsLogin(!isLogin)} className="ml-1 text-orange-600 font-bold hover:underline">{isLogin ? 'Sign Up' : 'Log In'}</button></p></div></>) : (<button onClick={() => setIsReset(false)} className="text-sm text-slate-500 hover:text-slate-800 font-bold">Back to Login</button>)}
                </div>
            </div>
        </div>
    );
}