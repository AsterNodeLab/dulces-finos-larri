import { NewProject } from "@/components/app/new-project";

export default async function Page({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  return <NewProject initialTemplate={template} />;
}
