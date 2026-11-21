import { Workspace } from "@/components/editor/workspace";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Workspace id={id} />;
}
