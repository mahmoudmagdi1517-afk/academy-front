import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  FileCheck,
  CreditCard,
  ReceiptText,
  WalletCards,
  CalendarDays,
  History,
  Users,
  Briefcase,
  UserCog,
  LogOut,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types/auth';
import { Logo } from '../common/Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, hasRole } = useAuth();
  const { t } = useLanguage();

  const navItems: NavItem[] = [
    {
      to: '/',
      labelKey: 'nav.dashboard',
      icon: LayoutDashboard,
      roles: ['owner', 'manager', 'admin', 'teacher'],
    },
    {
      to: '/students',
      labelKey: 'nav.students',
      icon: GraduationCap,
      roles: ['owner', 'manager', 'admin'],
    },
    {
      to: '/my-students',
      labelKey: 'nav.myStudents',
      icon: GraduationCap,
      roles: ['teacher'],
    },
    {
      to: '/my-groups',
      labelKey: 'nav.myGroups',
      icon: BookOpen,
      roles: ['teacher'],
    },
    {
      to: '/my-schedule',
      labelKey: 'nav.mySchedule',
      icon: CalendarDays,
      roles: ['teacher'],
    },
    {
      to: '/attendance',
      labelKey: 'nav.attendance',
      icon: ClipboardCheck,
      roles: ['teacher'],
    },
    {
      to: '/attendance-reports',
      labelKey: 'nav.attendanceReports',
      icon: FileCheck,
      roles: ['teacher'],
    },
    {
      to: '/courses',
      labelKey: 'nav.courses',
      icon: BookOpen,
      roles: ['owner', 'manager', 'admin'],
    },
    {
      to: '/subscriptions',
      labelKey: 'nav.subscriptions',
      icon: FileCheck,
      roles: ['owner', 'manager', 'admin'],
    },
    {
      to: '/payments',
      labelKey: 'nav.payments',
      icon: CreditCard,
      roles: ['owner', 'manager', 'admin'],
    },
    {
      to: '/expenses',
      labelKey: 'nav.expenses',
      icon: ReceiptText,
      roles: ['owner', 'manager'],
    },
    {
      to: '/treasury',
      labelKey: 'nav.treasury',
      icon: WalletCards,
      roles: ['owner', 'manager'],
    },
    {
      to: '/sessions',
      labelKey: 'nav.sessions',
      icon: CalendarDays,
      roles: ['owner', 'manager', 'admin', 'teacher'],
    },
    {
      to: '/makeups',
      labelKey: 'nav.makeups',
      icon: History,
      roles: ['owner', 'manager'],
    },
    {
      to: '/hr',
      labelKey: 'nav.hr',
      icon: Users,
      roles: ['owner', 'manager'],
    },
    {
      to: '/payroll',
      labelKey: 'nav.payroll',
      icon: Briefcase,
      roles: ['owner', 'manager'],
    },
    {
      to: '/users',
      labelKey: 'nav.users',
      icon: UserCog,
      roles: ['owner', 'manager'],
    },
  ];

  const filteredItems = navItems.filter((item) => hasRole(...item.roles));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 z-40 w-64 bg-[#101930] text-slate-100 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full md:rtl:translate-x-0'
        } start-0 border-e border-[#1a294e] shadow-xl`}
      >
        {/* ------------------------------------------------------------- */}
        {/* 📌 مكان اللوجو في الشريط الجانبي (Sidebar Logo Slot)          */}
        {/* ------------------------------------------------------------- */}
        <div className="h-16 flex items-center px-4 border-b border-[#1a294e] gap-3">
          <Logo size="sm" showText={true} textVariant="light" />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#162244]/80'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-[#1a294e] bg-[#0c1326]/80">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-white truncate">{user?.name}</span>
              <span className="text-xs text-slate-400 capitalize">{user?.role}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#182648] text-indigo-300 border border-[#233560]">
              {user?.role}
            </span>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
