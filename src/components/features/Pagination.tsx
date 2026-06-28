"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pagination as DSPagination } from "@/components/ds";

interface PaginationProps {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handlePageChange(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <DSPagination
      page={page}
      totalPages={totalPages}
      onPageChange={handlePageChange}
    />
  );
}
