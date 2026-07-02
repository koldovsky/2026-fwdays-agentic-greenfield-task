/**
 * Tags REST client — thin typed wrappers over `apiRequest` (bearer auth + refresh handled
 * there). Contract shapes come from `@honeydo/shared`.
 */
import type { CreateTag, Tag, UpdateTag } from '@honeydo/shared';
import { apiRequest } from './client';

export const tagsApi = {
  list: () => apiRequest<Tag[]>('/tags'),

  create: (body: CreateTag) =>
    apiRequest<Tag>('/tags', { method: 'POST', body }),

  update: (id: string, body: UpdateTag) =>
    apiRequest<Tag>(`/tags/${id}`, { method: 'PATCH', body }),

  remove: (id: string) => apiRequest<void>(`/tags/${id}`, { method: 'DELETE' }),
};
