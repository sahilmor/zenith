import type { StrategicHealth, StrategicStatus } from '@pm/types';
import type { FilterQuery, Types } from 'mongoose';
import { GoalModel, type GoalDocument } from '../models/goal.model.js';
import { InitiativeModel, type InitiativeDocument } from '../models/initiative.model.js';
import { KeyResultModel, type KeyResultDocument } from '../models/key-result.model.js';
import { PortfolioModel, type PortfolioDocument } from '../models/portfolio.model.js';
import {
  StrategicCheckInModel,
  type StrategicCheckInDocument,
} from '../models/strategic-check-in.model.js';
import { StrategicLinkModel, type StrategicLinkDocument } from '../models/strategic-link.model.js';
import { StrategicStatusUpdateModel } from '../models/strategic-status-update.model.js';

export interface StrategicListFilters {
  readonly workspaceId: Types.ObjectId;
  readonly search?: string;
  readonly status?: StrategicStatus;
  readonly health?: StrategicHealth;
  readonly archived?: boolean;
}

export class GoalRepository {
  public create(input: Record<string, unknown>): Promise<GoalDocument> {
    return GoalModel.create(input) as Promise<GoalDocument>;
  }

  public findById(goalId: Types.ObjectId): Promise<GoalDocument | null> {
    return GoalModel.findById(goalId).exec() as Promise<GoalDocument | null>;
  }

  public list(filters: StrategicListFilters): Promise<GoalDocument[]> {
    return GoalModel.find(toListQuery(filters))
      .sort({ archived: 1, status: 1, targetDate: 1, updatedAt: -1 })
      .limit(1000)
      .exec() as Promise<GoalDocument[]>;
  }

  public listChildren(parentGoalId: Types.ObjectId): Promise<GoalDocument[]> {
    return GoalModel.find({ parentGoalId, archived: false }).exec() as Promise<GoalDocument[]>;
  }

  public update(goalId: Types.ObjectId, update: Record<string, unknown>) {
    return GoalModel.findByIdAndUpdate(goalId, update, {
      new: true,
    }).exec() as Promise<GoalDocument | null>;
  }

  public countActive(workspaceId: Types.ObjectId): Promise<number> {
    return GoalModel.countDocuments({ workspaceId, archived: false }).exec();
  }

