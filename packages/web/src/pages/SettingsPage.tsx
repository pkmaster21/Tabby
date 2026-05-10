import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { TabbyLogo } from '../components/TabbyLogo.js';
import { DesktopRail } from '../components/DesktopRail.js';
import { appPageStyle } from '../components/CatBackground.js';
import { useAuth } from '../lib/auth.js';

function ChevronRight() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const groupQuery = useQuery({
    queryKey: queryKeys.group(id!),
    queryFn: () => api.getGroup(id!),
  });

  const groupName = groupQuery.data?.name ?? '';

  const rows = [
    {
      key: 'account',
      to: `/groups/${id}/settings/account`,
      icon: <UserIcon />,
      label: 'Account',
      description: user ? user.name : 'Guest · not synced',
    },
    {
      key: 'group',
      to: `/groups/${id}/settings/group`,
      icon: <GearIcon />,
      label: 'Group settings',
      description: groupName,
    },
  ] as const;

  return (
    <div className="min-h-screen lg:flex lg:h-screen lg:overflow-hidden" style={appPageStyle}>
      <DesktopRail activeGroupId={id} />

      <div className="flex-1 min-w-0 lg:flex lg:flex-col lg:overflow-hidden">
        <header className="bg-white border-b border-stone-100 sticky top-0 z-10 lg:static lg:shrink-0">
          <div className="max-w-2xl mx-auto px-2 py-3 flex items-center gap-1 lg:max-w-none lg:px-6 lg:py-5">
            <Link to={`/groups/${id}`} className="lg:hidden">
              <button className="w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-700 transition-colors" aria-label="Back">
                <BackIcon />
              </button>
            </Link>
            <div className="flex items-center gap-2.5 px-1 lg:px-0 lg:block">
              <span className="lg:hidden"><TabbyLogo size={22} /></span>
              <h1 className="text-[15px] font-semibold text-stone-900 lg:text-[22px] lg:font-bold lg:tracking-tight">Settings</h1>
            </div>
          </div>
        </header>

        <div className="lg:flex-1 lg:overflow-y-auto">
          <main className="max-w-2xl mx-auto px-4 pt-5 pb-8 lg:max-w-[760px] lg:px-8 lg:py-7">
            <section className="tabby-card overflow-hidden">
              {rows.map(({ key, to, icon, label, description }, i) => (
                <Link
                  key={key}
                  to={to}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition-colors ${
                    i < rows.length - 1 ? 'border-b border-stone-100' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900">{label}</p>
                    {description && (
                      <p className="text-xs text-stone-500 truncate mt-0.5">{description}</p>
                    )}
                  </div>
                  <span className="text-stone-300 shrink-0">
                    <ChevronRight />
                  </span>
                </Link>
              ))}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
