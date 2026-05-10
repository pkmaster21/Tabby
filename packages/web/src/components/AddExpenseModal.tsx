import { useState, useEffect, useRef } from 'react';
import type { Member, Expense, SplitType, ExactSplitInput, PercentageSplitInput } from '@tabby/shared';
import { Avatar } from './Avatar.js';

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  currentMemberId: string;
  initialExpense?: Expense;
  onSave: (data: {
    description: string;
    amount: number;
    splitType: SplitType;
    memberIds: string[];
    splits?: ExactSplitInput[] | PercentageSplitInput[];
  }) => Promise<void>;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 12 10 18 20 6" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.232 5.232l3.536 3.536M16.732 3.732a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  );
}

// ─── Step header ─────────────────────────────────────────────────────────────

interface StepHeaderProps {
  idx: number;
  label: string;
  summary: string | null;
  expanded: boolean;
  done: boolean;
  disabled: boolean;
  onClick: () => void;
}

function StepHeader({ idx, label, summary, expanded, done, disabled, onClick }: StepHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 text-left disabled:cursor-default"
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors text-xs font-bold ${
          done
            ? 'bg-emerald-500 text-white'
            : expanded
            ? 'bg-primary text-white'
            : 'bg-stone-200 text-stone-500'
        }`}
      >
        {done ? <CheckIcon size={12} /> : idx}
      </div>
      <div className="flex-1 min-w-0">
        <p className="tabby-eyebrow text-stone-500">{label}</p>
        {!expanded && summary && (
          <p className="text-sm font-semibold text-stone-900 mt-1 truncate">{summary}</p>
        )}
      </div>
      {!expanded && summary && (
        <span className="text-stone-400 shrink-0">
          <PencilIcon />
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AddExpenseModal({
  open,
  onClose,
  members,
  currentMemberId,
  initialExpense,
  onSave,
}: AddExpenseModalProps) {
  const isEditing = !!initialExpense;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState(initialExpense ? String(Number(initialExpense.amount)) : '');
  const [description, setDescription] = useState(initialExpense?.description ?? '');
  const [paidBy, setPaidBy] = useState(initialExpense?.paidBy ?? currentMemberId);
  const [splitType, setSplitType] = useState<SplitType>(initialExpense?.splitType ?? 'equal');
  const [included, setIncluded] = useState<string[]>(
    initialExpense ? initialExpense.splits.map((s) => s.memberId) : members.map((m) => m.id),
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(
    initialExpense?.splitType === 'exact'
      ? Object.fromEntries(initialExpense.splits.map((s) => [s.memberId, String(Number(s.amount))]))
      : {},
  );
  const [percentages, setPercentages] = useState<Record<string, string>>(
    initialExpense?.splitType === 'percentage'
      ? Object.fromEntries(
          initialExpense.splits.map((s) => {
            const pct = (Number(s.amount) / Number(initialExpense.amount)) * 100;
            return [s.memberId, String(Math.round(pct))];
          }),
        )
      : {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && step === 1) {
      setTimeout(() => amountInputRef.current?.focus(), 50);
    }
  }, [open, step]);

  if (!open) return null;

  // ─ Derived state ─────────────────────────────────────────────────────────

  const amountNum = parseFloat(amount) || 0;
  const amountCents = Math.round(amountNum * 100);

  let assignedCents = 0;
  if (splitType === 'exact') {
    assignedCents = included.reduce(
      (sum, id) => sum + Math.round((parseFloat(exactAmounts[id] ?? '0') || 0) * 100),
      0,
    );
  } else if (splitType === 'percentage') {
    const totalPct = included.reduce((sum, id) => sum + (parseFloat(percentages[id] ?? '0') || 0), 0);
    assignedCents = Math.round((totalPct / 100) * amountCents);
  } else {
    assignedCents = amountCents;
  }
  const remainderCents = amountCents - assignedCents;
  const equalShareCents = included.length > 0 ? Math.floor(amountCents / included.length) : 0;

  const step1Done = amountNum > 0 && description.trim().length > 0;
  const step2Done = step1Done && !!paidBy;
  const splitValid = included.length > 0 && (splitType === 'equal' || remainderCents === 0);
  const canSubmit = step2Done && splitValid;

  const fmtCents = (c: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(c) / 100);

  // ─ Helpers ───────────────────────────────────────────────────────────────

  const toggleMember = (id: string) => {
    setIncluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const applyPreset = (preset: 'all' | 'just-them' | 'just-me') => {
    if (preset === 'all') setIncluded(members.map((m) => m.id));
    else if (preset === 'just-me') setIncluded([currentMemberId]);
    else if (preset === 'just-them')
      setIncluded(members.filter((m) => m.id !== currentMemberId).map((m) => m.id));
  };

  const distributeEvenly = () => {
    if (included.length === 0 || amountNum === 0) return;
    if (splitType === 'exact') {
      const each = (amountNum / included.length).toFixed(2);
      setExactAmounts(Object.fromEntries(included.map((id) => [id, each])));
    } else if (splitType === 'percentage') {
      const each = String(Math.round(100 / included.length));
      setPercentages(Object.fromEntries(included.map((id) => [id, each])));
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError('');

    let splits: ExactSplitInput[] | PercentageSplitInput[] | undefined;
    if (splitType === 'exact') {
      splits = included.map((id) => ({
        memberId: id,
        amount: parseFloat(exactAmounts[id] ?? '0'),
      }));
    } else if (splitType === 'percentage') {
      splits = included.map((id) => ({
        memberId: id,
        percentage: parseFloat(percentages[id] ?? '0'),
      }));
    }

    setLoading(true);
    try {
      await onSave({ description, amount: amountNum, splitType, memberIds: included, splits });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  // ─ Summary lines for collapsed steps ─────────────────────────────────────

  const step1Summary = step1Done ? `${fmtCents(amountCents)} · ${description}` : null;
  const paidByName = members.find((m) => m.id === paidBy)?.displayName ?? '';
  const step2Summary = paidBy
    ? paidBy === currentMemberId
      ? 'You paid'
      : `${paidByName.split(' ')[0]} paid`
    : null;
  const step3Summary =
    included.length > 0
      ? splitType === 'equal'
        ? `Equally between ${included.length}`
        : `${splitType === 'exact' ? 'Custom $' : '%'} · ${included.length} people`
      : null;

  // ─ Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit expense' : 'New expense'}
    >
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full sm:max-w-lg sm:mx-auto bg-white rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
          <h2 className="text-[15px] font-semibold text-stone-900">
            {isEditing ? 'Edit expense' : 'New expense'}
          </h2>
          <div className="w-9" />
        </div>

        {/* Scrollable step cards */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-3">

          {/* Step 1 — Amount */}
          <section className="tabby-card p-4">
            <StepHeader
              idx={1}
              label="Amount"
              summary={step1Summary}
              expanded={step === 1}
              done={step !== 1 && step1Done}
              disabled={false}
              onClick={() => setStep(1)}
            />
            {step === 1 && (
              <div className="mt-4">
                <div className="flex items-baseline justify-center gap-1 py-2">
                  <span className="text-4xl font-bold text-stone-400 tabular-nums select-none">$</span>
                  <input
                    ref={amountInputRef}
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0.00"
                    className="bg-transparent border-0 outline-none text-center font-extrabold text-stone-900 tabular-nums w-[7ch]"
                    style={{ fontSize: 56, lineHeight: 1, letterSpacing: -1 }}
                    aria-label="Amount"
                  />
                </div>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What was it for?"
                  className="w-full text-center text-[15px] text-stone-700 placeholder:text-stone-300 bg-transparent border-0 border-b border-stone-200 focus:border-primary outline-none py-2 transition-colors"
                  maxLength={80}
                  aria-label="Description"
                />
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!step1Done}
                  className="mt-4 w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </section>

          {/* Step 2 — Paid by */}
          <section className={`tabby-card p-4 ${!step1Done ? 'opacity-50 pointer-events-none' : ''}`}>
            <StepHeader
              idx={2}
              label="Paid by"
              summary={step2Summary}
              expanded={step === 2}
              done={step !== 2 && step2Done}
              disabled={!step1Done}
              onClick={() => step1Done && setStep(2)}
            />
            {step === 2 && (
              <div className="mt-4 space-y-1">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaidBy(m.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                      paidBy === m.id ? 'bg-orange-50 ring-1 ring-orange-200' : 'hover:bg-stone-50'
                    }`}
                  >
                    <Avatar name={m.displayName} size={36} />
                    <span className="flex-1 text-left text-sm font-medium text-stone-900">
                      {m.displayName}{' '}
                      {m.id === currentMemberId && (
                        <span className="text-stone-400 font-normal">(you)</span>
                      )}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        paidBy === m.id ? 'bg-primary text-white' : 'ring-1 ring-stone-300'
                      }`}
                    >
                      {paidBy === m.id && <CheckIcon size={11} />}
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="mt-3 w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </section>

          {/* Step 3 — Split */}
          <section className={`tabby-card p-4 ${!step2Done ? 'opacity-50 pointer-events-none' : ''}`}>
            <StepHeader
              idx={3}
              label="Split"
              summary={step3Summary}
              expanded={step === 3}
              done={step !== 3 && splitValid && step2Done}
              disabled={!step2Done}
              onClick={() => step2Done && setStep(3)}
            />
            {step === 3 && (
              <div className="mt-4 space-y-3">
                {/* Split type tabs */}
                <div className="pill-tab-track">
                  {([['equal', 'Equal'], ['exact', 'Custom $'], ['percentage', '%']] as const).map(
                    ([t, label]) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSplitType(t)}
                        className={`flex-1 rounded-lg py-1.5 text-[12.5px] font-semibold transition-colors ${
                          splitType === t ? 'pill-tab-active' : 'text-stone-500'
                        }`}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>

                {/* Quick preset chips */}
                <div className="flex gap-1.5 flex-wrap">
                  {(
                    [
                      ['all', 'Everyone'],
                      ['just-them', 'Just them'],
                      ['just-me', 'Just me'],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => applyPreset(k)}
                      className="text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                  {splitType !== 'equal' && (
                    <button
                      type="button"
                      onClick={distributeEvenly}
                      className="text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      Distribute evenly
                    </button>
                  )}
                </div>

                {/* Member rows */}
                <div className="space-y-1">
                  {members.map((m) => {
                    const on = included.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-3 p-2 rounded-xl ${on ? '' : 'opacity-40'}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleMember(m.id)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                            on ? 'bg-primary text-white' : 'ring-1 ring-stone-300'
                          }`}
                          aria-label={`${on ? 'Remove' : 'Include'} ${m.displayName}`}
                        >
                          {on && <CheckIcon size={11} />}
                        </button>
                        <Avatar name={m.displayName} size={32} />
                        <span className="flex-1 text-sm font-medium text-stone-900 truncate">
                          {m.displayName.split(' ')[0]}
                          {m.id === currentMemberId && (
                            <span className="text-stone-400 font-normal text-xs"> (you)</span>
                          )}
                        </span>
                        {splitType === 'equal' && on && (
                          <span className="text-xs text-stone-500 tabular-nums shrink-0">
                            {fmtCents(equalShareCents)}
                          </span>
                        )}
                        {splitType === 'exact' && on && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={exactAmounts[m.id] ?? ''}
                            onChange={(e) =>
                              setExactAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))
                            }
                            placeholder="0.00"
                            className="w-20 text-right rounded-lg ring-1 ring-stone-200 focus:ring-primary outline-none px-2 py-1 text-sm tabular-nums"
                            aria-label={`Amount for ${m.displayName}`}
                          />
                        )}
                        {splitType === 'percentage' && on && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={percentages[m.id] ?? ''}
                              onChange={(e) =>
                                setPercentages((prev) => ({ ...prev, [m.id]: e.target.value }))
                              }
                              placeholder="0"
                              className="w-14 text-right rounded-lg ring-1 ring-stone-200 focus:ring-primary outline-none px-2 py-1 text-sm tabular-nums"
                              aria-label={`Percentage for ${m.displayName}`}
                            />
                            <span className="text-sm text-stone-500">%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Live remainder pill */}
                {splitType !== 'equal' && (
                  <div
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ring-1 transition-colors ${
                      remainderCents === 0
                        ? 'bg-success-subtle ring-emerald-200'
                        : 'bg-warning-subtle ring-amber-200'
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold ${
                        remainderCents === 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {remainderCents === 0
                        ? 'Splits add up perfectly'
                        : remainderCents > 0
                        ? 'Still to assign'
                        : 'Over by'}
                    </span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        remainderCents === 0 ? 'text-emerald-700' : 'text-amber-800'
                      }`}
                    >
                      {remainderCents === 0 ? (
                        <CheckIcon size={14} />
                      ) : (
                        fmtCents(remainderCents)
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          {error && <p className="text-sm text-red-600 px-1">{error}</p>}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-stone-100 bg-white px-4 pt-3 pb-7">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold py-3.5 rounded-xl text-[15px] transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {canSubmit
              ? `${isEditing ? 'Save' : 'Add'} ${fmtCents(amountCents)} expense`
              : 'Fill all 3 steps'}
          </button>
        </div>
      </div>
    </div>
  );
}
