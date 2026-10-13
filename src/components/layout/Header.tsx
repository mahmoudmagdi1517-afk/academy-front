import React, { useEffect, useState } from 'react';
import { Menu, Globe, Activity, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authApi } from '../../api/auth.api';
import { Logo } from '../common/Logo';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    authApi
      .getHealth()
      .then((res) => {
        setIsHealthy(res.success);
      })
      .catch(() => {
        setIsHealthy(false);
      });
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl md:hidden transition"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* 📌 مكان اللوجو في الهيدر للموبايل (Mobile Header Logo Slot) */}
        <div className="md:hidden flex items-center">
          <Logo size="sm" showText={false} />
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="font-bold text-indigo-700">Colorad Language Center</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Health Indicator */}
        <div
          title={isHealthy ? 'Backend API Connected' : 'Connecting to API...'}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-200 text-xs font-semibold text-slate-700"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isHealthy === true
                ? 'bg-emerald-500 animate-pulse'
                : isHealthy === false
                ? 'bg-rose-500'
                : 'bg-amber-400 animate-ping'
            }`}
          />
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">
            {isHealthy === true ? 'API Connected' : isHealthy === false ? 'Offline' : 'Checking'}
          </span>
        </div>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>

        {/* User Role Tag */}
        <div className="flex items-center gap-2 pl-2 rtl:pl-0 rtl:pr-2 border-s border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</span>
            <span className="text-[10px] text-slate-400 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
