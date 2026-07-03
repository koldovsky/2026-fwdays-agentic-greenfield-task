/**
 * TanStack Query hooks for tags. Mutations invalidate both the tags key and the entries
 * key, since entries embed their tags (a rename/delete must reflect on entry rows).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTag, Tag, UpdateTag } from '@honeydo/shared';
import { tagsApi } from '../api/tags';

const KEY = ['tags'] as const;
const ENTRIES_KEY = ['time-entries'] as const;

/** The user's tags, alphabetical (server order). */
export function useTags() {
  return useQuery({ queryKey: KEY, queryFn: tagsApi.list });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTag) => tagsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTag }) =>
      tagsApi.update(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagsApi.remove(id),
    // Optimistically drop the tag from the list; entries refresh via invalidate.
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<Tag[]>(KEY) ?? [];
      qc.setQueryData<Tag[]>(
        KEY,
        prev.filter((tag) => tag.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}