  public countByField(workspaceId: Types.ObjectId, field: 'status' | 'health') {
    return GoalModel.aggregate<{ _id: string; count: number }>([
      { $match: { workspaceId, archived: false } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();
  }
}

export class KeyResultRepository {
  public create(input: Record<string, unknown>): Promise<KeyResultDocument> {
    return KeyResultModel.create(input) as Promise<KeyResultDocument>;
  }

  public findById(keyResultId: Types.ObjectId): Promise<KeyResultDocument | null> {
    return KeyResultModel.findById(keyResultId).exec() as Promise<KeyResultDocument | null>;
  }

  public listByGoal(goalId: Types.ObjectId): Promise<KeyResultDocument[]> {
    return KeyResultModel.find({ goalId, archived: false })
      .sort({ targetDate: 1, updatedAt: -1 })
      .exec() as Promise<KeyResultDocument[]>;
  }

  public listByWorkspace(workspaceId: Types.ObjectId): Promise<KeyResultDocument[]> {
    return KeyResultModel.find({ workspaceId, archived: false }).exec() as Promise<
      KeyResultDocument[]
    >;
  }

  public update(keyResultId: Types.ObjectId, update: Record<string, unknown>) {
    return KeyResultModel.findByIdAndUpdate(keyResultId, update, {
      new: true,
    }).exec() as Promise<KeyResultDocument | null>;
  }
}

export class StrategicCheckInRepository {
  public create(input: Record<string, unknown>): Promise<StrategicCheckInDocument> {
    return StrategicCheckInModel.create(input) as Promise<StrategicCheckInDocument>;
  }

  public listByGoal(goalId: Types.ObjectId): Promise<StrategicCheckInDocument[]> {
    return StrategicCheckInModel.find({ goalId })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec() as Promise<StrategicCheckInDocument[]>;
  }
}

export class InitiativeRepository {
  public create(input: Record<string, unknown>): Promise<InitiativeDocument> {
    return InitiativeModel.create(input) as Promise<InitiativeDocument>;
  }

  public findById(initiativeId: Types.ObjectId): Promise<InitiativeDocument | null> {
    return InitiativeModel.findById(initiativeId).exec() as Promise<InitiativeDocument | null>;
  }

  public list(filters: StrategicListFilters): Promise<InitiativeDocument[]> {
    return InitiativeModel.find(toListQuery(filters))
      .sort({ archived: 1, priority: -1, targetDate: 1, updatedAt: -1 })
      .limit(1000)
      .exec() as Promise<InitiativeDocument[]>;
  }

  public update(initiativeId: Types.ObjectId, update: Record<string, unknown>) {
    return InitiativeModel.findByIdAndUpdate(initiativeId, update, {
      new: true,
    }).exec() as Promise<InitiativeDocument | null>;
  }

  public countActive(workspaceId: Types.ObjectId): Promise<number> {
    return InitiativeModel.countDocuments({ workspaceId, archived: false }).exec();
  }

  public countByHealth(workspaceId: Types.ObjectId) {
    return InitiativeModel.aggregate<{ _id: string; count: number }>([
      { $match: { workspaceId, archived: false } },
      { $group: { _id: '$health', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();
  }
}

export class PortfolioRepository {
  public create(input: Record<string, unknown>): Promise<PortfolioDocument> {
    return PortfolioModel.create(input) as Promise<PortfolioDocument>;
  }

  public findById(portfolioId: Types.ObjectId): Promise<PortfolioDocument | null> {
    return PortfolioModel.findById(portfolioId).exec() as Promise<PortfolioDocument | null>;
  }

  public list(filters: StrategicListFilters): Promise<PortfolioDocument[]> {
    return PortfolioModel.find(toListQuery(filters))
      .sort({ archived: 1, status: 1, updatedAt: -1 })
      .limit(1000)
      .exec() as Promise<PortfolioDocument[]>;
  }

  public update(portfolioId: Types.ObjectId, update: Record<string, unknown>) {
    return PortfolioModel.findByIdAndUpdate(portfolioId, update, {
      new: true,
    }).exec() as Promise<PortfolioDocument | null>;
  }

  public countActive(workspaceId: Types.ObjectId): Promise<number> {
    return PortfolioModel.countDocuments({ workspaceId, archived: false }).exec();
  }

  public countByHealth(workspaceId: Types.ObjectId) {
    return PortfolioModel.aggregate<{ _id: string; count: number }>([
      { $match: { workspaceId, archived: false } },
      { $group: { _id: '$health', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();
  }
}

export class StrategicLinkRepository {
  public create(input: Record<string, unknown>): Promise<StrategicLinkDocument> {
    return StrategicLinkModel.create(input) as Promise<StrategicLinkDocument>;
  }

  public findDuplicate(input: {
    workspaceId: Types.ObjectId;
    sourceType: string;
    sourceId: Types.ObjectId;
    targetType: string;
    targetId: Types.ObjectId;
    relationshipType: string;
  }): Promise<StrategicLinkDocument | null> {
    return StrategicLinkModel.findOne(input).exec() as Promise<StrategicLinkDocument | null>;
  }

  public findById(linkId: Types.ObjectId): Promise<StrategicLinkDocument | null> {
    return StrategicLinkModel.findById(linkId).exec() as Promise<StrategicLinkDocument | null>;
  }

  public listForSource(
    workspaceId: Types.ObjectId,
    sourceType: string,
    sourceId: Types.ObjectId,
  ): Promise<StrategicLinkDocument[]> {
    return StrategicLinkModel.find({ workspaceId, sourceType, sourceId }).exec() as Promise<
      StrategicLinkDocument[]
    >;
  }

  public listForTarget(
    workspaceId: Types.ObjectId,
    targetType: string,
    targetId: Types.ObjectId,
  ): Promise<StrategicLinkDocument[]> {
    return StrategicLinkModel.find({ workspaceId, targetType, targetId }).exec() as Promise<
      StrategicLinkDocument[]
    >;
  }

  public listByWorkspace(workspaceId: Types.ObjectId): Promise<StrategicLinkDocument[]> {
    return StrategicLinkModel.find({ workspaceId }).limit(5000).exec() as Promise<
      StrategicLinkDocument[]
    >;
  }

  public async delete(linkId: Types.ObjectId): Promise<StrategicLinkDocument | null> {
    return StrategicLinkModel.findByIdAndDelete(
      linkId,
    ).exec() as Promise<StrategicLinkDocument | null>;
  }
}

export class StrategicStatusUpdateRepository {
  public create(input: Record<string, unknown>) {
    return StrategicStatusUpdateModel.create(input);
  }
}

const toListQuery = (filters: StrategicListFilters): FilterQuery<GoalDocument> => {
  const query: FilterQuery<GoalDocument> = { workspaceId: filters.workspaceId };
  if (filters.archived !== undefined) query.archived = filters.archived;
  else query.archived = false;
  if (filters.status) query.status = filters.status;
  if (filters.health) query.health = filters.health;
  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];
  }
  return query;
};
