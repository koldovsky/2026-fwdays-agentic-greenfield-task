import { FocusSessionView } from "@/components/focus/focus-session-view";

export default async function FocusSessionPage({
  params,
}: Readonly<{
  params: Promise<{ taskId: string }>;
}>) {
  const { taskId } = await params;

  return <FocusSessionView taskId={taskId} />;
}
