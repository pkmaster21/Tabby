import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import type {
  Member,
  Expense,
  Settlement,
  BalancesResponse,
  ActivityLogEntry,
  UpdateExpenseRequest,
} from '@tabby/shared';
import { api, ApiError } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { Avatar } from '../components/Avatar.js';
import { AddExpenseModal } from '../components/AddExpenseModal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { TabbyLogo } from '../components/TabbyLogo.js';
import { DesktopRail } from '../components/DesktopRail.js';
import { appPageStyle } from '../components/CatBackground.js';

type DashboardTab = 'activity' | 'expenses' | 'who-owes-who';

function fmt(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Math.abs(cents) / 100,
  );
}

function fmtExpenseDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h4m4-12H7a2 2 0 00-2 2v14l3-3 2 2 2-2 2 2 2-2 3 3V5a2 2 0 00-2-2z" />
    </svg>
  );
}

// ─── Offline banner ───────────────────────────────────────────────────────────

function CloudOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l20 20M5.8 8.5A7 7 0 0119 12.5a4 4 0 011 7.4M9.8 4.5A7 7 0 0119 9" />
      <path d="M16 16H7a4 4 0 01-1.5-7.7" />
    </svg>
  );
}

function OfflineBanner({ lastSynced }: { lastSynced: string }) {
  return (
    <div className="bg-amber-50 ring-1 ring-amber-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
        <CloudOffIcon />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-amber-900 leading-tight">You&apos;re offline</p>
        <p className="text-[11px] text-amber-700/90 leading-tight mt-0.5">
          Last synced {lastSynced}. Changes are queued.
        </p>
      </div>
    </div>
  );
}

