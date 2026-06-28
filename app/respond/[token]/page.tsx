import { EmptyState } from "@/components/states/EmptyState";

/**
 * Placeholder respondent screen (FR-SHELL-02). The real assessment form and AI
 * interview are owned by the respond/form/interview slices; this only proves
 * the sidebar-free centered shell renders. Token validation lands in those
 * slices, so `params` is intentionally unused here.
 */
export default function RespondPage() {
  return <EmptyState />;
}
