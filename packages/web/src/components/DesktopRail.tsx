import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { Avatar } from './Avatar.js';
import { TabbyLogo } from './TabbyLogo.js';
import { useAuth } from '../lib/auth.js';

interface Props {
  activeGroupId?: string;
}

function PlusSmIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function DesktopRail({ activeGroupId }: Props) {
  const { user } = useAuth();
  const myGroupsQuery = useQuery({
    queryKey: queryKeys.myGroups(),
    queryFn: () => api.getMyGroups(),
  });
  const groups = myGroupsQuery.data ?? [];

  return (
    <aside className="hidden lg:flex w-[260px] bg-white border-r border-stone-100 flex-col shrink-0 overflow-hidden">
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-stone-100">
        <TabbyLogo size={26} />
        <span className="text-[18px] font-extrabold text-stone-900 tracking-tight">Tabby</span>
      </div>

      <div className="px-3 pt-4 pb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1">Your groups</p>
        <Link to="/create">
          <button className="w-6 h-6 rounded-md hover:bg-stone-100 flex items-center justify-center text-stone-500" title="New group">
            <PlusSmIcon />
          </button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {groups.map(({ group, memberCount }) => {
          const active = group.id === activeGroupId;
          const initials = group.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
          return (
            <Link key={group.id} to={`/groups/${group.id}`} className="block">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${active ? 'bg-orange-50 ring-1 ring-orange-200' : 'hover:bg-stone-100'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-bold shrink-0 ${active ? 'bg-primary text-white' : 'bg-stone-200 text-stone-600'}`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13.5px] font-semibold truncate leading-tight ${active ? 'text-orange-900' : 'text-stone-800'}`}>
                    {group.name}
                  </p>
                  <p className="text-[11px] text-stone-400 leading-tight mt-0.5">{memberCount} members</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-stone-100 p-3 flex items-center gap-3 min-w-0">
        {user ? (
          <>
            <Avatar name={user.name} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-stone-900 truncate">{user.name}</p>
              <p className="text-[11px] text-stone-400 truncate">{user.email}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold text-[13px] shrink-0">
              G
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-stone-900">Guest</p>
              <p className="text-[11px] text-stone-400">Not signed in</p>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
