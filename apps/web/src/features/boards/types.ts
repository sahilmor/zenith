import type { BoardSummary, ColumnSummary } from '@pm/types';

export type Board = BoardSummary;
export type BoardColumn = ColumnSummary;

export interface CreateBoardInput {
  name: string;
  description?: string | null;
  isDefault?: boolean;
}

export interface UpdateBoardInput {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
}

export interface CreateColumnInput {
  name: string;
  color?: string | null;
  limit?: number | null;
}

export interface UpdateColumnInput {
  name?: string;
  color?: string | null;
  limit?: number | null;
  archived?: boolean;
}
