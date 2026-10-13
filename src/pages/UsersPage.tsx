import React, { useEffect, useState } from 'react';
import { UserCog, Plus, Shield, UserCheck, Mail, Lock } from 'lucide-react';
import { Employee } from '../types/hr';
import { authApi } from '../api/auth.api';
import { hrApi } from '../api/hr.api';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const UsersPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const { user: currentUser } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    locale: 'en',
    employeeId: '',
  });

  useEffect(() => {
    hrApi
      .listEmployees()
      .then((emps) => setEmployees(emps))
      .catch(() => {});
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.password) return;

    setSubmitting(true);
    try {
      await authApi.createUser({
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        role: userForm.role,
        locale: userForm.locale,
        employeeId: userForm.employeeId || null,
      });

      success('New user account created successfully');
      setIsCreateOpen(false);
      setUserForm({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        locale: 'en',
        employeeId: '',
      });
    } catch (err: any) {
      error(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t('nav.users')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Role-based access management for Academy Managers, Administrators, and Instructors.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New User Account</span>
        </button>
      </div>

      {/* Current session info */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Your Active Session</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-base">
            {currentUser?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900">{currentUser?.name}</span>
              <Badge variant="primary" size="sm">
                {currentUser?.role}
              </Badge>
            </div>
            <span className="text-xs text-slate-400 font-mono">{currentUser?.email}</span>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create System User"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">User Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Jenkins"
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              placeholder="user@academy.local"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password (min 8 chars) *</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">System Role *</label>
            <SearchableSelect
              value={userForm.role}
              onChange={(value) => setUserForm({ ...userForm, role: value, employeeId: '' })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-semibold capitalize"
            >
              <option value="admin">Administrator (Finance & Students)</option>
              <option value="manager">Manager (HR, Finance, Sessions)</option>
              <option value="teacher">Instructor (Attendance Only)</option>
            </SearchableSelect>
          </div>

          {['teacher', 'manager'].includes(userForm.role) && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Link Employee Profile *</label>
              <SearchableSelect
                required
                value={userForm.employeeId}
                onChange={(value) => setUserForm({ ...userForm, employeeId: value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
              >
                <option value="">-- Choose Employee --</option>
                {employees
                  .filter((emp) =>
                    !emp.hasUserAccount &&
                    (userForm.role === 'teacher'
                      ? emp.role === 'instructor' || emp.isTeacher
                      : emp.role === 'manager')
                  )
                  .map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
              </SearchableSelect>
              {userForm.role === 'manager' && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('employee.accountLinkHint')}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Default Interface Language</label>
            <SearchableSelect
              value={userForm.locale}
              onChange={(value) => setUserForm({ ...userForm, locale: value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden"
            >
              <option value="en">English</option>
              <option value="ar">العربية (Arabic)</option>
            </SearchableSelect>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              {submitting ? 'Creating...' : t('common.create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
