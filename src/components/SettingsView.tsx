import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Github, 
  Slack, 
  Key, 
  Bell, 
  Check, 
  RefreshCw, 
  Save, 
  ExternalLink,
  Lock,
  UserCheck,
  AlertCircle,
  Code2
} from 'lucide-react';
import { User, IntegrationSettings } from '../types';

interface SettingsViewProps {
  currentUser: User;
  onUpdateCurrentUser?: (user: User) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'integrations' | 'security' | 'notifications'>('profile');
  const [integrations, setIntegrations] = useState<IntegrationSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [githubToken, setGithubToken] = useState<string>('');
  const [githubRepo, setGithubRepo] = useState<string>('');

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bf_auth_token') || localStorage.getItem('bf_token') || '';
      const res = await fetch('/api/integrations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
        if (data.github) {
          setGithubToken(data.github.token || '');
          setGithubRepo(data.github.repo || '');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integrations) return;

    try {
      const updated: IntegrationSettings = {
        ...integrations,
        github: {
          ...integrations.github,
          token: githubToken,
          repo: githubRepo,
          connected: !!githubRepo,
        },
      };

      const token = localStorage.getItem('bf_auth_token') || localStorage.getItem('bf_token') || '';
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        setIntegrations(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 font-sans select-none text-[#E2E8F0] space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-[#1E2333]">
        <h1 className="text-base font-semibold text-white tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-[#8B949E] mt-0.5">
          Workspace security, verified authentication &amp; developer integrations
        </p>
      </div>

      {/* Tabs with thin underline indicator */}
      <div className="flex items-center gap-6 border-b border-[#1E2333] text-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'text-white border-b-2 border-[#F97316] font-semibold'
              : 'text-[#8B949E] hover:text-[#E2E8F0]'
          }`}
        >
          Profile
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'integrations'
              ? 'text-white border-b-2 border-[#F97316] font-semibold'
              : 'text-[#8B949E] hover:text-[#E2E8F0]'
          }`}
        >
          Integrations
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'security'
              ? 'text-white border-b-2 border-[#F97316] font-semibold'
              : 'text-[#8B949E] hover:text-[#E2E8F0]'
          }`}
        >
          Security &amp; MFA
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'notifications'
              ? 'text-white border-b-2 border-[#F97316] font-semibold'
              : 'text-[#8B949E] hover:text-[#E2E8F0]'
          }`}
        >
          Notifications
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. PROFILE SECTION (Clean Read-Only Rows) */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-[#0D1017] border border-[#1E2333] rounded-lg divide-y divide-[#1E2333]">
            {/* Avatar */}
            <div className="p-4 flex items-center justify-between text-xs">
              <span className="text-[#8B949E] font-medium">Avatar</span>
              <div className="flex items-center gap-3">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#161B26] border border-[#2B3245] flex items-center justify-center text-[#F97316] font-bold text-xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="text-[11px] text-[#6E7681]">Managed by Google Account</span>
              </div>
            </div>

            {/* Name */}
            <div className="p-4 flex items-center justify-between text-xs">
              <span className="text-[#8B949E] font-medium">Full Name</span>
              <span className="text-white font-medium">{currentUser.name || 'Developer'}</span>
            </div>

            {/* Email */}
            <div className="p-4 flex items-center justify-between text-xs">
              <span className="text-[#8B949E] font-medium">Google Account</span>
              <span className="text-[#C9D1D9] font-mono text-[11px]">{currentUser.email}</span>
            </div>

            {/* Role (Read-only label, no fake switching) */}
            <div className="p-4 flex items-center justify-between text-xs">
              <div>
                <span className="text-[#8B949E] font-medium block">Current Role</span>
                <span className="text-[10px] text-[#6E7681]">Enforced by server identity</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#161B26] text-[#F97316] border border-[#2B3245]">
                {currentUser.role || 'DEVELOPER'}
              </span>
            </div>

            {/* Google Subject ID */}
            {currentUser.googleSubjectId && (
              <div className="p-4 flex items-center justify-between text-xs">
                <span className="text-[#8B949E] font-medium">Identity Subject</span>
                <span className="text-[#6E7681] font-mono text-[10px]">{currentUser.googleSubjectId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INTEGRATIONS SECTION */}
      {/* ========================================================================= */}
      {activeTab === 'integrations' && (
        <form onSubmit={handleSaveIntegrations} className="space-y-4 max-w-2xl text-xs">
          {saveSuccess && (
            <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Integrations saved successfully.</span>
            </div>
          )}

          {/* GitHub Integration */}
          <div className="p-4 rounded-lg bg-[#0D1017] border border-[#1E2333] space-y-3">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-white" />
              <span className="font-semibold text-white">GitHub Integration</span>
            </div>
            <p className="text-[11px] text-[#8B949E]">
              Connect repositories for automatic AST parsing, tree retrieval, and investigation context.
            </p>

            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] text-[#8B949E]">Default Repository</label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="e.g. facebook/react"
                  className="w-full px-3 py-1.5 rounded bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316] font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8B949E]">GitHub Personal Access Token (Optional)</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_••••••••••••••••"
                  className="w-full px-3 py-1.5 rounded bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316] font-mono text-xs"
                />
                <span className="text-[10px] text-[#6E7681] block">
                  Required for private repositories or increased GitHub API rate limits. Tokens are stored securely.
                </span>
              </div>
            </div>
          </div>

          {/* CI/CD Webhook */}
          <div className="p-4 rounded-lg bg-[#0D1017] border border-[#1E2333] space-y-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#F97316]" />
              <span className="font-semibold text-white">CI/CD Webhook Ingestion</span>
            </div>
            <p className="text-[11px] text-[#8B949E]">
              Ingest automated build/test failure payloads directly from GitHub Actions, GitLab CI, or Jenkins.
            </p>

            <div className="p-2.5 rounded bg-[#121622] font-mono text-[11px] text-[#A0AEC0] flex items-center justify-between">
              <span>POST /api/integrations/cicd/webhook</span>
              <span className="text-[10px] text-[#6E7681]">Active</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 3. SECURITY SECTION */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-4 max-w-2xl text-xs">
          <div className="p-4 rounded-lg bg-[#0D1017] border border-[#1E2333] space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">Google Identity Authentication</span>
            </div>
            <p className="text-[11px] text-[#8B949E]">
              Your session is authenticated via Google Identity Services. Passwordless sign-in is enforced.
            </p>
            <div className="pt-2 text-[11px] text-[#6E7681]">
              Account Status: <span className="text-emerald-400 font-medium">Verified</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. NOTIFICATIONS SECTION */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="space-y-4 max-w-2xl text-xs">
          <div className="p-4 rounded-lg bg-[#0D1017] border border-[#1E2333] space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#F97316]" />
              <span className="font-semibold text-white">Alert Preferences</span>
            </div>
            <div className="space-y-2 pt-1 text-[11px] text-[#C9D1D9]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded accent-[#F97316]" />
                <span>Notify when a critical severity issue is assigned to me</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded accent-[#F97316]" />
                <span>Notify when a root cause analysis completes</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
