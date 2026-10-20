import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  format,
  subDays,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
} from 'date-fns';
import {
  Settings,
  PlusCircle,
  Edit2,
  Trash2,
  Save,
  X,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Download,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { FaUtensils, FaShoppingCart, FaCar, FaHome, FaGamepad } from 'react-icons/fa';
import { useRouter } from 'next/router';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { supabase } from '../lib/supabase';
import { CSVLink } from 'react-csv';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import VisitorEmailPopup from '../components/VisitorEmailPopup';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */
const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const INPUT =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100';
const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50';
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50';
const BTN_GHOST =
  'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900';

const CATEGORY_OPTIONS = [
  { value: 'food', label: 'Food' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'transport', label: 'Transport' },
  { value: 'housing', label: 'Housing' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'investments', label: 'Investments' },
  { value: 'savings', label: 'Savings' },
  { value: 'other', label: 'Other' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'day', label: 'Last 24 hours' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'last month', label: 'Last month' },
  { value: 'last 2 months', label: 'Last 2 months' },
  { value: 'last 3 months', label: 'Last 3 months' },
  { value: 'last 6 months', label: 'Last 6 months' },
  { value: 'year', label: 'This year' },
  { value: 'custom range', label: 'Custom range' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const formatMoney = (amount) =>
  Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatMoneyShort = (num) => {
  const n = Number(num || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toFixed(0);
};

const getCategoryIcon = (category, size = 18) => {
  const props = { size };
  switch (category) {
    case 'food':
      return <FaUtensils {...props} className="text-slate-500" />;
    case 'shopping':
      return <FaShoppingCart {...props} className="text-slate-500" />;
    case 'transport':
      return <FaCar {...props} className="text-slate-500" />;
    case 'housing':
      return <FaHome {...props} className="text-slate-500" />;
    case 'entertainment':
      return <FaGamepad {...props} className="text-slate-500" />;
    case 'investments':
      return <TrendingUp {...props} className="text-emerald-600" />;
    case 'savings':
      return <DollarSign {...props} className="text-slate-500" />;
    default:
      return <AlertTriangle {...props} className="text-slate-500" />;
  }
};

/* ------------------------------------------------------------------ */
/*  Modals                                                             */
/* ------------------------------------------------------------------ */
function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function HowToUseModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  const tips = [
    'Open settings at the top to set your category limits.',
    'Add expenses using the "Add transaction" button.',
    'Edit or delete transactions at any time.',
    'Use filters and search to find past expenses.',
    'Review your spending trends on the chart.',
    'Download your data as CSV for offline use.',
  ];
  return (
    <ModalShell title="How to use the expense tracker" onClose={onClose}>
      <ol className="space-y-3">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-700">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
              {i + 1}
            </span>
            <span className="pt-0.5">{tip}</span>
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-600">
        Need more help?{' '}
        <a href="mailto:dosnineco@gmail.com" className="font-semibold text-slate-700 hover:underline">
          dosnineco@gmail.com
        </a>
      </p>
    </ModalShell>
  );
}

function AddTransactionModal({ isOpen, onClose, value, onChange, onSave }) {
  if (!isOpen) return null;
  return (
    <ModalShell title="Add transaction" onClose={onClose}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Transaction date
          </span>
          <input
            type="date"
            value={value.transaction_date}
            onChange={(e) => onChange('transaction_date', e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Post date
          </span>
          <input
            type="date"
            value={value.post_date}
            onChange={(e) => onChange('post_date', e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Description
          </span>
          <input
            type="text"
            placeholder="e.g. Groceries at Hi-Lo"
            value={value.description}
            onChange={(e) => onChange('description', e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Amount
          </span>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={value.amount}
            onChange={(e) => onChange('amount', e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Category
          </span>
          <select
            value={value.category}
            onChange={(e) => onChange('category', e.target.value)}
            className={INPUT}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onClose} className={`flex-1 ${BTN_SECONDARY}`}>
          Cancel
        </button>
        <button type="button" onClick={onSave} className={`flex-1 ${BTN_PRIMARY}`}>
          <Save size={15} /> Save
        </button>
      </div>
    </ModalShell>
  );
}

function CategoryPopup({ category, transactions, onClose }) {
  if (!category) return null;
  return (
    <ModalShell title={`Transactions · ${category}`} onClose={onClose}>
      {transactions.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{t.description}</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(t.transaction_date), 'MMM d, yyyy')}
                </p>
              </div>
              <span className={`whitespace-nowrap text-sm font-bold ${t.category === 'investments' ? 'text-emerald-600' : t.amount >= 0 ? 'text-red-600' : 'text-slate-700'}`}>
                ${formatMoney(Math.abs(t.amount))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-slate-500">
          No transactions found for this category.
        </p>
      )}
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ExpenseTrackerPage() {
  const router = useRouter();
  const { user } = useUser();

  const [transactions, setTransactions] = useState([]);
  const [monthlySpendingData, setMonthlySpendingData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    post_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    amount: '',
    category: 'other',
  });

  const [monthlySpending, setMonthlySpending] = useState(0);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [categoryLimits, setCategoryLimits] = useState([]);
  const [spendingInsights, setSpendingInsights] = useState([]);

  /* ---------------- effects ---------------- */
  useEffect(() => {
    if (user) fetchMonthlySpendingData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchBudgetAndCategoryLimits().then(() => fetchTransactions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const timeoutId = setTimeout(() => fetchTransactions(), 200);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPeriod, selectedYear, customStartDate, customEndDate, searchTerm, user]);

  /* ---------------- data ---------------- */
  const fetchMonthlySpendingData = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_date, amount, category')
        .eq('user_id', user.id);
      if (error) return;

      if (data && data.length > 0) {
        const byMonth = data.reduce((acc, t) => {
          if (['savings', 'investments'].includes(t.category)) return acc;
          const month = new Date(t.transaction_date).toISOString().slice(0, 7);
          acc[month] = (acc[month] || 0) + parseFloat(t.amount);
          return acc;
        }, {});
        const formatted = Object.entries(byMonth)
          .map(([month, total]) => ({ month, total }))
          .sort((a, b) => new Date(a.month) - new Date(b.month));
        setMonthlySpendingData(formatted);
      } else {
        setMonthlySpendingData([]);
      }
    } catch (err) {
      console.error('monthly spending fetch failed', err);
    }
  };

  const fetchBudgetAndCategoryLimits = async () => {
    if (!user) return;
    try {
      const currentMonth = format(new Date(), 'yyyy-MM-01');
      const [{ data: budgetData, error: budgetError }, { data: limitsData, error: limitsError }] =
        await Promise.all([
          supabase
            .from('monthly_budgets')
            .select('amount')
            .eq('user_id', user.id)
            .lte('month', currentMonth)
            .order('month', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from('category_limits').select('*').eq('user_id', user.id),
        ]);
      if (budgetError) throw budgetError;
      if (limitsError) throw limitsError;
      setMonthlyBudget(Number(budgetData?.amount ?? 0));
      setCategoryLimits(limitsData || []);
    } catch (err) {
      setError(err.message || 'Error fetching budget data');
    }
  };

  const analyzeSpending = useCallback(
    (data) => {
      if (!Array.isArray(data) || data.length === 0) return [];
      const totals = new Map();
      for (const { category, amount } of data) {
        if (category === 'savings') continue;
        totals.set(category, (totals.get(category) || 0) + Math.abs(amount));
      }
      const limitMap = new Map(categoryLimits.map((l) => [l.category, l.limit_amount]));
      const insights = Array.from(totals.entries()).map(([category, total]) => {
        const limit = limitMap.get(category) ?? monthlyBudget * 0.2;
        const isOverBudget = category !== 'investments' && total > limit;
        return {
          category,
          total,
          trend: isOverBudget ? 'up' : 'down',
          recommendation:
            category === 'investments'
              ? 'Investment contribution'
              : isOverBudget
              ? "You've exceeded your budget"
              : 'You are within budget.',
        };
      });
      return insights.sort((a, b) => b.total - a.total);
    },
    [monthlyBudget, categoryLimits]
  );

  const filterTransactions = useCallback(
    (data, includeSearch = true) =>
      data.filter((t) => {
        const matchesSearch =
          includeSearch && searchTerm
            ? t.description.toLowerCase().includes(searchTerm.toLowerCase())
            : true;
        const date = parseISO(t.transaction_date);
        let matchesFilter = true;
        if (filterPeriod === 'day') matchesFilter = date >= subDays(new Date(), 1);
        else if (filterPeriod === 'week')
          matchesFilter = date >= startOfWeek(new Date()) && date <= endOfWeek(new Date());
        else if (filterPeriod === 'month')
          matchesFilter = date >= startOfMonth(new Date()) && date <= endOfMonth(new Date());
        else if (filterPeriod === 'last month') {
          const last = subMonths(new Date(), 1);
          matchesFilter = date >= startOfMonth(last) && date <= endOfMonth(last);
        } else if (['last 2 months', 'last 3 months', 'last 6 months'].includes(filterPeriod)) {
          const n = Number(filterPeriod.split(' ')[1]);
          const end = endOfMonth(subMonths(new Date(), 1));
          const start = startOfMonth(subMonths(new Date(), n));
          matchesFilter = date >= start && date <= end;
        } else if (filterPeriod === 'year') {
          matchesFilter = date.getFullYear() === parseInt(selectedYear, 10);
        } else if (filterPeriod === 'custom range') {
          matchesFilter = date >= new Date(customStartDate) && date <= new Date(customEndDate);
        }
        return matchesSearch && matchesFilter;
      }),
    [searchTerm, filterPeriod, selectedYear, customStartDate, customEndDate]
  );

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });
      if (fetchError) throw fetchError;

      const filtered = filterTransactions(data || []);
      setTransactions(filtered);

      const expenses = filtered.filter(
        (t) => !['savings', 'investments'].includes(t.category)
      );
      setMonthlySpending(expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0));
      setSpendingInsights(analyzeSpending(filtered));
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- mutations ---------------- */
  const addTransaction = async () => {
    if (!user || !newTransaction.description || !newTransaction.amount) return;
    try {
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert([{ user_id: user.id, ...newTransaction, amount: parseFloat(newTransaction.amount) }])
        .select()
        .single();
      if (insertError) throw insertError;
      const updated = [data, ...transactions];
      setTransactions(updated);
      setSpendingInsights(analyzeSpending(updated));
      setShowAddForm(false);
      setNewTransaction({
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        post_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: '',
        category: 'other',
      });
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleSave = async () => {
    if (!editingId || !user) return;
    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update(editData)
        .eq('id', editingId)
        .eq('user_id', user.id);
      if (updateError) throw updateError;
      const updated = transactions.map((t) =>
        t.id === editingId ? { ...t, ...editData } : t
      );
      setTransactions(updated);
      setSpendingInsights(analyzeSpending(updated));
      setEditingId(null);
      setEditData({});
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    if (!window.confirm('Delete this transaction?')) return;
    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (deleteError) throw deleteError;
      const updated = transactions.filter((t) => t.id !== id);
      setTransactions(updated);
      setSpendingInsights(analyzeSpending(updated));
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  /* ---------------- derived ---------------- */
  const graphData = useMemo(() => {
    const grouped = {};
    transactions.forEach((t) => {
      const key = format(
        new Date(t.transaction_date),
        filterPeriod === 'day' ? 'yyyy-MM-dd' : filterPeriod === 'week' ? 'yyyy-ww' : 'yyyy-MM'
      );
      grouped[key] = (grouped[key] || 0) + Math.abs(t.amount);
    });
    return Object.entries(grouped).map(([date, spending]) => ({ date, spending }));
  }, [transactions, filterPeriod]);

  const filteredTransactions = transactions.filter(
    (t) => t.category === selectedCategory
  );
  const investmentTotal = transactions.reduce(
    (total, t) => total + (t.category === 'investments' ? Math.abs(t.amount) : 0),
    0
  );

  const chartData = {
    labels: monthlySpendingData.map((i) => i.month),
    datasets: [
      {
        label: 'Spending',
        data: monthlySpendingData.map((i) => i.total),
        borderColor: '#64748b',
        backgroundColor: 'rgba(100, 116, 139, 0.12)',
        pointBackgroundColor: '#64748b',
        pointBorderColor: '#64748b',
        pointHoverBackgroundColor: '#475569',
        pointHoverBorderColor: '#475569',
        pointRadius: 5,
        pointHoverRadius: 8,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#334155',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#64748b',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: (ctx) => `$${Number(ctx.raw).toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        grid: { color: '#e2e8f0' },
        border: { display: false },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (v) => `$${formatMoneyShort(v)}`,
        },
      },
    },
  };

  const csvHeaders = [
    { label: 'Date', key: 'transaction_date' },
    { label: 'Description', key: 'description' },
    { label: 'Category', key: 'category' },
    { label: 'Amount', key: 'amount' },
  ];

  /* ---------------- table ---------------- */
  const renderRow = (t) => {
    const isEditing = editingId === t.id;

    if (isEditing) {
      return (
        <tr key={t.id} className="bg-slate-50">
          <td className="px-4 py-3">
            <input
              type="date"
              value={editData.transaction_date}
              onChange={(e) => setEditData((p) => ({ ...p, transaction_date: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </td>
          <td className="px-4 py-3">
            <input
              type="text"
              value={editData.description}
              onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </td>
          <td className="px-4 py-3">
            <select
              value={editData.category}
              onChange={(e) => setEditData((p) => ({ ...p, category: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </td>
          <td className="px-4 py-3">
            <input
              type="number"
              step="0.01"
              value={editData.amount}
              onChange={(e) =>
                setEditData((p) => ({ ...p, amount: parseFloat(e.target.value) }))
              }
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </td>
          <td className="px-4 py-3">
            <div className="flex justify-end gap-1.5">
              <button
                onClick={handleSave}
                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
              >
                <Save size={16} />
              </button>
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditData({});
                }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={t.id} className="group transition hover:bg-slate-50">
        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">
          {format(new Date(t.transaction_date), 'MMM d, yyyy')}
        </td>
        <td className="px-4 py-3.5 text-sm text-slate-800">{t.description}</td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            {getCategoryIcon(t.category)}
            <span className="text-xs capitalize text-slate-600">{t.category}</span>
          </div>
        </td>
        <td
          className={`whitespace-nowrap px-4 py-3.5 text-sm font-semibold ${
            t.category === 'investments'
              ? 'text-emerald-600'
              : t.amount >= 0
              ? 'text-red-600'
              : 'text-slate-700'
          }`}
        >
          ${formatMoney(Math.abs(t.amount))}
        </td>
        <td className="whitespace-nowrap px-4 py-3.5">
          <div className="flex justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => {
                setEditingId(t.id);
                setEditData({ ...t });
              }}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDelete(t.id)}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  /* ---------------- loading ---------------- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <AiOutlineLoading3Quarters className="animate-spin text-4xl text-slate-500" />
          <p className="mt-4 text-sm text-slate-600">Loading, please wait…</p>
        </div>
      </div>
    );
  }

  /* ---------------- render ---------------- */
  return (
    <>
      <VisitorEmailPopup />
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Expense Tracker</h1>
              <p className="mt-1 text-sm text-slate-600">
                Understand where your money goes and stay ahead of your budget.
              </p>
            </div>
            <button
              onClick={() => setIsHowToUseOpen(true)}
              className={BTN_GHOST}
              type="button"
            >
              <Info size={15} /> How to use
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">
              {error}
            </div>
          )}

          {/* Action bar */}
          <div className={`${CARD} mb-5 flex flex-wrap items-center gap-2 p-3`}>
            <button type="button" onClick={() => setShowAddForm(true)} className={BTN_PRIMARY}>
              <PlusCircle size={16} /> Add transaction
            </button>

            <button type="button" onClick={() => router.push('/quick')} className={BTN_SECONDARY}>
              <Settings size={16} /> Presets
            </button>
            <button type="button" onClick={() => router.push('/settings')} className={BTN_SECONDARY}>
              <Settings size={16} /> Settings
            </button>

            <CSVLink
              data={transactions}
              headers={csvHeaders}
              filename={`expense-tracker-${filterPeriod}.csv`}
              className={BTN_SECONDARY}
            >
              <Download size={16} /> Download
            </CSVLink>

            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowFilterDropdown((v) => !v)}
                className={BTN_SECONDARY}
              >
                <Filter size={16} />
                {FILTER_OPTIONS.find((o) => o.value === filterPeriod)?.label || 'Filter'}
              </button>
              {showFilterDropdown && (
                <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <ul className="py-1">
                    {FILTER_OPTIONS.map((o) => (
                      <li key={o.value}>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterPeriod(o.value);
                            setShowFilterDropdown(false);
                          }}
                          className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-slate-100 ${
                            filterPeriod === o.value
                              ? 'font-semibold text-slate-900'
                              : 'text-slate-700'
                          }`}
                        >
                          {o.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button type="button" onClick={fetchTransactions} className={BTN_SECONDARY}>
              <RefreshCw size={15} /> Apply
            </button>
          </div>

          {/* Search + custom range */}
          <div className={`${CARD} mb-5 p-4`}>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search transactions…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${INPUT} pl-10`}
              />
            </div>
            {(filterPeriod === 'custom range' || filterPeriod === 'year') && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filterPeriod === 'custom range' && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Start date
                      </span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className={INPUT}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                        End date
                      </span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className={INPUT}
                      />
                    </label>
                  </>
                )}
                {filterPeriod === 'year' && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Year
                    </span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className={INPUT}
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(
                        (year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Chart */}
          <div className={`${CARD} mb-5 p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Spending over time</h2>
              <span className="text-xs text-slate-500">
                {monthlySpendingData.length} month{monthlySpendingData.length === 1 ? '' : 's'}
              </span>
            </div>
            {monthlySpendingData.length > 0 ? (
              <div className="h-72 lg:h-80">
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500 lg:h-80">
                No spending data yet.
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-800 p-3 shadow-sm sm:p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700">
                  <DollarSign size={16} className="text-slate-200" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {filterPeriod === 'month'
                    ? 'Total spent'
                    : `Spending · ${FILTER_OPTIONS.find((option) => option.value === filterPeriod)?.label || 'filtered period'}`}
                </p>
              </div>
              <p className="mt-5 text-lg font-bold text-white sm:text-3xl">
                ${formatMoney(monthlySpending)}
              </p>
            </div>

            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm sm:p-5">
              <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <TrendingUp size={16} className="text-emerald-700" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Total invested
                </p>
              </div>
              <p className="mt-5 text-lg font-bold text-emerald-800 sm:text-3xl">
                ${formatMoney(investmentTotal)}
              </p>
            </div>

          </div>

          {/* Insights */}
          {spendingInsights.length > 0 && (
            <div className="mb-5">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Category insights</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {spendingInsights.map((i) => {
                  const over = i.trend === 'up';
                  return (
                    <button
                      key={i.category}
                      type="button"
                      onClick={() => setSelectedCategory(i.category)}
                      className={`${CARD} group relative flex flex-col items-start gap-2 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                            {getCategoryIcon(i.category, 15)}
                          </span>
                          <span className="text-sm font-semibold capitalize text-slate-800">
                            {i.category}
                          </span>
                        </div>
                        {over ? (
                            <ArrowUpRight size={16} className="text-slate-500" />
                        ) : (
                            <ArrowDownRight size={16} className={i.category === 'investments' ? 'text-emerald-600' : 'text-slate-500'} />
                        )}
                      </div>
                      <p className="text-xl font-bold text-slate-900">${formatMoney(i.total)}</p>
                      <p
                        className={`text-[11px] font-medium ${
                          over ? 'text-slate-600' : i.category === 'investments' ? 'text-emerald-600' : 'text-slate-600'
                        }`}
                      >
                        {i.recommendation}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table */}
          <div className={`${CARD} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
              <span className="text-xs text-slate-500">
                {transactions.length} entr{transactions.length === 1 ? 'y' : 'ies'}
              </span>
            </div>

            {/* Desktop */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">{transactions.map(renderRow)}</tbody>
              </table>
              {transactions.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-500">
                    No transactions for this period yet.
                  </p>
                </div>
              )}
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {transactions.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-500">No transactions for this period yet.</p>
                </div>
              )}
              {transactions.map((t) => {
                const isEditing = editingId === t.id;
                if (isEditing) {
                  return (
                    <div key={t.id} className="space-y-3 bg-slate-50 p-4">
                      <input
                        type="date"
                        value={editData.transaction_date}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, transaction_date: e.target.value }))
                        }
                        className={INPUT}
                      />
                      <input
                        type="text"
                        value={editData.description}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, description: e.target.value }))
                        }
                        className={INPUT}
                      />
                      <select
                        value={editData.category}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, category: e.target.value }))
                        }
                        className={INPUT}
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={editData.amount}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, amount: parseFloat(e.target.value) }))
                        }
                        className={INPUT}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className={`flex-1 ${BTN_PRIMARY}`}
                        >
                          <Save size={15} /> Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditData({});
                          }}
                          className={`flex-1 ${BTN_SECONDARY}`}
                        >
                          <X size={15} /> Cancel
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={t.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{t.description}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {format(new Date(t.transaction_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          t.category === 'investments'
                            ? 'text-emerald-600'
                            : t.amount >= 0
                            ? 'text-red-600'
                            : 'text-slate-700'
                        }`}
                      >
                        ${formatMoney(Math.abs(t.amount))}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(t.category, 14)}
                        <span className="text-xs capitalize text-slate-600">{t.category}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingId(t.id);
                            setEditData({ ...t });
                          }}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <HowToUseModal isOpen={isHowToUseOpen} onClose={() => setIsHowToUseOpen(false)} />

      <AddTransactionModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        value={newTransaction}
        onChange={(field, value) =>
          setNewTransaction((prev) => ({ ...prev, [field]: value }))
        }
        onSave={addTransaction}
      />

      <CategoryPopup
        category={selectedCategory}
        transactions={filteredTransactions}
        onClose={() => setSelectedCategory(null)}
      />
    </>
  );
}