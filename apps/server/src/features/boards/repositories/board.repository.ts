import type { Types } from 'mongoose';
import { BoardModel, type BoardDocument } from '../models/board.model.js';
import { ColumnModel, type ColumnDocument } from '../models/column.model.js';

export class BoardRepository {
  public async create(input: {
    workspaceId: Types.ObjectId;
    projectId: Types.ObjectId;
    name: string;
    description?: string | null;
    isDefault?: boolean;
    createdBy: Types.ObjectId;
  }): Promise<BoardDocument> {
    return BoardModel.create(input) as Promise<BoardDocument>;
  }

  public async findById(boardId: Types.ObjectId): Promise<BoardDocument | null> {
    return BoardModel.findById(boardId).exec() as Promise<BoardDocument | null>;
  }

  public async listByProject(projectId: Types.ObjectId): Promise<BoardDocument[]> {
    return BoardModel.find({ projectId }).sort({ archived: 1, updatedAt: -1 }).exec() as Promise<
      BoardDocument[]
    >;
  }

  public async update(
    boardId: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<BoardDocument | null> {
    return BoardModel.findByIdAndUpdate(boardId, update, {
      new: true,
    }).exec() as Promise<BoardDocument | null>;
  }
}

export class ColumnRepository {
  public async create(input: {
    boardId: Types.ObjectId;
    name: string;
    color?: string | null;
    order: number;
    limit?: number | null;
  }): Promise<ColumnDocument> {
    return ColumnModel.create(input) as Promise<ColumnDocument>;
  }

  public async insertMany(
    columns: {
      boardId: Types.ObjectId;
      name: string;
      color?: string | null;
      order: number;
      limit?: number | null;
    }[],
  ): Promise<ColumnDocument[]> {
    return ColumnModel.insertMany(columns) as Promise<ColumnDocument[]>;
  }

  public async findById(columnId: Types.ObjectId): Promise<ColumnDocument | null> {
    return ColumnModel.findById(columnId).exec() as Promise<ColumnDocument | null>;
  }

  public async listByBoard(boardId: Types.ObjectId): Promise<ColumnDocument[]> {
    return ColumnModel.find({ boardId }).sort({ order: 1 }).exec() as Promise<ColumnDocument[]>;
  }

  public async nextOrder(boardId: Types.ObjectId): Promise<number> {
    const column = await ColumnModel.findOne({ boardId }).sort({ order: -1 }).exec();
    return column ? column.order + 1 : 0;
  }

  public async update(
    columnId: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<ColumnDocument | null> {
    return ColumnModel.findByIdAndUpdate(columnId, update, {
      new: true,
    }).exec() as Promise<ColumnDocument | null>;
  }

  public async updateOrder(columnId: Types.ObjectId, order: number): Promise<void> {
    await ColumnModel.updateOne({ _id: columnId }, { order }).exec();
  }
}
