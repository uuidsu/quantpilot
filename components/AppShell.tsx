"use client";

import { useState, useEffect } from "react";
import { RefreshCcw } from "lucide-react";
import { listSimulations, createSimulation } from "@/app/actions";
import { Dashboard } from "@/components/Dashboard";
import type { Simulation } from "@/db/schema";

export function AppShell() {
  const [sim, setSim] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const sims = await listSimulations();
      if (sims.length > 0) {
        setSim(sims[0]);
      } else {
        const newSim = await createSimulation();
        setSim(newSim);
      }
      setLoading(false);
    }
    init();
  }, []);

  if (loading || !sim) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return <Dashboard initialData={sim} onSimChange={setSim} />;
}
