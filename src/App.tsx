import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { IssuesView } from './components/IssuesView';
import { ExplorerView } from './components/ExplorerView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { LoginScreen } from './components/LoginScreen';
import { NewInvestigationModal } from './components/NewInvestigationModal';
import { InvestigationReportModal } from './components/InvestigationReportModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AuthActionModal } from './components/AuthActionModal';
import { VectorMatrixBackground } from './components/VectorMatrixBackground';
import { Investigation, User } from './types';
import { scanCodebaseForBugs } from './utils/bugScanner';
import { ActiveProjectProvider, useActiveProject } from './context/ActiveProjectContext';
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

function AppContent() {
  const [currentView, setCurrentView] = useState<NavTab>('dashboard');
  const [explorerFile, setExplorerFile] = useState<string | undefined>(undefined);
  const [explorerLine, setExplorerLine] = useState<number | undefined>(undefined);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const { 
    activeProject, 
    projectFiles, 
    uploadAndSetActiveProject 
  } = useActiveProject();

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
    // If not already active project, persist as single active project
    if (!activeProject || activeProject.name !== projectName) {
      try {
        await uploadAndSetActiveProject(
          files,
          projectName,
          gitRepoUrl ? 'GitHub Repository' : 'Source Project',
          'Active Workspace',
          0,
          gitRepoUrl ? 'github_repo' : 'source_project',
          gitRepoUrl,
          'main'
        );
      } catch (err) {
        console.warn('Could not persist active project:', err);
      }
    }

    try {
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
      setCurrentView('issues');
    } catch (err) {
      console.error('Failed to run forensic scan', err);
    }
  };

  const handleOpenInvestigation = (inv: Investigation) => {
    setActiveInvestigation(inv);
    setCurrentView('issues');
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

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="relative min-h-screen bg-[#090A0F] text-[#E2E8F0] flex flex-col font-sans selection:bg-[#F97316]/30 selection:text-white">
      {/* Subtle Vector Matrix Background (Persistent across navigation) */}
      <VectorMatrixBackground />

      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeInvestigation={activeInvestigation}
        onNewInvestigation={() => setCurrentView('issues')}
        onOpenSearch={() => setIsSearchOpen(true)}
        currentUser={currentUser}
        onSelectIssueById={(id) => {
          setSelectedIssueId(id);
          setCurrentView('issues');
        }}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area with Seamless Page Transition & Shared-Element Morphing */}
      <main className="relative z-10 flex-1 w-full px-4 sm:px-6 py-4 flex flex-col overflow-y-auto overflow-x-hidden">
        <LayoutGroup id="bugforge-app-views">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ 
                duration: 0.24, 
                ease: [0.22, 1, 0.36, 1],
                layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
              }}
              className="flex-1 flex flex-col w-full"
            >
              {currentView === 'dashboard' && (
                <DashboardView
                  investigations={investigations}
                  onOpenInvestigation={handleOpenInvestigation}
                  onNewInvestigation={() => setCurrentView('issues')}
                  onOpenExplorer={() => setCurrentView('explorer')}
                  onNavigateToIssues={() => setCurrentView('issues')}
                  onSelectIssue={(issue) => {
                    setSelectedIssueId(issue.id);
                    setCurrentView('issues');
                  }}
                  onUploadAndScanFiles={(files, name, error, repo) =>
                    handleUploadAndScanFiles(files, name, error, repo)
                  }
                  onConnectGitHub={() => {
                    setCurrentView('dashboard');
                  }}
                />
              )}

              {currentView === 'issues' && (
                <IssuesView
                  currentUser={currentUser}
                  initialSelectedIssueId={selectedIssueId}
                  onOpenInExplorer={handleOpenInExplorer}
                  onGoToDashboard={() => setCurrentView('dashboard')}
                  activeInvestigation={activeInvestigation}
                  investigations={investigations}
                  onSelectInvestigation={(inv) => {
                    setActiveInvestigation(inv);
                  }}
                  onVerifyFix={handleVerifyFix}
                  isVerifying={isVerifying}
                  onExportReport={() => setIsReportModalOpen(true)}
                  onUploadAndScanFiles={handleUploadAndScanFiles}
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
                    setCurrentView('issues');
                  }}
                  onNewInvestigation={() => setCurrentView('issues')}
                  onGoToDashboard={() => setCurrentView('dashboard')}
                />
              )}

              {currentView === 'history' && (
                <HistoryView
                  investigations={investigations}
                  onOpenInvestigation={handleOpenInvestigation}
                  onNewInvestigation={() => setCurrentView('issues')}
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
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>
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

      {/* Firebase Auth Email Action & Password Reset Modal */}
      <AuthActionModal />
    </div>
  );
}

export default function App() {
  return (
    <ActiveProjectProvider>
      <AppContent />
    </ActiveProjectProvider>
  );
}
