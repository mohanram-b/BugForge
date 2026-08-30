import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ActiveProject, ProjectType } from '../types';

const ACTIVE_PROJECT_KEY = 'bugforge_active_project_metadata';
const ACTIVE_PROJECT_FILES_KEY = 'bugforge_active_project_files';
const TOKEN_KEY = 'bf_auth_token';

interface ActiveProjectContextType {
  activeProject: ActiveProject | null;
  activeProjectId: string | null;
  projectFiles: Record<string, string>;
  loadingActiveProject: boolean;
  error: string | null;
  setProjectFiles: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  uploadAndSetActiveProject: (
    files: Record<string, string>,
    name: string,
    fileType?: string,
    fileSize?: string,
    fileSizeBytes?: number,
    projectType?: ProjectType | string,
    repoUrl?: string,
    branch?: string
  ) => Promise<ActiveProject>;
  removeActiveProject: () => Promise<void>;
  refreshActiveProject: () => Promise<void>;
  updateActiveFile: (filePath: string, content: string) => Promise<void>;
  setActiveProjectDirectly: (project: ActiveProject | null, files?: Record<string, string>) => void;
}

const ActiveProjectContext = createContext<ActiveProjectContextType | undefined>(undefined);

export const ActiveProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Try restoring from local cache immediately for instant, flicker-free rendering
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && parsed.id) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [projectFiles, setProjectFiles] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_PROJECT_FILES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  });

  const [loadingActiveProject, setLoadingActiveProject] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('bf_token') || '';
    const userStr = localStorage.getItem('bugforge_current_user');
    let userId = 'usr_default';
    try {
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.id) userId = u.id;
      }
    } catch {
      // ignore
    }
    return {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Fetch active project and its indexed files from backend
  const refreshActiveProject = useCallback(async () => {
    try {
      setLoadingActiveProject(true);
      setError(null);
      const res = await fetch('/api/project/active', {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setActiveProject(data.project);
          localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(data.project));

          // Fetch indexed files for this active project
          const filesRes = await fetch(`/api/project/files?projectId=${data.project.id}`, {
            headers: getAuthHeaders(),
          });
          if (filesRes.ok) {
            const filesData = await filesRes.json();
            if (filesData.files && Object.keys(filesData.files).length > 0) {
              setProjectFiles(filesData.files);
              try {
                localStorage.setItem(ACTIVE_PROJECT_FILES_KEY, JSON.stringify(filesData.files));
              } catch {
                // Large files may exceed quota
              }
            }
          }
        } else {
          // If no active project in backend, clear local caches
          setActiveProject(null);
          setProjectFiles({});
          localStorage.removeItem(ACTIVE_PROJECT_KEY);
          localStorage.removeItem(ACTIVE_PROJECT_FILES_KEY);
        }
      }
    } catch (err: any) {
      console.warn('[ActiveProject] Fetch active project error:', err);
      setError(err.message || 'Failed to fetch active project');
    } finally {
      setLoadingActiveProject(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshActiveProject();
  }, [refreshActiveProject]);

  // Upload or set active project
  const uploadAndSetActiveProject = async (
    files: Record<string, string>,
    name: string,
    fileType?: string,
    fileSize?: string,
    fileSizeBytes?: number,
    projectType?: ProjectType | string,
    repoUrl?: string,
    branch?: string
  ): Promise<ActiveProject> => {
    try {
      setError(null);
      setLoadingActiveProject(true);

      const res = await fetch('/api/project/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name,
          originalFileName: name,
          fileType: fileType || 'Source Project',
          fileSize: fileSize || 'Unknown',
          fileSizeBytes: fileSizeBytes || 0,
          projectType: projectType || 'source_project',
          files,
          repoUrl,
          branch: branch || 'main',
          status: 'Ready',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save project');
      }

      const data = await res.json();
      const savedProject: ActiveProject = data.project;

      setActiveProject(savedProject);
      setProjectFiles(files);

      localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(savedProject));
      try {
        localStorage.setItem(ACTIVE_PROJECT_FILES_KEY, JSON.stringify(files));
      } catch {
        // quota exceeded fallback
      }

      return savedProject;
    } catch (err: any) {
      console.error('[ActiveProject] Upload project error:', err);
      setError(err.message || 'Failed to set active project');
      throw err;
    } finally {
      setLoadingActiveProject(false);
    }
  };

  // Remove active project completely
  const removeActiveProject = async (): Promise<void> => {
    try {
      setLoadingActiveProject(true);
      setError(null);

      await fetch('/api/project/remove', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      // Clear all state & local storage
      setActiveProject(null);
      setProjectFiles({});
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
      localStorage.removeItem(ACTIVE_PROJECT_FILES_KEY);
      localStorage.removeItem('bugforge_investigations_data');
    } catch (err: any) {
      console.error('[ActiveProject] Remove project error:', err);
      setError(err.message || 'Failed to remove project');
      // Still reset locally
      setActiveProject(null);
      setProjectFiles({});
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
      localStorage.removeItem(ACTIVE_PROJECT_FILES_KEY);
    } finally {
      setLoadingActiveProject(false);
    }
  };

  // Update specific file in active project
  const updateActiveFile = async (filePath: string, content: string): Promise<void> => {
    setProjectFiles((prev) => {
      const updated = { ...prev, [filePath]: content };
      try {
        localStorage.setItem(ACTIVE_PROJECT_FILES_KEY, JSON.stringify(updated));
      } catch {
        // ignore quota
      }
      return updated;
    });

    if (activeProject) {
      try {
        await fetch('/api/project/save-file', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            projectId: activeProject.id,
            filePath,
            content,
          }),
        });
      } catch (err) {
        console.warn('[ActiveProject] Failed to persist file change to backend:', err);
      }
    }
  };

  const setActiveProjectDirectly = (project: ActiveProject | null, files?: Record<string, string>) => {
    setActiveProject(project);
    if (project) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(project));
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }

    if (files) {
      setProjectFiles(files);
      try {
        localStorage.setItem(ACTIVE_PROJECT_FILES_KEY, JSON.stringify(files));
      } catch {
        // ignore
      }
    } else if (!project) {
      setProjectFiles({});
      localStorage.removeItem(ACTIVE_PROJECT_FILES_KEY);
    }
  };

  return (
    <ActiveProjectContext.Provider
      value={{
        activeProject,
        activeProjectId: activeProject?.id || null,
        projectFiles,
        loadingActiveProject,
        error,
        setProjectFiles,
        uploadAndSetActiveProject,
        removeActiveProject,
        refreshActiveProject,
        updateActiveFile,
        setActiveProjectDirectly,
      }}
    >
      {children}
    </ActiveProjectContext.Provider>
  );
};

export const useActiveProject = (): ActiveProjectContextType => {
  const context = useContext(ActiveProjectContext);
  if (!context) {
    throw new Error('useActiveProject must be used within an ActiveProjectProvider');
  }
  return context;
};
