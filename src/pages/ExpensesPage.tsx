import React, { useEffect, useState } from 'react';
import { Eye, Plus, ReceiptText, Upload, WalletCards } from 'lucide-react';
import { Expense, ExpenseCategory, ExpenseReceipt } from '../types/expense';
import { expenseApi } from '../api/expense.api';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { formatQAR, qarToFils } from '../utils/currency';
import { formatDate, getQatarToday } from '../utils/date';
import { treasuryApi } from '../api/treasury.api';
import { Cashbox } from '../types/treasury';

const MAX_RECEIPT_BYTES = 1_500_000;
const categories: ExpenseCategory[] = [
  'cleaning',
  'rent',
  'utilities',
  'supplies',
  'maintenance',
  'internet',
  'marketing',
  'transport',
  'other',
];

interface ReceiptUpload {
  mimeType: string;
  data: string;
}

function readReceipt(file: File): Promise<ReceiptUpload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read receipt image'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read receipt image'));
        return;
      }
      const data = reader.result.split(',')[1];
      if (!data) {
        reject(new Error('Could not read receipt image'));
        return;
      }
      resolve({ mimeType: file.type, data });
    };
    reader.readAsDataURL(file);
  });
}

export const ExpensesPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [cashboxId, setCashboxId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('cleaning');
  const [description, setDescription] = useState('');
  const [amountQar, setAmountQar] = useState('');
  const [spentAt, setSpentAt] = useState(getQatarToday());
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<ReceiptUpload | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<Expense | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<ExpenseReceipt | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const [expenseRows, cashboxRows] = await Promise.all([
        expenseApi.listExpenses(),
        treasuryApi.listCashboxes(),
      ]);
      setExpenses(expenseRows);
      setCashboxes(cashboxRows);
      setCashboxId((current) => current || cashboxRows[0]?._id || '');
    } catch (err: any) {
      error(err.message || t('expense.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const resetForm = () => {
    setCategory('cleaning');
    setDescription('');
    setAmountQar('');
    setSpentAt(getQatarToday());
    setNotes('');
    setReceipt(null);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = qarToFils(amountQar);
    if (!cashboxId) {
      error(t('treasury.noAccounts'));
      return;
    }
    if (amount < 1) {
      error(t('expense.invalidAmount'));
      return;
    }

    setSubmitting(true);
    try {
      await expenseApi.createExpense({
        cashboxId,
        category,
        description: description.trim(),
        amount,
        spentAt: new Date(`${spentAt}T12:00:00+03:00`).toISOString(),
        notes: notes.trim() || null,
        receipt: receipt || undefined,
      });
      success(t('expense.created'));
      setIsCreateOpen(false);
      resetForm();
      await loadExpenses();
    } catch (err: any) {
      error(err.message || t('expense.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error(t('expense.invalidImage'));
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      error(t('expense.imageTooLarge'));
      return;
    }
    try {
      setReceipt(await readReceipt(file));
    } catch (err: any) {
      error(err.message || t('expense.invalidImage'));
    }
  };

  const showReceipt = async (expense: Expense) => {
    setReceiptTarget(expense);
    setLoadingReceipt(true);
    setReceiptPreview(null);
    try {
      setReceiptPreview(await expenseApi.getReceipt(expense._id));
    } catch (err: any) {
      error(err.message || t('expense.receiptError'));
      setReceiptTarget(null);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('nav.expenses')}</h2>
          <p className="text-xs text-slate-500 mt-1">{t('expense.description')}</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t('expense.new')}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-xs">
        <div className="p-3 rounded-xl bg-rose-50 text-rose-600"><WalletCards className="w-5 h-5" /></div>
        <div>
          <p className="text-xs font-semibold text-slate-500">{t('expense.total')}</p>
          <p className="text-xl font-extrabold text-slate-900">{loading ? '...' : formatQAR(totalExpenses)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium">{t('common.loading')}</div>
        ) : expenses.length === 0 ? (
          <EmptyState
            title={t('expense.emptyTitle')}
            description={t('expense.emptyDescription')}
            icon={ReceiptText}
            actionText={t('expense.new')}
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <DataTable
            rows={expenses}
            rowKey={(expense) => expense._id}
            columns={[
              { key: 'voucher', header: t('expense.voucher'), className: 'font-mono font-bold text-indigo-600', render: (expense) => expense.voucherNumber },
              { key: 'date', header: t('expense.date'), className: 'text-slate-500', render: (expense) => formatDate(expense.spentAt) },
              {
                key: 'description',
                header: t('expense.item'),
                render: (expense) => (
                  <>
                    <div className="font-bold text-slate-900">{expense.description}</div>
                    <div className="text-[11px] text-slate-400">{t(`expense.category.${expense.category}`)}</div>
                  </>
                ),
              },
              { key: 'amount', header: t('expense.amount'), className: 'font-extrabold text-slate-900', render: (expense) => formatQAR(expense.amount) },
              {
                key: 'receipt',
                header: t('expense.receipt'),
                className: 'text-center',
                render: (expense) => expense.receiptImageMimeType
                  ? <button onClick={() => showReceipt(expense)} title={t('expense.viewReceipt')} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                  : <span className="text-slate-300">—</span>,
              },
            ]}
          />
        )}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={t('expense.new')} maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('expense.categoryLabel')} *</label>
            <select required value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden">
              {categories.map((item) => <option key={item} value={item}>{t(`expense.category.${item}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('treasury.account')} *</label>
            <select required value={cashboxId} onChange={(event) => setCashboxId(event.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden" disabled={!cashboxes.length}>
              {!cashboxes.length && <option value="">{t('treasury.noAccounts')}</option>}
              {cashboxes.map((cashbox) => <option key={cashbox._id} value={cashbox._id}>{cashbox.name} — {formatQAR(cashbox.balance)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('expense.item')} *</label>
              <input required maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t('expense.itemPlaceholder')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('expense.amount')} (QAR) *</label>
              <input required type="number" min="0.01" step="0.01" value={amountQar} onChange={(event) => setAmountQar(event.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-bold" />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('expense.date')} *</label>
            <input required type="date" value={spentAt} onChange={(event) => setSpentAt(event.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('common.notes')}</label>
            <textarea rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('expense.receipt')} ({t('expense.optional')})</label>
            <label className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{receipt ? t('expense.imageSelected') : t('expense.uploadImage')}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleReceiptChange} className="sr-only" />
            </label>
            <p className="text-[11px] text-slate-400 mt-1">{t('expense.imageLimit')}</p>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting || !cashboxes.length} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50">{submitting ? t('common.loading') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!receiptTarget}
        onClose={() => { setReceiptTarget(null); setReceiptPreview(null); }}
        title={receiptTarget?.voucherNumber || t('expense.receipt')}
        maxWidth="xl"
      >
        {loadingReceipt ? (
          <div className="py-12 text-center text-slate-400">{t('common.loading')}</div>
        ) : receiptPreview ? (
          <img className="max-h-[70vh] mx-auto object-contain" alt={t('expense.receipt')} src={`data:${receiptPreview.mimeType};base64,${receiptPreview.data}`} />
        ) : null}
      </Modal>
    </div>
  );
};
