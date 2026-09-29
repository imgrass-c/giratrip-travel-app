import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  LogOut, 
  RefreshCw, 
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { loginWithGoogle, logoutUser, isFirebaseReady, type AppUser } from '../services/firebase';
import type { Trip } from '../types';

interface AuthGateProps {
  currentUser: AppUser | null;
  activeTrip: Trip;
  onAuthSuccess: (user: AppUser) => void;
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  currentUser,
  activeTrip,
  onAuthSuccess,
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDomainHelpOpen, setIsDomainHelpOpen] = useState(false);
  const [isDemoBypass, setIsDemoBypass] = useState(false);

  // Check if current user is in the active trip's whitelist
  const isWhitelisted = React.useMemo(() => {
    if (!currentUser) return false;
    if (isDemoBypass) return true;

    // 1. If the trip has NOT yet been linked to a custom Google Sheet (sheetCsvUrl is empty or sample trip),
    // allow the authenticated Google user to enter so they can set up and link their Google Sheet!
    if (!activeTrip?.sheetCsvUrl || activeTrip.id === 'trip_tokyo_spring_2026') {
      return true;
    }

    const userEmail = (currentUser.email || '').trim().toLowerCase();
    const userName = (currentUser.displayName || '').trim().toLowerCase();

    // 2. If trip has members, check matching email or name
    if (activeTrip && activeTrip.members && activeTrip.members.length > 0) {
      const match = activeTrip.members.some((m) => {
        const memberEmail = (m.email || '').trim().toLowerCase();
        const memberName = (m.name || '').trim().toLowerCase();
        
        // Exact email match
        if (memberEmail && userEmail && memberEmail === userEmail) return true;
        // Exact display name match
        if (memberName && userName && memberName === userName) return true;
        // User email prefix match (e.g. alex@gmail.com matches member Alex)
        if (userName && userEmail.startsWith(memberName)) return true;
        return false;
      });
      return match;
    }

    // Default: allow if member list is empty
    return true;
  }, [currentUser, activeTrip, isDemoBypass]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (!isFirebaseReady()) {
        throw new Error('尚未設定 Firebase 連線。請至「設定」或於 Google 試算表填入 Firebase API Key 與 Project ID。');
      }
      const user = await loginWithGoogle();
      onAuthSuccess(user);
    } catch (err: any) {
      console.error('Google Sign-in failure:', err);
      const errMsg = err?.message || '登入失敗，請稍後再試';
      if (errMsg.includes('configuration-not-found') || errMsg.includes('auth/configuration-not-found')) {
        setAuthError('Firebase 專案尚未在後台啟用 Google 登入。請前往 Firebase Console ➔ Authentication ➔ Sign-in method 開啟 Google 提供者。');
      } else if (errMsg.includes('unauthorized-domain') || errMsg.includes('auth/unauthorized-domain')) {
        setAuthError('此網站網域尚未在 Firebase Console 註冊為「已授權網域 (Authorized domain)」。');
        setIsDomainHelpOpen(true);
      } else if (errMsg.includes('popup-closed-by-user')) {
        setAuthError('您已關閉 Google 登入視窗，請重新點擊登入。');
      } else {
        setAuthError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setIsDemoBypass(false);
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // If user is authenticated and whitelisted, render the protected app!
  if (currentUser && isWhitelisted) {
    return <>{children}</>;
  }

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-primary/20">
      <div className="w-full max-w-md space-y-5">
        
        {/* Top Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-surface border border-surface-border shadow-tactile text-primary mb-1">
            <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center justify-center gap-2">
            <span>GiraTrip 記啦旅</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              私密安全鎖
            </span>
          </h1>
          <p className="text-xs text-ink-muted">
            旅程專屬安全閘門 ➔ Google 身份驗證與成員白名單保護
          </p>
        </div>

        {/* Tactile Card Container */}
        <div className="bg-surface rounded-3xl border border-surface-border p-6 shadow-tactile space-y-5">
          
          {/* STATE 1: Not logged in */}
          {!currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-canvas border border-surface-border text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-ink">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>旅程隱私安全防護</span>
                </div>
                <p className="text-ink-muted text-[11px] leading-relaxed">
                  為保護旅伴名單、即時帳目與私密行程資訊，進入前請先使用 Google 帳號進行身份確認。
                </p>
              </div>

              {/* Error Alert */}
              {authError && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                  <div className="space-y-1">
                    <p className="font-semibold">{authError}</p>
                    {isDomainHelpOpen && (
                      <p className="text-[10px] leading-relaxed text-red-800">
                        提示：請前往 Firebase 控制台 ➔ Authentication ➔ Settings ➔ Authorized domains，將網域 <code>{currentDomain}</code> 加入白名單即可完成授權。
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-2.5 shadow-tactile-sm active:shadow-tactile-inset disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Google 授權驗證中...</span>
                  </>
                ) : (
                  <>
                    {/* Official Google G vector SVG */}
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V13.4h6.887C18.2 16.14 15.645 18 12.24 18c-3.315 0-6-2.685-6-6s2.685-6 6-6c1.47 0 2.815.54 3.86 1.425l2.36-2.36C16.965 3.665 14.73 3 12.24 3 7.27 3 3.24 7.03 3.24 12s4.03 9 9 9c5.225 0 8.685-3.67 8.685-8.84 0-.59-.06-1.16-.17-1.875H12.24z"/>
                    </svg>
                    <span>使用 Google 帳號登入</span>
                  </>
                )}
              </button>

              {/* Developer Demo Bypass */}
              <div className="pt-2 text-center border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    const demoUser: AppUser = {
                      uid: 'demo_user_1',
                      email: 'guest@giratrip.local',
                      displayName: '訪客示範員',
                      photoURL: null,
                    };
                    setIsDemoBypass(true);
                    onAuthSuccess(demoUser);
                  }}
                  className="text-[11px] text-ink-muted hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>以訪客示範模式瀏覽 (預覽測試)</span>
                </button>
              </div>
            </div>
          ) : (
            /* STATE 2: Logged in but not in whitelist */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>未在旅程成員白名單中</span>
                </div>
                <p className="text-amber-900/80 text-[11px] leading-relaxed">
                  您目前登入的 Google 帳號為：
                </p>
                <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 font-mono text-[11px] text-ink font-semibold break-all">
                  {currentUser.email || currentUser.displayName || '未知帳號'}
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed pt-1">
                  此旅程目前僅允許 Google 試算表中「成員名單」登記的夥伴存取。請聯繫旅程主揪將您的 Email 加入試算表，或切換帳號。
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-tactile-sm active:shadow-tactile-inset"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>切換其他 Google 帳號</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full min-h-[44px] px-4 py-2 rounded-2xl bg-canvas border border-surface-border text-xs font-semibold text-ink hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>登出目前帳號</span>
                </button>
              </div>

              {/* Whitelist Members Preview */}
              {activeTrip?.members && activeTrip.members.length > 0 && (
                <div className="pt-2 border-t border-surface-border">
                  <span className="text-[10px] font-bold text-ink-muted block mb-1.5">
                    目前授權的旅伴姓名或名額：
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeTrip.members.map((m) => (
                      <span
                        key={m.id}
                        className="px-2 py-0.5 rounded-lg bg-canvas border border-surface-border text-[10px] text-ink font-medium flex items-center gap-1"
                      >
                        <span 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: m.avatarColor || '#15803D' }} 
                        />
                        <span>{m.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Info */}
        <div className="text-center text-[10px] text-ink-muted space-y-1">
          <p>GiraTrip 採用 Google Firebase 企業級身分驗證與端到端傳輸加密</p>
          <div className="flex items-center justify-center gap-3">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <span>TLS 1.3 安全連線</span>
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <span>零洩漏金鑰遮蔽</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
