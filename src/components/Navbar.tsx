import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  PlusCircle, 
  Search, 
  LayoutDashboard, 
  SearchCode, 
  FolderTree,
  History, 
  Settings,
  Bell,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  Check,
  ChevronDown,
  LogOut,
  Sliders
} from 'lucide-react';
import { Investigation, User, Notification } from '../types';

export type NavTab = 'dashboard' | 'investigate' | 'explorer' | 'issues' | 'history' | 'settings' | 'investigation';

interface NavbarProps {
  currentView: NavTab;
  setCurrentView: (view: NavTab) => void;
  activeInvestigation: Investigation | null;
  onNewInvestigation: () => void;
  onOpenSearch: () => void;
  currentUser: User;
  onSwitchUser?: (user: User) => void;
  onSelectIssueById?: (issueId: string) => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  activeInvestigation,
  onNewInvestigation,
  onOpenSearch,
  currentUser,
  onSelectIssueById,
  onSignOut,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('bf_auth_token') || localStorage.getItem('bf_token') || '';
      const res = await fetch('/api/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // silent fallback
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('bf_auth_token') || localStorage.getItem('bf_token') || '';
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silent fallback
    }
  };

  const markSingleRead = async (notif: Notification) => {
    try {
      const token = localStorage.getItem('bf_auth_token') || localStorage.getItem('bf_token') || '';
      await fetch(`/api/notifications/${notif.id}/read`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      if (notif.issueId && onSelectIssueById) {
        setIsNotifOpen(false);
        setCurrentView('issues');
        onSelectIssueById(notif.issueId);
      }
    } catch {
      // silent fallback
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <nav className="sticky top-0 z-40 w-full bg-[#090A0F]/95 backdrop-blur border-b border-[#1E2333] px-4 sm:px-6 py-2.5 flex items-center justify-between font-sans">
      <div className="flex items-center space-x-6 sm:space-x-8">
        {/* Brand Logo */}
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center space-x-2.5 group text-left cursor-pointer focus:outline-none"
        >
          <div className="w-6 h-6 rounded border border-[#2B3245] bg-[#121520] flex items-center justify-center text-[#F97316]">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold tracking-tight text-sm text-white">
            BUGFORGE
          </span>
        </button>

        {/* Primary Navigation Tabs */}
        <div className="hidden md:flex items-center space-x-5 text-xs font-medium">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`transition-colors cursor-pointer py-1.5 flex items-center gap-1.5 ${
              currentView === 'dashboard'
                ? 'text-white border-b-2 border-[#F97316] font-semibold'
                : 'text-[#8B949E] hover:text-[#E2E8F0]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentView('issues')}
            className={`transition-colors cursor-pointer py-1.5 flex items-center gap-1.5 ${
              currentView === 'issues'
                ? 'text-white border-b-2 border-[#F97316] font-semibold'
                : 'text-[#8B949E] hover:text-[#E2E8F0]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Issues</span>
          </button>

          <button
            onClick={() => setCurrentView('investigate')}
            className={`transition-colors cursor-pointer py-1.5 flex items-center gap-1.5 ${
              currentView === 'investigate'
                ? 'text-white border-b-2 border-[#F97316] font-semibold'
                : 'text-[#8B949E] hover:text-[#E2E8F0]'
            }`}
          >
            <SearchCode className="w-3.5 h-3.5" />
            <span>Investigate</span>
          </button>

          <button
            onClick={() => setCurrentView('explorer')}
            className={`transition-colors cursor-pointer py-1.5 flex items-center gap-1.5 ${
              currentView === 'explorer'
                ? 'text-white border-b-2 border-[#F97316] font-semibold'
                : 'text-[#8B949E] hover:text-[#E2E8F0]'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Explorer</span>
          </button>

          <button
            onClick={() => setCurrentView('history')}
            className={`transition-colors cursor-pointer py-1.5 flex items-center gap-1.5 ${
              currentView === 'history'
                ? 'text-white border-b-2 border-[#F97316] font-semibold'
                : 'text-[#8B949E] hover:text-[#E2E8F0]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>

          <button
            onClick={() => setCurrentView('settings')}
            className={`transition-colors cursor-pointer py-1.5 flex items-center gap-1.5 ${
              currentView === 'settings'
                ? 'text-white border-b-2 border-[#F97316] font-semibold'
                : 'text-[#8B949E] hover:text-[#E2E8F0]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          {activeInvestigation && currentView === 'investigation' && (
            <button
              onClick={() => setCurrentView('investigation')}
              className="text-[#F97316] border-b-2 border-[#F97316] font-semibold py-1.5 flex items-center gap-1.5 text-xs"
            >
              <span>Investigation</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: Search, Notifications, User Profile, + Investigate CTA */}
      <div className="flex items-center space-x-2.5">
        {/* Quick Search */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center space-x-2 text-xs bg-[#121622] hover:bg-[#181E2E] text-[#8B949E] hover:text-white px-2.5 py-1.5 rounded border border-[#1E2333] transition-colors cursor-pointer"
        >
          <Search className="w-3 h-3 text-[#8B949E]" />
          <span>Search bugs...</span>
          <kbd className="px-1 py-0.2 bg-[#1C2233] text-[#A0AEC0] rounded text-[9px] font-mono">⌘K</kbd>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-1.5 rounded bg-[#121622] hover:bg-[#181E2E] text-[#8B949E] hover:text-white border border-[#1E2333] transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#F97316] text-black text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg bg-[#0D1017] border border-[#1E2333] shadow-xl p-3 space-y-2.5 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                  <Bell className="w-3 h-3 text-[#F97316]" />
                  <span>Notifications {unreadCount > 0 && `(${unreadCount})`}</span>
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-[#F97316] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markSingleRead(n)}
                      className={`p-2 rounded border text-xs cursor-pointer transition-colors ${
                        n.read
                          ? 'bg-transparent border-transparent text-[#8B949E]'
                          : 'bg-[#121624] border-[#F97316]/20 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="font-medium text-[#F97316]">{n.title}</span>
                        <span className="text-[10px] text-[#6E7681]">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#C9D1D9]">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-[#6E7681]">
                    No notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#121622] hover:bg-[#181E2E] border border-[#1E2333] text-xs text-white transition-colors cursor-pointer"
          >
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-4 h-4 rounded-full"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-[#F97316]/20 text-[#F97316] font-bold text-[9px] flex items-center justify-center">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span className="hidden sm:inline font-medium text-xs">
              {currentUser.name ? currentUser.name.split(' ')[0] : 'Developer'}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#1C2233] text-[#8B949E] border border-[#2B3245]">
              {currentUser.role || 'DEVELOPER'}
            </span>
            <ChevronDown className="w-3 h-3 text-[#8B949E]" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg bg-[#0D1017] border border-[#1E2333] shadow-xl p-3 space-y-2 z-50 text-xs font-sans">
              <div className="pb-2 border-b border-[#1E2333]">
                <div className="font-medium text-white truncate">{currentUser.name || 'Developer'}</div>
                <div className="text-[11px] text-[#8B949E] truncate">{currentUser.email}</div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#6E7681]">
                  <span>Role:</span>
                  <span className="text-[#C9D1D9] font-medium">{currentUser.role || 'DEVELOPER'}</span>
                </div>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    setCurrentView('settings');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded text-[#C9D1D9] hover:bg-[#161B26] hover:text-white text-xs text-left cursor-pointer transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#8B949E]" />
                  <span>Workspace Settings</span>
                </button>

                {onSignOut && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded text-red-400 hover:bg-red-950/30 hover:text-red-300 text-xs text-left cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Investigate CTA */}
        <button
          onClick={onNewInvestigation}
          className="bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Investigate</span>
        </button>
      </div>
    </nav>
  );
};
