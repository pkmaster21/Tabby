import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Member, UpdateGroupSettingsRequest } from '@tabby/shared';
import { api, ApiError } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { Avatar } from '../components/Avatar.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { DesktopRail } from '../components/DesktopRail.js';
import { appPageStyle } from '../components/CatBackground.js';

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, hint, children }: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="flex items-baseline justify-between px-1 mb-2">
        <h2 className="tabby-eyebrow text-stone-500">{title}</h2>
        {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
      </div>
      <div className="tabby-card overflow-hidden">{children}</div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [pendingRemoveMemberId, setPendingRemoveMemberId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [desktopTab, setDesktopTab] = useState<'general' | 'members' | 'invites' | 'danger'>('general');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const groupQuery = useQuery({
    queryKey: queryKeys.group(id!),
    queryFn: () => api.getGroup(id!),
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.members(id!),
    queryFn: () => api.getMembers(id!),
  });

  const currentMemberQuery = useQuery({
    queryKey: queryKeys.currentMember(id!),
    queryFn: () => api.getCurrentMember(id!),
  });

  const members: Member[] = membersQuery.data ?? [];
  const currentMember: Member | null = currentMemberQuery.data ?? null;
  const isOwner = currentMember?.role === 'owner';

  useEffect(() => {
    if (groupQuery.data?.name && !nameValue) setNameValue(groupQuery.data.name);
  }, [groupQuery.data?.name, nameValue]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  const inviteCode = groupQuery.data?.inviteCode ?? '';
  const inviteUrl = inviteCode ? `${window.location.origin}/g/${inviteCode}` : '';
  const expiresAt = groupQuery.data?.expiresAt;
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000))
    : null;

  const updateSettingsMutation = useMutation({
    mutationFn: (body: UpdateGroupSettingsRequest) => api.updateGroupSettings(id!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.group(id!) }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.removeMember(id!, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.members(id!) }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.leaveGroup(id!),
    onSuccess: () => navigate('/'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteGroup(id!),
    onSuccess: () => navigate('/'),
  });

  const handleSaveName = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!nameValue.trim()) return;
    setEditingName(false);
    try {
      await updateSettingsMutation.mutateAsync({ name: nameValue.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update name');
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRegenerate = async () => {
    try {
      await updateSettingsMutation.mutateAsync({ regenerateInviteCode: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to regenerate link');
    } finally {
      setShowRegenerateConfirm(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!pendingRemoveMemberId) return;
    try {
      await removeMemberMutation.mutateAsync(pendingRemoveMemberId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove member');
    } finally {
      setPendingRemoveMemberId(null);
    }
  };

  const groupName = groupQuery.data?.name ?? nameValue;

  const desktopTabs = [
    { key: 'general' as const, label: 'General' },
    { key: 'members' as const, label: `Members · ${members.length}` },
    { key: 'invites' as const, label: 'Invite link' },
    { key: 'danger' as const, label: 'Danger zone' },
  ];

  return (
    <div className="min-h-screen lg:flex lg:h-screen lg:overflow-hidden" style={appPageStyle}>
      <DesktopRail activeGroupId={id} />

      {/* Main column */}
      <div className="flex-1 min-w-0 lg:flex lg:flex-col lg:overflow-hidden">

      {/* Mobile header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10 lg:hidden">
        <div className="max-w-2xl mx-auto px-2 py-3 flex items-center gap-1">
          <Link to={`/groups/${id}/settings`}>
            <button className="w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-700 transition-colors" aria-label="Back">
              <BackIcon />
            </button>
          </Link>
          <div className="flex-1 min-w-0 px-1">
            <p className="text-[11px] font-semibold text-stone-400 leading-none">Group settings</p>
            <h1 className="text-[15px] font-bold text-stone-900 leading-tight mt-0.5 truncate">{groupName}</h1>
          </div>
          <Link to={`/groups/${id}`}>
            <button className="text-sm font-semibold text-primary px-3 py-2">Done</button>
          </Link>
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden lg:block bg-white border-b border-stone-100 px-8 py-5 shrink-0">
        <div className="flex items-center gap-2 text-[12.5px] text-stone-400 mb-1.5">
          <Link to={`/groups/${id}`} className="hover:text-stone-600 transition-colors">{groupName}</Link>
          <span>›</span>
          <span className="text-stone-700 font-medium">Settings</span>
        </div>
        <h1 className="text-[22px] font-bold text-stone-900 tracking-tight">Group settings</h1>
      </header>

      {/* Mobile main — all sections stacked */}
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-10 lg:hidden">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Group */}
        <Section title="Group">
          <div className="px-4 py-3.5 border-b border-stone-100">
            <p className="tabby-eyebrow text-stone-400 mb-1.5">Name</p>
            {isOwner && editingName ? (
              <form onSubmit={handleSaveName}>
                <input
                  ref={nameInputRef}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={() => handleSaveName()}
                  className="w-full text-base font-semibold text-stone-900 bg-transparent border-0 border-b-2 border-primary outline-none pb-0.5"
                  maxLength={100}
                  aria-label="Group name"
                />
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-stone-900">{groupName}</span>
                {isOwner && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-xs font-semibold text-primary"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* Members */}
        <Section title="Members" hint={`${members.length} people`}>
          {members.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < members.length - 1 ? 'border-b border-stone-100' : ''
              }`}
            >
              <Avatar name={m.displayName} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-900 truncate leading-tight">
                  {m.displayName}
                  {m.id === currentMember?.id && (
                    <span className="text-stone-400 font-normal text-xs"> (you)</span>
                  )}
                </p>
              </div>
              {m.role === 'owner' && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full shrink-0">
                  Owner
                </span>
              )}
              {isOwner && m.id !== currentMember?.id && m.role !== 'owner' && (
                <button
                  onClick={() => setPendingRemoveMemberId(m.id)}
                  className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 shrink-0"
                  aria-label={`Remove ${m.displayName}`}
                >
                  <DotsIcon />
                </button>
              )}
            </div>
          ))}
        </Section>

        {/* Invite link */}
        <Section title="Invite link">
          <div className="px-4 py-3.5 border-b border-stone-100">
            {inviteUrl ? (
              <>
                <div className="bg-stone-50 ring-1 ring-stone-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <span className="text-stone-400 shrink-0"><ShareIcon /></span>
                  <span className="flex-1 text-xs font-mono text-stone-700 truncate">
                    {inviteUrl.replace(/^https?:\/\//, '')}
                  </span>
                  <button
                    onClick={handleCopy}
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary hover:bg-primary-hover text-white'
                    }`}
                  >
                    {copied ? '✓ Copied' : <><CopyIcon /> Copy</>}
                  </button>
                </div>
                <p className="text-[11.5px] text-stone-500 mt-2 leading-snug">
                  Anyone with the link can join.{daysLeft !== null ? ` Expires in ${daysLeft} days.` : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-stone-400">Loading…</p>
            )}
          </div>
          {isOwner && (
            <button
              onClick={() => setShowRegenerateConfirm(true)}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
            >
              <span className="text-stone-500"><RefreshIcon /></span>
              <span className="text-sm font-medium text-stone-900">Regenerate link</span>
              <span className="ml-auto text-[11.5px] text-stone-400">Old link stops working</span>
            </button>
          )}
        </Section>

        {/* Danger zone */}
        <Section title="Danger zone">
          {!isOwner && (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-rose-50 transition-colors border-b border-stone-100"
            >
              <span className="flex-1 text-sm font-medium text-rose-600">Leave group</span>
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-rose-50 transition-colors"
            >
              <span className="text-rose-500"><TrashIcon /></span>
              <span className="flex-1 text-sm font-medium text-rose-600">Delete group</span>
            </button>
          )}
        </Section>

        <p className="text-center text-[10.5px] text-stone-400 pt-2">
          Group ID {id?.slice(0, 8)}
        </p>
      </main>

      {/* Desktop main — tabbed layout */}
      <div className="hidden lg:flex lg:flex-1 lg:overflow-hidden lg:flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[760px] mx-auto px-8 py-7">

            {/* Desktop tab bar */}
            <div className="flex gap-1 border-b border-stone-200 mb-7">
              {desktopTabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDesktopTab(key)}
                  className={`relative px-4 py-3 text-[13px] font-semibold transition-colors ${
                    desktopTab === key ? 'text-primary' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {label}
                  {desktopTab === key && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* General tab */}
            {desktopTab === 'general' && (
              <Section title="Group">
                <div className="px-4 py-3.5">
                  <p className="tabby-eyebrow text-stone-400 mb-1.5">Name</p>
                  {isOwner ? (
                    <form onSubmit={handleSaveName}>
                      <input
                        ref={nameInputRef}
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onBlur={() => handleSaveName()}
                        className="w-full text-base font-semibold text-stone-900 bg-stone-50 ring-1 ring-stone-200 focus:ring-primary outline-none rounded-lg px-3 py-2.5"
                        maxLength={100}
                        aria-label="Group name"
                      />
                    </form>
                  ) : (
                    <span className="text-base font-semibold text-stone-900">{groupName}</span>
                  )}
                </div>
              </Section>
            )}

            {/* Members tab */}
            {desktopTab === 'members' && (
              <Section title="People in this group" hint={`${members.length} members`}>
                {members.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < members.length - 1 ? 'border-b border-stone-100' : ''
                    }`}
                  >
                    <Avatar name={m.displayName} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate leading-tight">
                        {m.displayName}
                        {m.id === currentMember?.id && (
                          <span className="text-stone-400 font-normal text-xs"> (you)</span>
                        )}
                      </p>
                    </div>
                    {m.role === 'owner' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full shrink-0">
                        Owner
                      </span>
                    )}
                    {isOwner && m.id !== currentMember?.id && m.role !== 'owner' && (
                      <button
                        onClick={() => setPendingRemoveMemberId(m.id)}
                        className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 shrink-0"
                        aria-label={`Remove ${m.displayName}`}
                      >
                        <DotsIcon />
                      </button>
                    )}
                  </div>
                ))}
              </Section>
            )}

            {/* Invite link tab */}
            {desktopTab === 'invites' && (
              <Section title="Invite link">
                <div className="px-5 py-5 border-b border-stone-100">
                  {inviteUrl ? (
                    <>
                      <p className="text-[13px] text-stone-600 mb-3 leading-snug">
                        Anyone with the link can join <span className="font-semibold text-stone-900">{groupName}</span>.
                      </p>
                      <div className="bg-stone-50 ring-1 ring-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
                        <span className="text-stone-400 shrink-0"><ShareIcon /></span>
                        <span className="flex-1 text-[14px] font-mono text-stone-700 truncate">
                          {inviteUrl.replace(/^https?:\/\//, '')}
                        </span>
                        <button
                          onClick={handleCopy}
                          className={`shrink-0 text-[13px] font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                            copied ? 'bg-emerald-500 text-white' : 'bg-primary hover:bg-primary-hover text-white'
                          }`}
                        >
                          {copied ? '✓ Copied' : <><CopyIcon /> Copy link</>}
                        </button>
                      </div>
                      {daysLeft !== null && (
                        <p className="text-[12px] text-stone-500 mt-3 leading-snug">Expires in {daysLeft} days.</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-stone-400">Loading…</p>
                  )}
                </div>
                {isOwner && (
                  <button
                    onClick={() => setShowRegenerateConfirm(true)}
                    className="w-full flex items-center gap-2.5 px-5 py-4 hover:bg-stone-50 text-left transition-colors"
                  >
                    <span className="text-stone-500"><RefreshIcon /></span>
                    <span className="text-[14px] font-medium text-stone-900">Regenerate link</span>
                    <span className="ml-auto text-[12px] text-stone-400">Old link stops working immediately</span>
                  </button>
                )}
              </Section>
            )}

            {/* Danger zone tab */}
            {desktopTab === 'danger' && (
              <div className="bg-rose-50/60 ring-1 ring-rose-200 rounded-2xl overflow-hidden">
                {!isOwner && (
                  <div className="px-5 py-4 border-b border-rose-100 flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-stone-900">Leave group</p>
                      <p className="text-[12px] text-stone-600 mt-1 leading-snug">You&apos;ll be removed from the group. Settle your balances first.</p>
                    </div>
                    <button
                      onClick={() => setShowLeaveConfirm(true)}
                      className="text-[13px] font-semibold text-rose-600 bg-white ring-1 ring-rose-200 hover:bg-rose-50 px-4 py-2 rounded-lg shrink-0"
                    >
                      Leave
                    </button>
                  </div>
                )}
                {isOwner && (
                  <div className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-rose-700">Delete group</p>
                      <p className="text-[12px] text-stone-600 mt-1 leading-snug">Permanently remove this group and all its expenses. This cannot be undone.</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-[13px] font-semibold text-white bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-lg shrink-0 flex items-center gap-1.5"
                    >
                      <TrashIcon /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-[10.5px] text-stone-400 pt-4">
              Group ID {id?.slice(0, 8)}
            </p>
          </div>
        </div>
      </div>
      </div>{/* end main column */}

      <ConfirmDialog
        open={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={handleRegenerate}
        title="Regenerate invite link"
        message="The current invite link will stop working. Anyone with the old link won't be able to join."
        confirmLabel="Regenerate"
        variant="danger"
        loading={updateSettingsMutation.isPending}
      />

      <ConfirmDialog
        open={!!pendingRemoveMemberId}
        onClose={() => setPendingRemoveMemberId(null)}
        onConfirm={handleRemoveMember}
        title="Remove member"
        message="Are you sure you want to remove this member from the group?"
        confirmLabel="Remove"
        variant="danger"
        loading={removeMemberMutation.isPending}
      />

      <ConfirmDialog
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={() => leaveMutation.mutate()}
        title="Leave group"
        message="You'll lose access to this group. Your expenses will remain in the group history."
        confirmLabel="Leave"
        variant="danger"
        loading={leaveMutation.isPending}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete group"
        message="This permanently deletes the group and all its expenses, members, and history. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
