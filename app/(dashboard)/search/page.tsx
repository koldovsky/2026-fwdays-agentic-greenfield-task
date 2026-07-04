import { verifySession } from "@/app/lib/dal";
import { listFolders } from "@/lib/folders/queries";
import { listTags } from "@/lib/tags/queries";
import { searchNotes } from "@/lib/search/queries";
import { SearchView } from "@/components/notes/search-view";

type SearchPageParams = {
  q?: string;
  folderId?: string;
  tagIds?: string;
  from?: string;
  to?: string;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageParams>;
}) {
  const { userId } = await verifySession();
  const params = await searchParams;
  const tagIds = params.tagIds?.split(",").filter(Boolean) ?? [];

  const [folders, tags, notes] = await Promise.all([
    listFolders(userId),
    listTags(userId),
    searchNotes(userId, {
      query: params.q,
      folderId: params.folderId,
      tagIds,
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
    }),
  ]);

  return (
    <SearchView
      folders={folders}
      tags={tags}
      initialQuery={params.q ?? ""}
      initialFolderId={params.folderId ?? ""}
      initialTagIds={tagIds}
      initialFrom={params.from ?? ""}
      initialTo={params.to ?? ""}
      initialNotes={notes}
    />
  );
}
