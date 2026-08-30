import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { DashboardView } from '../DashboardView';
import * as ActiveProjectContextModule from '../../context/ActiveProjectContext';
import { ActiveProject } from '../../types';

// Mock context module
vi.mock('../../context/ActiveProjectContext', () => ({
  useActiveProject: vi.fn(),
  ActiveProjectProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('DashboardView GitHub Synchronization and Motion Transitions', () => {
  const mockActiveProject: ActiveProject = {
    id: 'prj_test_123',
    name: 'facebook/react',
    originalFileName: 'facebook/react',
    fileType: 'GitHub Repository',
    fileSize: '4.2 MB',
    fileSizeBytes: 4404019,
    projectType: 'github_repo',
    status: 'Ready',
    uploadedAt: '2026-08-30T04:00:00.000Z',
    updatedAt: '2026-08-30T04:15:00.000Z',
    indexedFileCount: 42,
    active: true,
    branch: 'main',
    repoUrl: 'https://github.com/facebook/react',
  };

  const mockContextValue = {
    activeProject: mockActiveProject,
    activeProjectId: 'prj_test_123',
    projectFiles: {
      'src/index.js': 'console.log("hello world");',
      'src/App.js': 'export default function App() {}',
    },
    loadingActiveProject: false,
    error: null,
    setProjectFiles: vi.fn(),
    uploadAndSetActiveProject: vi.fn(),
    removeActiveProject: vi.fn(),
    refreshActiveProject: vi.fn(),
    updateActiveFile: vi.fn(),
    setActiveProjectDirectly: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ActiveProjectContextModule.useActiveProject).mockReturnValue(mockContextValue);
  });

  it('renders the GitHub repository synchronization status indicator with branch and scan timestamp', () => {
    render(
      <DashboardView
        onNewInvestigation={vi.fn()}
        onOpenExplorer={vi.fn()}
      />
    );

    // Verify indicator is present
    const syncIndicator = screen.getByTestId('github-sync-indicator');
    expect(syncIndicator).toBeInTheDocument();

    // Verify Repository Synchronization title
    expect(screen.getByText('Repository Synchronization')).toBeInTheDocument();

    // Verify In Sync status
    expect(screen.getByText('In Sync')).toBeInTheDocument();

    // Verify Current Branch is displayed
    expect(screen.getByText('Current Branch')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();

    // Verify Last Successful Scan label is displayed
    expect(screen.getByText('Last Successful Scan')).toBeInTheDocument();
    expect(screen.getByText(/Scan verified:/i)).toBeInTheDocument();
  });

  it('displays custom branch when project has custom branch name', () => {
    vi.mocked(ActiveProjectContextModule.useActiveProject).mockReturnValue({
      ...mockContextValue,
      activeProject: {
        ...mockActiveProject,
        branch: 'feature/ast-diagnostics',
      },
    });

    render(
      <DashboardView
        onNewInvestigation={vi.fn()}
        onOpenExplorer={vi.fn()}
      />
    );

    expect(screen.getByText('feature/ast-diagnostics')).toBeInTheDocument();
  });

  it('handles manual Sync & Re-scan click and updates scan timestamp with success toast', async () => {
    render(
      <DashboardView
        onNewInvestigation={vi.fn()}
        onOpenExplorer={vi.fn()}
      />
    );

    const syncButton = screen.getByRole('button', { name: /Sync & Re-scan/i });
    expect(syncButton).toBeInTheDocument();

    fireEvent.click(syncButton);

    // Wait for the sync completion feedback
    await waitFor(() => {
      expect(
        screen.getByText(/Branch synchronized & AST codebase scan verified/i)
      ).toBeInTheDocument();
    });
  });

  it('renders GitHub Connected badge for github_repo projectType', () => {
    render(
      <DashboardView
        onNewInvestigation={vi.fn()}
        onOpenExplorer={vi.fn()}
      />
    );

    expect(screen.getByText('GitHub Connected')).toBeInTheDocument();
  });

  it('renders recent investigation banner when investigations exist with navigation handler', () => {
    const mockOpenInvestigation = vi.fn();
    const mockInvestigation = {
      id: 'inv_123',
      project: 'facebook/react',
      title: 'Memory Leak Investigation',
      status: 'ROOT_CAUSE_FOUND' as const,
      confidence: 96,
      createdAt: '2026-08-30T04:20:00.000Z',
      failureSummary: 'Closure retain cycle in event listener',
      rootCauses: [],
      filesAnalyzedCount: 42,
    };

    render(
      <DashboardView
        investigations={[mockInvestigation]}
        onOpenInvestigation={mockOpenInvestigation}
        onNewInvestigation={vi.fn()}
      />
    );

    const banner = screen.getByText('Memory Leak Investigation');
    expect(banner).toBeInTheDocument();
    expect(screen.getByText('96% confidence')).toBeInTheDocument();

    fireEvent.click(banner);
    expect(mockOpenInvestigation).toHaveBeenCalledWith(mockInvestigation);
  });
});
