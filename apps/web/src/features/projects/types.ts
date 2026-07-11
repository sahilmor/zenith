import type { ProjectSummary, ProjectVisibility } from '@pm/types';

export type Project = ProjectSummary;

export interface CreateProjectInput {
  name: string;
  key: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  coverImage?: string | null;
  visibility?: ProjectVisibility;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  coverImage?: string | null;
  visibility?: ProjectVisibility;
  ownerId?: string;
}
