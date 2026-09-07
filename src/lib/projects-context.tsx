import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { api } from "./axios";

export interface Block {
  id: string;
  type: "title-page" | "chapter" | "text" | "heading" | "image" | "table";
  content: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: "course" | "essay" | "lab" | "diplom";
  status: "active" | "inProgress" | "done";
  updatedAt: string;
  blocks: Block[];
}

const TYPE_LABELS: Record<string, string> = {
  course: "Курсовая",
  essay: "Эссе",
  lab: "Лабораторная",
  diplom: "Дипломная",
};

export function getTypeLabel(type: string) {
  return TYPE_LABELS[type] || type;
}

const INITIAL_PROJECTS: Project[] = [];

interface ProjectsContextType {
  projects: Project[];
  getProject: (id: string) => Project | undefined;
  createProject: (
    data: Omit<Project, "id" | "updatedAt" | "blocks">,
  ) => Promise<Project | undefined>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  updateBlocks: (projectId: string, blocks: Block[]) => Promise<void>;
  downloadProject: (projectId: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const sanitizeProject = useCallback((p: any): Project => {
    if (!p) return p;
    return {
      ...p,
      blocks: Array.isArray(p.blocks)
        ? p.blocks.filter((b: any) => b !== null && typeof b === "object")
        : [],
    };
  }, []);

  const getProjects = useCallback(async () => {
    try {
      if (!token) return;
      const response = await api.get("projects/");
      const cleanProjects = response.data.map(sanitizeProject);
      setProjects(cleanProjects);
    } catch (error: any) {
      console.error("Failed to fetch projects", error);
    }
  }, [token, sanitizeProject]);

  useEffect(() => {
    if (token) {
      getProjects();
    }
  }, [getProjects, token]);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  );

  const createProject = useCallback(
    async (data: Omit<Project, "id" | "updatedAt" | "blocks">) => {
      try {
        if (!token) return;

        const response = await api.post("projects/", data);

        const cleanProject = sanitizeProject(response.data);
        setProjects((prev) => [cleanProject, ...prev]);

        return cleanProject;
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  const updateProject = useCallback(
    async (id: string, data: Partial<Project>) => {
      try {
        const response = await api.patch(`projects/${id}/`, data);
        const cleanProject = sanitizeProject(response.data);
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? cleanProject : p)),
        );
      } catch (error) {
        throw error;
      }
    },
    [sanitizeProject],
  );

  const deleteProject = useCallback(async (id: string) => {
    try {
      await api.delete(`projects/${id}/`);
      setProjects((prev) => prev.filter((p) => p !== null && p.id !== id));
    } catch (error) {
      console.error("Failed to delete project:", error);
      throw error;
    }
  }, []);

  const downloadProject = useCallback(async (id: string, name: string) => {
    try {
      const response = await api.get(`projects/${id}/download/`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data]);

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

      link.setAttribute("download", `${name}.docx`);

      document.body.appendChild(link);
      link.click();

      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      throw error;
    }
  }, []);

  const updateBlocks = useCallback(
    async (id: string, blocks: Block[]) => {
      try {
        const validBlocks = blocks.filter(Boolean);
        const response = await api.patch(`projects/${id}/`, {
          blocks: validBlocks,
        });
        const cleanProject = sanitizeProject(response.data);

        setProjects((prev) =>
          prev.map((p) => (p.id === id ? cleanProject : p)),
        );
      } catch (error) {
        console.error("Update blocks failed:", error);
        throw error;
      }
    },
    [sanitizeProject],
  );

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        getProject,
        createProject,
        updateProject,
        deleteProject,
        downloadProject,
        updateBlocks,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be inside ProjectsProvider");
  return ctx;
}
