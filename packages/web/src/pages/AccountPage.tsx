import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';
import { Avatar } from '../components/Avatar.js';
import { DesktopRail } from '../components/DesktopRail.js';
import { appPageStyle } from '../components/CatBackground.js';

function BackIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 11-3.4-13l5.7-5.7A20 20 0 1044 24c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0124 12c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 006.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3A12 12 0 0124 36a12 12 0 01-11.3-8l-6.5 5A20 20 0 0024 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 01-4.1 5.4l6.3 5.3C40 35.5 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19a4.5 4.5 0 100-9h-1.3A7 7 0 103 14" /><path d="M14 14l3 3 3-3M17 17v-7" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const { user, login, logout } = useAuth();
  const isGuest = !user;

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
              <p className="text-[11px] font-semibold text-stone-400 leading-none">Settings</p>
              <h1 className="text-[15px] font-bold text-stone-900 leading-tight mt-0.5">Account</h1>
            </div>
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden lg:block bg-white border-b border-stone-100 px-8 py-5 shrink-0">
          <div className="flex items-center gap-2 text-[12.5px] text-stone-400 mb-1.5">
            <span>Settings</span>
            <span>›</span>
            <span className="text-stone-700 font-medium">Account</span>
          </div>
          <h1 className="text-[22px] font-bold text-stone-900 tracking-tight">Account</h1>
        </header>

        {/* Scrollable content */}
        <div className="lg:flex-1 lg:overflow-y-auto">
          <main className="max-w-2xl mx-auto px-4 pt-5 pb-8 lg:max-w-[760px] lg:px-8 lg:py-7">

            {/* Identity card */}
            <section className="tabby-card p-5 mb-5 flex items-center gap-4 lg:p-5">
              {isGuest ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold text-xl shrink-0">
                    G
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-stone-900 leading-tight">Guest</p>
                    <p className="text-xs text-stone-500 mt-0.5 leading-snug lg:text-[13px]">
                      Your data lives only on this device. Sign in to sync across devices &amp; recover if you lose access.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Avatar name={user.name} size={56} />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-stone-900 leading-tight truncate lg:text-[18px]">{user.name}</p>
                    <p className="text-[12.5px] text-stone-500 truncate mt-0.5 flex items-center gap-1.5 lg:text-[13px]">
                      <GoogleG size={13} />
                      {user.email}
                    </p>
                  </div>
                </>
              )}
            </section>

            {/* Guest: sign-in prompt */}
            {isGuest && (
              <>
                <p className="tabby-eyebrow text-stone-500 mb-2 px-1">Sign in to sync</p>
                <section className="tabby-card overflow-hidden mb-3">
                  <div className="px-5 py-5">
                    <div className="lg:grid lg:grid-cols-3 lg:gap-4 mb-5">
                      <div className="flex gap-3 mb-5 lg:hidden">
                        <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                          <SyncIcon />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-stone-900">Why sign in?</p>
                          <ul className="text-xs text-stone-600 mt-1.5 space-y-1 leading-snug">
                            <li>· Sync groups across your phone &amp; web</li>
                            <li>· Recover your data if you lose this device</li>
                            <li>· Friends can find &amp; invite you by email</li>
                          </ul>
                        </div>
                      </div>
                      {[
                        ['Sync', 'Phone & web stay in step'],
                        ['Recover', 'Restore your data on a new device'],
                        ['Find', 'Friends invite you by email'],
                      ].map(([t, d]) => (
                        <div key={t} className="hidden lg:block text-left">
                          <p className="text-[13px] font-bold text-stone-900">{t}</p>
                          <p className="text-[11.5px] text-stone-500 mt-1 leading-snug">{d}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => login(`/groups/${id}`)}
                      className="w-full bg-white ring-1 ring-stone-300 hover:bg-stone-50 active:bg-stone-100 rounded-xl py-3 flex items-center justify-center gap-2.5 font-semibold text-sm text-stone-800 transition-colors"
                    >
                      <GoogleG size={18} />
                      Sign in with Google
                    </button>
                  </div>
                </section>
                <p className="text-[11px] text-stone-400 text-center px-6 leading-snug">
                  By signing in you agree to Tabby&apos;s Terms &amp; Privacy.
                </p>
              </>
            )}

            {/* Signed in: connected accounts + sign out */}
            {!isGuest && (
              <>
                <p className="tabby-eyebrow text-stone-500 mb-2 px-1">Connected accounts</p>
                <section className="tabby-card overflow-hidden mb-5">
                  <div className="px-4 py-3.5 flex items-center gap-3 border-b border-stone-100 lg:px-5 lg:py-4">
                    <span className="w-9 h-9 rounded-xl bg-stone-50 ring-1 ring-stone-200 flex items-center justify-center shrink-0 lg:w-10 lg:h-10">
                      <GoogleG size={20} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 leading-tight lg:text-[14px]">Google</p>
                      <p className="text-xs text-stone-500 truncate leading-tight mt-0.5 lg:text-[12.5px]">{user.email}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                      Active
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between lg:px-5 lg:py-3.5">
                    <span className="text-xs text-stone-500 lg:text-[12.5px]">Last synced just now</span>
                    <button
                      onClick={() => window.location.reload()}
                      className="text-xs font-semibold text-primary lg:text-[12.5px]"
                    >
                      Sync now
                    </button>
                  </div>
                </section>

                <p className="tabby-eyebrow text-stone-500 mb-2 px-1">Session</p>
                <section className="tabby-card overflow-hidden">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-rose-50 transition-colors lg:px-5 lg:py-4"
                  >
                    <span className="text-rose-500"><LogoutIcon /></span>
                    <span className="text-sm font-medium text-rose-600 lg:text-[14px]">Sign out</span>
                    <span className="hidden lg:block ml-auto text-[12px] text-stone-400">Local data stays on this device</span>
                  </button>
                </section>
                <p className="text-[11px] text-stone-400 text-center mt-4 px-6 leading-snug">
                  Signing out keeps your local data on this device.
                </p>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