// ─── Undo toast ───────────────────────────────────────────────────────────────

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  return (
    <div className="fixed bottom-24 left-4 right-4 z-30 flex justify-center lg:left-auto lg:right-6 lg:bottom-6 lg:max-w-sm lg:w-full">
      <div className="bg-stone-900 text-white rounded-2xl shadow-toast pl-4 pr-1.5 py-1.5 flex items-center gap-3 w-full" style={{ minWidth: 280 }}>
        <span className="text-[13px] font-medium flex-1 min-w-0 truncate">{message}</span>
        <button
          onClick={onUndo}
          className="shrink-0 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl px-3.5 py-2 text-[12.5px] transition-colors"
        >
          Undo
        </button>
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 mr-1 shrink-0"
          aria-label="Dismiss"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Hero status card ─────────────────────────────────────────────────────────

interface HeroStatusCardProps {
  settlements: Settlement[];
  currentMemberId: string;
  memberNames: Map<string, string>;
  onPrimary: () => void;
}

function HeroStatusCard({ settlements, currentMemberId, memberNames, onPrimary }: HeroStatusCardProps) {
  const credit = settlements
    .filter((s) => s.to === currentMemberId)
    .reduce((sum, s) => sum + s.amountCents, 0);
  const debit = settlements
    .filter((s) => s.from === currentMemberId)
    .reduce((sum, s) => sum + s.amountCents, 0);
  const net = credit - debit;

  if (net === 0) {
    return (
      <section className="rounded-3xl p-5 bg-white ring-1 ring-black/[0.06] lg:flex lg:items-center lg:gap-5 lg:p-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 hidden lg:flex items-center justify-center text-emerald-500 text-2xl shrink-0">
          ✓
        </div>
        <div className="flex-1">
          <p className="tabby-eyebrow text-emerald-700">All settled</p>
          <p className="text-2xl font-extrabold text-stone-900 tracking-tight mt-2 leading-tight lg:mt-0.5 lg:text-[20px]">
            You&apos;re square with everyone
          </p>
          <p className="text-sm text-stone-500 mt-1 lg:hidden">
            Nobody owes anybody anything. Add the next expense whenever.
          </p>
        </div>
      </section>
    );
  }

  const owed = net > 0;
  const chips = settlements.filter((s) =>
    owed ? s.to === currentMemberId : s.from === currentMemberId,
  );

  return (
    <section
      className={`rounded-3xl p-5 ring-1 lg:flex lg:items-center lg:gap-6 lg:p-6 ${
        owed
          ? 'bg-gradient-to-br from-orange-50 to-amber-50/40 ring-orange-200/60 lg:bg-gradient-to-r lg:from-orange-50 lg:via-amber-50 lg:to-orange-50/50'
          : 'bg-gradient-to-br from-rose-50 to-pink-50/40 ring-rose-200/60 lg:bg-gradient-to-r lg:from-rose-50 lg:via-pink-50 lg:to-rose-50/50'
      }`}
    >
      <div className="lg:shrink-0">
        <p className={`tabby-eyebrow ${owed ? 'text-orange-700' : 'text-rose-700'}`}>
          {owed ? "You're owed" : 'You owe'}
        </p>
        <p className="text-xxl-display font-extrabold text-stone-900 mt-1.5 tabular-nums leading-none">
          {fmt(net)}
        </p>
      </div>

      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 flex-wrap flex-1 lg:mt-0">
          {chips.map((s) => {
            const otherId = owed ? s.from : s.to;
            const name = memberNames.get(otherId) ?? 'Unknown';
            return (
              <div
                key={`${s.from}-${s.to}`}
                className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full pl-1 pr-2.5 py-1"
              >
                <Avatar name={name} size={20} />
                <span className="text-xs font-semibold text-stone-700 tabular-nums">
                  {fmt(s.amountCents)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={onPrimary}
        className={`mt-4 w-full font-semibold py-3 rounded-xl text-sm transition-colors lg:mt-0 lg:w-auto lg:shrink-0 lg:px-5 ${
          owed
            ? 'bg-primary hover:bg-primary-hover text-white'
            : 'bg-stone-900 hover:bg-stone-800 text-white'
        }`}
      >
        {owed ? 'Send a friendly reminder' : 'Settle up'}
      </button>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const isOnline = useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
  );
  const queryClient = useQueryClient();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('activity');
  const [undoToast, setUndoToast] = useState<{ id: string; label: string } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(() => new Date());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOnline) setLastSyncedAt(new Date());
  }, [isOnline]);

  const showUndoToast = (id: string, label: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setUndoToast({ id, label });
    toastTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
  };

  const dismissToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setUndoToast(null);
  };

  const lastSyncedLabel = (() => {
    const diff = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
    if (diff < 60) return 'just now';
    const mins = Math.floor(diff / 60);
    return `${mins}m ago`;
  })();

  const sharedQueryOptions = {
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
  };

  const membersQuery = useQuery({
    queryKey: queryKeys.members(id!),
    queryFn: () => api.getMembers(id!),
    ...sharedQueryOptions,
  });

  const expensesQuery = useQuery({
    queryKey: queryKeys.expenses(id!),
    queryFn: () => api.getExpenses(id!),
    ...sharedQueryOptions,
  });

  const balancesQuery = useQuery({
    queryKey: queryKeys.balances(id!),
    queryFn: () => api.getBalances(id!),
    ...sharedQueryOptions,
  });

  const activityQuery = useQuery({
    queryKey: queryKeys.activity(id!),
    queryFn: () => api.getActivity(id!),
    ...sharedQueryOptions,
  });

  const currentMemberQuery = useQuery({
    queryKey: queryKeys.currentMember(id!),
    queryFn: () => api.getCurrentMember(id!),
  });

  const groupQuery = useQuery({
    queryKey: queryKeys.group(id!),
    queryFn: () => api.getGroup(id!),
  });

  const members: Member[] = membersQuery.data ?? [];
  const expenses: Expense[] = expensesQuery.data ?? [];
  const balances: BalancesResponse | null = balancesQuery.data ?? null;
  const activity: ActivityLogEntry[] = activityQuery.data ?? [];
  const currentMember: Member | null = currentMemberQuery.data ?? null;
  const groupName = groupQuery.data?.name ?? '';

  const memberNames = new Map<string, string>(members.map((m) => [m.id, m.displayName]));
  if (balances) {
    for (const b of balances.balances) {
      if (!memberNames.has(b.memberId)) memberNames.set(b.memberId, b.displayName);
    }
  }

  const anyError = membersQuery.error ?? expensesQuery.error ?? balancesQuery.error;
  const isExpired = !!anyError && (anyError as ApiError)?.status === 410;
  const sessionError = !!anyError && (anyError as ApiError)?.status === 401;
  const isLoading = membersQuery.isLoading;

  const addExpenseMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.createExpense>[1]) => api.createExpense(id!, data),
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(id!) });
      showUndoToast(expense.id, `${expense.description} · $${Number(expense.amount).toFixed(2)} added`);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => api.deleteExpense(id!, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(id!) });
    },
  });

  const settleMutation = useMutation({
    mutationFn: (s: Settlement) =>
      api.settleSettlement(id!, { from: s.from, to: s.to, amountCents: s.amountCents }),
    onMutate: async (settlement) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.balances(id!) });
      const previous = queryClient.getQueryData<BalancesResponse>(queryKeys.balances(id!));
      queryClient.setQueryData<BalancesResponse>(queryKeys.balances(id!), (old) => {
        if (!old) return old;
        return {
          ...old,
          settlements: old.settlements.filter(
            (s) => !(s.from === settlement.from && s.to === settlement.to),
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.balances(id!), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id!) });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ expenseId, data }: { expenseId: string; data: UpdateExpenseRequest }) =>
      api.updateExpense(id!, expenseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(id!) });
    },
  });

  const handleDeleteExpense = () => {
    if (!pendingDeleteId) return;
    deleteExpenseMutation.mutate(pendingDeleteId, {
      onSuccess: () => setPendingDeleteId(null),
    });
  };

  const canAddExpense = isOnline && !isExpired && !!currentMember;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabs: { key: DashboardTab; label: string }[] = [
    { key: 'activity', label: 'Activity' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'who-owes-who', label: 'Who owes who' },
  ];

  return (
    <div className="min-h-screen lg:flex lg:h-screen lg:overflow-hidden" style={appPageStyle}>
      <DesktopRail activeGroupId={id} />

      {/* Middle column */}
      <div className="flex-1 min-w-0 lg:flex lg:flex-col lg:overflow-hidden">

      {/* Header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10 lg:static">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between lg:max-w-none lg:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link to="/" className="shrink-0 hover:opacity-80 transition-opacity lg:hidden">
              <TabbyLogo size={22} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-stone-900 leading-tight truncate lg:text-[18px] lg:font-bold lg:tracking-tight">
                {groupName}
              </h1>
              {!isOnline ? (
                <p className="text-[11px] text-amber-600 leading-tight mt-0.5 flex items-center gap-1 font-medium">
                  <CloudOffIcon /> Offline · synced {lastSyncedLabel}
                </p>
              ) : (
                <p className="text-[11px] text-stone-400 leading-tight mt-0.5">
                  {members.length} member{members.length !== 1 ? 's' : ''} · {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop: member avatar stack */}
            <div className="hidden lg:flex items-center -space-x-2 mr-1">
              {members.slice(0, 4).map((m) => (
                <div key={m.id} className="ring-2 ring-white rounded-full">
                  <Avatar name={m.displayName} size={26} />
                </div>
              ))}
              {members.length > 4 && (
                <div className="w-[26px] h-[26px] rounded-full bg-stone-200 ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-stone-600">
                  +{members.length - 4}
                </div>
              )}
            </div>
            {/* Desktop: New expense button */}
            {canAddExpense && (
              <button
                onClick={() => setShowAddExpense(true)}
                className="hidden lg:flex bg-primary hover:bg-primary-hover text-white rounded-lg pl-3 pr-4 py-2 items-center gap-1.5 font-semibold text-[13px] transition-colors"
              >
                <PlusIcon />
                New expense
              </button>
            )}
            <Link to={`/groups/${id}/settings`} className="shrink-0">
              <button
                className="w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 transition-colors"
                aria-label="Settings"
              >
                <GearIcon />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="px-4 pt-3 lg:px-6 lg:pt-4">
          <OfflineBanner lastSynced={lastSyncedLabel} />
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 pt-4 pb-28 space-y-4 lg:max-w-none lg:flex-1 lg:overflow-y-auto lg:px-6 lg:pt-5 lg:pb-6">
        {sessionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            Session expired. Open the group link again to rejoin.
          </div>
        )}
        {isExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            This group has expired (90 days of inactivity). Balances are read-only.
          </div>
        )}

        {/* Hero */}
        {currentMember && balances && (
          <HeroStatusCard
            settlements={balances.settlements}
            currentMemberId={currentMember.id}
            memberNames={memberNames}
            onPrimary={() => {/* settle/remind flow — step 3 */}}
          />
        )}

        {/* Tabs — "Who owes who" hidden at lg: (shown in right rail) */}
        <div className="pill-tab-track">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 px-2 py-1.5 text-[12.5px] font-semibold transition-colors rounded-lg ${
                activeTab === key ? 'pill-tab-active' : 'text-stone-500'
              } ${key === 'who-owes-who' ? 'lg:hidden' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Activity tab */}
        {activeTab === 'activity' && (
          <section className="space-y-2">
            {activity.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-12">No activity yet.</p>
            ) : (
              activity.map((entry) => (
                <div key={entry.id} className="tabby-card p-3.5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-400 shrink-0">
                    <ReceiptIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-900 leading-snug">{entry.message}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{timeAgo(entry.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {/* Expenses tab */}
        {activeTab === 'expenses' && (
          <section className="space-y-2">
            {expenses.length === 0 && (
              <p className="text-sm text-stone-400 text-center py-12">
                No expenses yet. Tap + to add the first one.
              </p>
            )}
            {expenses.map((exp) => {
              const payerName = memberNames.get(exp.paidBy) ?? 'Unknown';
              const isMe = exp.paidBy === currentMember?.id;
              const canEdit =
                currentMember &&
                (exp.paidBy === currentMember.id || currentMember.role === 'owner');
              return (
                <div key={exp.id} className="tabby-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-400 shrink-0">
                    <ReceiptIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {exp.description}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {isMe ? 'You' : payerName} paid · {fmtExpenseDate(exp.createdAt)} · split {exp.splits.length} ways
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[15px] font-bold text-stone-900 tabular-nums">
                      ${Number(exp.amount).toFixed(2)}
                    </span>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => setEditingExpense(exp)}
                          className="p-1.5 text-stone-300 hover:text-primary transition-colors rounded-lg"
                          aria-label="Edit expense"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setPendingDeleteId(exp.id)}
                          disabled={deleteExpenseMutation.isPending}
                          className="p-1.5 text-stone-300 hover:text-red-400 transition-colors rounded-lg disabled:opacity-50"
                          aria-label="Delete expense"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Who owes who tab */}
        {activeTab === 'who-owes-who' && (
          <section className="space-y-2">
            {!balances || balances.settlements.length === 0 ? (
              <div className="tabby-card p-10 text-center">
                <p className="text-4xl leading-none">🎉</p>
                <p className="text-base font-bold text-stone-900 mt-3">All settled up</p>
                <p className="text-sm text-stone-500 mt-1">Nobody owes anyone anything.</p>
              </div>
            ) : (
              <>
                <p className="tabby-eyebrow text-stone-500 mb-1 px-1">
                  {balances.settlements.length} payment{balances.settlements.length === 1 ? '' : 's'} clears all debts
                </p>
                {balances.settlements.map((s) => {
                  const fromName = memberNames.get(s.from) ?? 'Unknown';
                  const toName = memberNames.get(s.to) ?? 'Unknown';
                  return (
                    <div key={`${s.from}-${s.to}`} className="tabby-card p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={fromName} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-stone-900 leading-tight">
                            <span className="font-semibold">{fromName}</span>
                            <span className="text-stone-500"> pays </span>
                            <span className="font-semibold">{toName}</span>
                          </p>
                          <p className="text-lg font-extrabold text-stone-900 mt-0.5 tabular-nums leading-tight">
                            ${(s.amountCents / 100).toFixed(2)}
                          </p>
                        </div>
                        <Avatar name={toName} size={36} />
                      </div>
                      <button
                        onClick={() => settleMutation.mutate(s)}
                        disabled={settleMutation.isPending}
                        className="mt-3 w-full text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Mark as settled
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </section>
        )}
      </main>

      {undoToast && (
        <UndoToast
          message={undoToast.label}
          onUndo={() => {
            dismissToast();
            deleteExpenseMutation.mutate(undoToast.id);
          }}
          onDismiss={dismissToast}
        />
      )}

      {/* FAB — mobile only */}
      {canAddExpense && (
        <button
          onClick={() => setShowAddExpense(true)}
          className="lg:hidden fixed bottom-7 right-4 z-20 bg-primary hover:bg-primary-hover text-white rounded-full pl-4 pr-5 py-3.5 flex items-center gap-2 font-semibold text-sm transition-colors shadow-fab"
          aria-label="Add expense"
        >
          <PlusIcon />
          Add expense
        </button>
      )}

      <ConfirmDialog
        open={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleDeleteExpense}
        title="Delete expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteExpenseMutation.isPending}
      />

      {currentMember && (
        <>
          <AddExpenseModal
            key={String(showAddExpense)}
            open={showAddExpense}
            onClose={() => setShowAddExpense(false)}
            members={members}
            currentMemberId={currentMember.id}
            onSave={async (data) => {
              await addExpenseMutation.mutateAsync(data);
            }}
          />
          <AddExpenseModal
            key={editingExpense?.id ?? 'edit-closed'}
            open={!!editingExpense}
            onClose={() => setEditingExpense(null)}
            members={members}
            currentMemberId={currentMember.id}
            initialExpense={editingExpense ?? undefined}
            onSave={async (data) => {
              await updateExpenseMutation.mutateAsync({ expenseId: editingExpense!.id, data });
              setEditingExpense(null);
            }}
          />
        </>
      )}
      </div>{/* end middle column */}

      {/* Right rail — desktop only: persistent "Who owes who" */}
      <aside className="hidden lg:flex w-[300px] border-l border-stone-100 bg-white flex-col shrink-0">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="text-[14px] font-bold text-stone-900">Who owes who</h2>
          {balances && (
            <p className="text-[11px] text-stone-400 mt-0.5">
              {balances.settlements.length} payment{balances.settlements.length === 1 ? '' : 's'} clears all debts
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!balances || balances.settlements.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[28px]">🎉</div>
              <p className="text-[13px] font-bold text-stone-900 mt-2">All settled up</p>
              <p className="text-[11px] text-stone-500 mt-1">Nobody owes anyone anything.</p>
            </div>
          ) : (
            balances.settlements.map((s) => {
              const fromName = memberNames.get(s.from) ?? 'Unknown';
              const toName = memberNames.get(s.to) ?? 'Unknown';
              return (
                <div key={`${s.from}-${s.to}`} className="bg-stone-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={fromName} size={26} />
                    <span className="text-[12px] text-stone-400">→</span>
                    <Avatar name={toName} size={26} />
                    <span className="ml-auto text-[14px] font-extrabold text-stone-900 tabular-nums">
                      ${(s.amountCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-stone-600 leading-tight">
                    <span className="font-semibold">
                      {s.from === currentMember?.id ? 'You' : fromName.split(' ')[0]}
                    </span>
                    <span className="text-stone-400">
                      {' '}pay{s.from === currentMember?.id ? '' : 's'}{' '}
                    </span>
                    <span className="font-semibold">
                      {s.to === currentMember?.id ? 'you' : toName.split(' ')[0]}
                    </span>
                  </p>
                  <button
                    onClick={() => settleMutation.mutate(s)}
                    disabled={settleMutation.isPending}
                    className="mt-2 w-full text-[11.5px] font-semibold text-stone-700 bg-white hover:bg-stone-100 ring-1 ring-stone-200 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Mark settled
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
