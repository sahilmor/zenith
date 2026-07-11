import type { Types } from 'mongoose';
import { ProjectModel, type ProjectDocument } from '../models/project.model.js';

export class ProjectRepository {
  public async create(input: {
    workspaceId: Types.ObjectId;
    name: string;
    key: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    coverImage?: string | null;
    visibility: 'private' | 'public';
    ownerId: Types.ObjectId;
    createdBy: Types.ObjectId;
  }): Promise<ProjectDocument> {
    return ProjectModel.create(input) as Promise<ProjectDocument>;
  }

  public async findById(projectId: Types.ObjectId): Promise<ProjectDocument | null> {
    return ProjectModel.findById(projectId).exec() as Promise<ProjectDocument | null>;
  }

  public async findByWorkspaceAndKey(
    workspaceId: Types.ObjectId,
    key: string,
  ): Promise<ProjectDocument | null> {
    return ProjectModel.findOne({ workspaceId, key }).exec() as Promise<ProjectDocument | null>;
  }

  public async listByWorkspace(workspaceId: Types.ObjectId): Promise<ProjectDocument[]> {
    return ProjectModel.find({ workspaceId }).sort({ status: 1, updatedAt: -1 }).exec() as Promise<
      ProjectDocument[]
    >;
  }

  public async update(
    projectId: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<ProjectDocument | null> {
    return ProjectModel.findByIdAndUpdate(projectId, update, {
      new: true,
    }).exec() as Promise<ProjectDocument | null>;
  }

  public async delete(projectId: Types.ObjectId): Promise<ProjectDocument | null> {
    return ProjectModel.findByIdAndDelete(projectId).exec() as Promise<ProjectDocument | null>;
  }
}
