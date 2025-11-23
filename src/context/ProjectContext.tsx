import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProjectContextType {
  currentProject: string | null;
  selected: string | null;
  setCurrentProject: (projectId: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<string | null>('default');

  return (
    <ProjectContext.Provider value={{ currentProject, selected: currentProject, setCurrentProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
