export type EntityId = string;

export type ISODateString = string;

export interface ApiEnvelope<TData> {
  readonly data: TData;
  readonly requestId: string;
}
