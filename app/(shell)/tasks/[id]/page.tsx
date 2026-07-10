import { TaskDetailView } from "@/components/tasks/task-detail-view";

export default async function TaskDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return <TaskDetailView key={id} taskId={id} />;
}
