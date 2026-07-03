import 'dotenv/config';
import { serverEnvSchema } from '@pm/config/env';

export const env = serverEnvSchema.parse(process.env);
