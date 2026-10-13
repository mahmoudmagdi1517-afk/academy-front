import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Landmark, Plus, WalletCards } from 'lucide-react';
import { treasuryApi } from '../api/treasury.api';
import { Cashbox, TreasurySummary } from '../types/treasury';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { DataTable } from '../components/common/DataTable';
import { StatCard } from '../components/common/StatCard';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { formatQAR, qarToFils } from '../utils/currency';
import { formatDateTime } from '../utils/date';

export const TreasuryPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<Cashbox['type']>('cash');
  const [openingBalance, setOpeningBalance] = useState('0');

  const loadSummary = async () => {
    setLoading(true);
    try {
      setSummary(await treasuryApi.getSummary());
    } catch (err: any) {
      error(err.message || t('treasury.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const openingBalanceFils = qarToFils(openingBalance);
    if (openingBalanceFils < 0) {
      error(t('treasury.invalidBalance'));
      return;
    }
    setSubmitting(true);
    try {
      await treasuryApi.createCashbox({ name: name.trim(), type, openingBalance: openingBalanceFils });
      success(t('treasury.created'));
      setCreateOpen(false);
      setName('');
      setType('cash');
      setOpeningBalance('0');
      await loadSummary();
    } catch (err: any) {
      error(err.message || t('treasury.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const transactions = summary?.recentTransactions || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('nav.treasury')}</h2>
          <p className="text-xs text-slate-500 mt-1">{t('treasury.description')}</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t('treasury.addAccount')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard title={t('treasury.totalBalance')} value={loading ? '...' : formatQAR(summary?.totalBalance || 0)} icon={WalletCards} color="indigo" />
        <StatCard title={t('treasury.cash')} value={loading ? '...' : formatQAR(summary?.cashboxes.filter((box) => box.type === 'cash').reduce((sum, box) => sum + box.balance, 0) || 0)} icon={WalletCards} color="emerald" subtitle={t('treasury.accountCount').replace('{count}', String(summary?.cashboxes.filter((box) => box.type === 'cash').length || 0))} />
        <StatCard title={t('treasury.bank')} value={loading ? '...' : formatQAR(summary?.cashboxes.filter((box) => box.type === 'bank').reduce((sum, box) => sum + box.balance, 0) || 0)} icon={Landmark} color="sky" subtitle={t('treasury.accountCount').replace('{count}', String(summary?.cashboxes.filter((box) => box.type === 'bank').length || 0))} />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{t('treasury.accounts')}</h3>
        </div>
        {!loading && !summary?.cashboxes.length ? (
          <EmptyState title={t('treasury.noAccounts')} description={t('treasury.noAccountsHint')} icon={WalletCards} actionText={t('treasury.addAccount')} onAction={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
            {summary?.cashboxes.map((cashbox) => (
              <div key={cashbox._id} className="rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${cashbox.type === 'cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'}`}>
                  {cashbox.type === 'cash' ? <WalletCards className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{cashbox.name}</p>
                  <p className="text-[11px] text-slate-400">{t(`treasury.type.${cashbox.type}`)}</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-1">{formatQAR(cashbox.balance)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{t('treasury.recentMovements')}</h3>
        </div>
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">{t('common.loading')}</div>
        ) : transactions.length === 0 ? (
          <EmptyState title={t('treasury.noMovements')} description={t('treasury.noMovementsHint')} icon={ArrowDownLeft} />
        ) : (
          <DataTable
            rows={transactions}
            rowKey={(transaction) => transaction._id}
            columns={[
              { key: 'date', header: t('treasury.date'), render: (transaction) => formatDateTime(transaction.occurredAt) },
              { key: 'account', header: t('treasury.account'), render: (transaction) => typeof transaction.cashboxId === 'string' ? '—' : transaction.cashboxId.name },
              { key: 'description', header: t('treasury.description'), render: (transaction) => <><div className="font-bold text-slate-800">{transaction.description}</div><div className="text-[11px] text-slate-400">{t(`treasury.kind.${transaction.kind}`)}</div></> },
              { key: 'amount', header: t('treasury.amount'), className: 'font-extrabold', render: (transaction) => <span className={transaction.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{transaction.amount >= 0 ? <ArrowDownLeft className="inline w-3.5 h-3.5 me-1" /> : <ArrowUpRight className="inline w-3.5 h-3.5 me-1" />}{formatQAR(Math.abs(transaction.amount))}</span> },
            ]}
          />
        )}
      </section>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={t('treasury.addAccount')} maxWidth="md">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('treasury.accountName')} *</label>
            <input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('treasury.accountType')} *</label>
            <select value={type} onChange={(event) => setType(event.target.value as Cashbox['type'])} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden">
              <option value="cash">{t('treasury.type.cash')}</option>
              <option value="bank">{t('treasury.type.bank')}</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('treasury.openingBalance')} (QAR)</label>
            <input type="number" required min="0" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden font-bold" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50">{submitting ? t('common.loading') : t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
