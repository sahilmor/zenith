import {
  ActivityEventModel,
  type CreateActivityEventInput,
} from '../models/activity-event.model.js';

export class ActivityService {
  public async record(input: CreateActivityEventInput): Promise<void> {
    await ActivityEventModel.create(input);
  }
}
