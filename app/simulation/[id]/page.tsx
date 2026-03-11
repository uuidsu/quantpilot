import { getSimulation } from "@/app/actions";
import { Dashboard } from "@/components/Dashboard";
import { notFound } from "next/navigation";

export default async function SimulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const simId = parseInt(id);
  if (isNaN(simId)) notFound();

  const simulation = await getSimulation(simId);
  if (!simulation) notFound();

  return <Dashboard initialData={simulation} />;
}
