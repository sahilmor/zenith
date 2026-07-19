import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { UnauthorizedError } from '../../../utils/app-error.js';
import { searchService } from '../services/search.service.js';
import type { SuggestionsQuery, UniversalSearchQuery } from '../validation/search.validation.js';

const requireUserId = (request: Parameters<RequestHandler>[0]): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

export const universalSearch = asyncHandler(async (request, response) => {
  const result = await searchService.search(
    requireUserId(request),
    request.query as unknown as UniversalSearchQuery,
  );
  sendSuccess(response, 200, 'Search completed', result);
});

export const searchSuggestions = asyncHandler(async (request, response) => {
  const suggestions = await searchService.suggestions(
    requireUserId(request),
    request.query as unknown as SuggestionsQuery,
  );
  sendSuccess(response, 200, 'Search suggestions retrieved', suggestions);
});

export const searchTrending = asyncHandler(async (request, response) => {
  const results = await searchService.trending(
    requireUserId(request),
    new Types.ObjectId(request.query.workspaceId as string),
  );
  sendSuccess(response, 200, 'Trending content retrieved', results);
});

export const saveSearch = asyncHandler(async (request, response) => {
  const saved = await searchService.saveSearch(requireUserId(request), request.body);
  sendSuccess(response, 201, 'Search saved', saved);
});

export const listSavedSearches = asyncHandler(async (request, response) => {
  const saved = await searchService.listSavedSearches(
    requireUserId(request),
    new Types.ObjectId(request.query.workspaceId as string),
  );
  sendSuccess(response, 200, 'Saved searches retrieved', saved);
});

export const deleteSavedSearch = asyncHandler(async (request, response) => {
  await searchService.deleteSavedSearch(
    new Types.ObjectId(request.params.savedSearchId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Saved search deleted');
});

export const listRecentSearches = asyncHandler(async (request, response) => {
  const recent = await searchService.listRecent(
    requireUserId(request),
    new Types.ObjectId(request.query.workspaceId as string),
  );
  sendSuccess(response, 200, 'Recent searches retrieved', recent);
});

export const clearRecentSearches = asyncHandler(async (request, response) => {
  await searchService.clearRecent(
    requireUserId(request),
    new Types.ObjectId(request.query.workspaceId as string),
  );
  sendSuccess(response, 200, 'Recent searches cleared');
});

export const searchAnalytics = asyncHandler(async (request, response) => {
  const analytics = await searchService.analytics(
    requireUserId(request),
    new Types.ObjectId(request.query.workspaceId as string),
  );
  sendSuccess(response, 200, 'Search analytics retrieved', analytics);
});
