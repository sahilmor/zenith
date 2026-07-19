import { Router } from 'express';
import { env } from '../../../config/env.js';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { rateLimit } from '../../../middleware/security.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  clearRecentSearches,
  deleteSavedSearch,
  listRecentSearches,
  listSavedSearches,
  saveSearch,
  searchAnalytics,
  searchSuggestions,
  searchTrending,
  universalSearch,
} from '../controllers/search.controller.js';
import {
  savedSearchParamsSchema,
  savedSearchSchema,
  suggestionsSchema,
  universalSearchSchema,
  workspaceSearchSchema,
} from '../validation/search.validation.js';

export const searchRouter = Router();
const searchRateLimit = rateLimit(env.SEARCH_RATE_LIMIT_MAX, env.SEARCH_RATE_LIMIT_WINDOW_MS);

searchRouter.use(verifyToken);

searchRouter.get('/', searchRateLimit, validate(universalSearchSchema), universalSearch);
searchRouter.get('/suggestions', searchRateLimit, validate(suggestionsSchema), searchSuggestions);
searchRouter.get('/trending', searchRateLimit, validate(workspaceSearchSchema), searchTrending);
searchRouter.get('/recent', validate(workspaceSearchSchema), listRecentSearches);
searchRouter.delete('/recent', validate(workspaceSearchSchema), clearRecentSearches);
searchRouter.get('/saved', validate(workspaceSearchSchema), listSavedSearches);
searchRouter.post('/saved', validate(savedSearchSchema), saveSearch);
searchRouter.delete('/saved/:savedSearchId', validate(savedSearchParamsSchema), deleteSavedSearch);
searchRouter.get('/analytics', validate(workspaceSearchSchema), searchAnalytics);
