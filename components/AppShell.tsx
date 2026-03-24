"use client";

import { useState, useEffect } from "react";
import { RefreshCcw } from "lucide-react";
import { listSimulations, createSimulation } from "@/app/actions";
import { Dashboard } from "@/components/Dashboard";
import type { Simulation } from "@/db/schema";

export function AppShell() {
  const [sim, setSim] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const sims = await listSimulations();
        if (sims.length > 0) {
          setSim(sims[0]);
        } else {
          const newSim = await createSimulation();
          setSim(newSim);
        }
      } catch (err: any) {
        setError(err.message || "載入失敗");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-semibold text-destructive">發生錯誤</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

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
