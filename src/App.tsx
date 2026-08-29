import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { IssuesView } from './components/IssuesView';
import { InvestigateView } from './components/InvestigateView';
import { InvestigationScreen } from './components/InvestigationScreen';
import { ExplorerView } from './components/ExplorerView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { LoginScreen } from './components/LoginScreen';
import { NewInvestigationModal } from './components/NewInvestigationModal';
import { InvestigationReportModal } from './components/InvestigationReportModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Investigation, Issue, User } from './types';
import { scanCodebaseForBugs } from './utils/bugScanner';
import { 
  auth, 
  onAuthStateChanged, 
  firebaseSignOut, 
  syncUserProfile, 
  getRedirectResult 
} from './lib/firebase';

const STORAGE_KEY = 'bugforge_investigations_data';
const USER_KEY = 'bugforge_current_user';
const TOKEN_KEY = 'bf_auth_token';

export default function App() {
  const [currentView, setCurrentView] = useState<NavTab>('dashboard');
  const [explorerFile, setExplorerFile] = useState<string | undefined>(undefined);
  const [explorerLine, setExplorerLine] = useState<number | undefined>(undefined);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  // Loaded project files for Explorer and Active Investigation
  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({});
  const [connectedRepo, setConnectedRepo] = useState<string>('');

  // Load user's real investigations
  const [investigations, setInvestigations] = useState<Investigation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [activeInvestigation, setActiveInvestigation] = useState<Investigation | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Investigation[] = JSON.parse(saved);
        return parsed[0] || null;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Handle Firebase Auth Session & Redirects
  useEffect(() => {
    // Check redirect result first
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const profile = await syncUserProfile(result.user);
          const token = await result.user.getIdToken();
          const mapped: User = {
            id: profile.uid,
            name: profile.displayName,
            email: profile.email,
            avatarUrl: profile.photoURL,
            role: profile.role,
            createdAt: profile.createdAt,
            lastLoginAt: profile.lastLoginAt,
            mfaEnabled: profile.mfaEnabled,
          };
          setCurrentUser(mapped);
          localStorage.setItem(USER_KEY, JSON.stringify(mapped));
          localStorage.setItem(TOKEN_KEY, token);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in notice:', err);
      });

    // Subscribe to auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await syncUserProfile(firebaseUser);
          const token = await firebaseUser.getIdToken();
          const mapped: User = {
            id: profile.uid,
            name: profile.displayName,
            email: profile.email,
            avatarUrl: profile.photoURL,
            role: profile.role,
            createdAt: profile.createdAt,
            lastLoginAt: profile.lastLoginAt,
            mfaEnabled: profile.mfaEnabled,
          };
          setCurrentUser(mapped);
          localStorage.setItem(USER_KEY, JSON.stringify(mapped));
          localStorage.setItem(TOKEN_KEY, token);
        } catch (err) {
          console.error('Error syncing user profile:', err);
        }
      } else {
        // If not authenticated with Firebase, clear session
        setCurrentUser(null);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync investigations with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(investigations));
    } catch {
      // ignore
    }
  }, [investigations]);

  // Global shortcut for Cmd/Ctrl+K search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Sign-out error:', err);
    } finally {
      setCurrentUser(null);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  // Launch analysis on uploaded files or pasted error
  const handleUploadAndScanFiles = async (
    files: Record<string, string>,
    projectName: string,
    pastedError?: string,
    gitRepoUrl?: string
  ) => {
    setProjectFiles(files);
    if (gitRepoUrl) setConnectedRepo(gitRepoUrl);

    try {
      // Run static and causal bug scanning engine
      const scannedResult = await scanCodebaseForBugs(files, projectName, pastedError);

      const newInv: Investigation = {
        ...scannedResult.investigation,
        id: scannedResult.investigation.id || `INV-${Date.now().toString().slice(-4)}`,
        title: pastedError ? `Diagnosis: ${pastedError.slice(0, 50)}...` : (scannedResult.investigation.title || `Investigation: ${projectName}`),
        project: projectName,
        rawError: pastedError || scannedResult.investigation.rawError || scannedResult.investigation.failureSummary,
        createdAt: new Date().toISOString(),
      };

      setInvestigations((prev) => [newInv, ...prev]);
      setActiveInvestigation(newInv);
      setCurrentView('investigation');
    } catch (err) {
      console.error('Failed to run forensic scan', err);
    }
  };

  const handleOpenInvestigation = (inv: Investigation) => {
    setActiveInvestigation(inv);
    setCurrentView('investigation');
  };

  const handleOpenInExplorer = (file: string, line?: number) => {
    setExplorerFile(file);
    setExplorerLine(line);
    setCurrentView('explorer');
  };

  const handleVerifyFix = async (fixCode: string) => {
    if (!activeInvestigation) return;
    setIsVerifying(true);

    try {
      const token = localStorage.getItem(TOKEN_KEY) || '';
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fixCode,
          investigationId: activeInvestigation.id,
        }),
      });

      const data = await res.json();
      const updated: Investigation = {
        ...activeInvestigation,
        status: data.passed ? 'RESOLVED' : activeInvestigation.status,
        verification: {
          status: data.passed ? 'PASSED' : 'FAILED',
          message: data.message,
          executionTimeMs: data.executionTimeMs,
          timestamp: data.timestamp,
        },
      };

      setActiveInvestigation(updated);
      setInvestigations((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      console.error('Verification request failed', err);
    } finally {
      setIsVerifying(false);
    }
  };

  // If initial auth state is loading and no saved user
  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-[#E2E8F0] flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 text-xs text-[#8B949E]">
          <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
          <span>Verifying authentication session...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, present the Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#F97316]/30 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeInvestigation={activeInvestigation}
        onNewInvestigation={() => setCurrentView('investigate')}
        onOpenSearch={() => setIsSearchOpen(true)}
        currentUser={currentUser}
        onSelectIssueById={(id) => {
          setSelectedIssueId(id);
          setCurrentView('issues');
        }}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full px-4 sm:px-6 py-4 flex flex-col overflow-y-auto">
        {currentView === 'dashboard' && (
          <DashboardView
            investigations={investigations}
            onOpenInvestigation={handleOpenInvestigation}
            onNewInvestigation={() => setCurrentView('investigate')}
            onOpenExplorer={handleOpenInExplorer}
            onNavigateToIssues={() => setCurrentView('issues')}
            onSelectIssue={(issue) => {
              setSelectedIssueId(issue.id);
              setCurrentView('issues');
            }}
            onUploadAndScanFiles={(files, name, error, repo) =>
              handleUploadAndScanFiles(files, name, error, repo)
            }
            onConnectGitHub={() => {
              setCurrentView('explorer');
            }}
          />
        )}

        {currentView === 'issues' && (
          <IssuesView
            currentUser={currentUser}
            initialSelectedIssueId={selectedIssueId}
            onOpenInExplorer={handleOpenInExplorer}
          />
        )}

        {currentView === 'investigate' && (
          <InvestigateView
            onStartInvestigation={async (files, projectName, pastedError, gitRepoUrl) => {
              await handleUploadAndScanFiles(files, projectName, pastedError, gitRepoUrl);
            }}
          />
        )}

        {currentView === 'explorer' && (
          <ExplorerView
            files={projectFiles}
            investigation={activeInvestigation}
            selectedFilePath={explorerFile}
            selectedFileLine={explorerLine}
            onSelectFile={(path, line) => {
              setExplorerFile(path);
              setExplorerLine(line);
            }}
            onOpenInvestigation={() => {
              if (activeInvestigation) setCurrentView('investigation');
            }}
            onNewInvestigation={() => setCurrentView('investigate')}
            onUploadProject={(files, name) => {
              setProjectFiles(files);
              setConnectedRepo(name);
            }}
            connectedRepo={connectedRepo}
          />
        )}

        {currentView === 'history' && (
          <HistoryView
            investigations={investigations}
            onOpenInvestigation={handleOpenInvestigation}
            onNewInvestigation={() => setCurrentView('investigate')}
            onClearHistory={() => {
              setInvestigations([]);
              setActiveInvestigation(null);
              localStorage.removeItem(STORAGE_KEY);
            }}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            onUpdateCurrentUser={setCurrentUser}
          />
        )}

        {currentView === 'investigation' && activeInvestigation && (
          <InvestigationScreen
            investigation={activeInvestigation}
            onBack={() => setCurrentView('dashboard')}
            onVerifyFix={handleVerifyFix}
            isVerifying={isVerifying}
            onExportReport={() => setIsReportModalOpen(true)}
            onOpenInExplorer={handleOpenInExplorer}
          />
        )}

        {currentView === 'investigation' && !activeInvestigation && (
          <div className="max-w-md mx-auto text-center py-16 space-y-4">
            <h2 className="text-sm font-semibold text-white">No Active Investigation</h2>
            <p className="text-xs text-[#8B949E]">
              Select an investigation from your history or start a new diagnosis.
            </p>
            <button
              onClick={() => setCurrentView('investigate')}
              className="px-3.5 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs rounded cursor-pointer transition-colors"
            >
              Start Investigation
            </button>
          </div>
        )}
      </main>

      {/* Upload/New Investigation Modal */}
      <NewInvestigationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmitFiles={(files, name) => handleUploadAndScanFiles(files, name)}
        isLoading={false}
      />

      {/* Export Report Modal */}
      {activeInvestigation && (
        <InvestigationReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          investigation={activeInvestigation}
        />
      )}

      {/* Quick Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        investigations={investigations}
        onSelectInvestigation={handleOpenInvestigation}
      />
    </div>
  );
}
