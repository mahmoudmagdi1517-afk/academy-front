import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/common/Logo';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { t } = useLanguage();
  const { success } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      await login(email, password);
      success('Welcome back to Academy Operations!');
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('owner@academy.local');
    setPassword('ChangeMeOwner1!');
  };

  return (
    <div className="min-h-screen bg-[#0b1226] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects matching Colorad Navy */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#1b3b7a]/25 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* ------------------------------------------------------------- */}
        {/* 📌 مكان اللوجو الرئيسي في صفحة تسجيل الدخول (Login Page Logo Slot) */}
        {/* ------------------------------------------------------------- */}
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <Logo size="xl" showText={false} />
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Colorad Language Center
          </h1>
          <p className="mt-1.5 text-center text-xs sm:text-sm text-slate-300 font-medium">
            مركز كولوراد للغات • بوابة إدارة العمليات
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl shadow-slate-950/40 rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('student.email')}
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@academy.local"
                  className="block w-full rounded-xl border border-slate-200 ps-10 pe-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-slate-200 ps-10 pe-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition cursor-pointer"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Quick fill demo helper */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400">Development Shortcut</span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Fill Default Owner Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
