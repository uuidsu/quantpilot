"use client";

import { AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card } from "./ui-elements";
import { motion, AnimatePresence } from "framer-motion";

interface AdvicePanelProps {
  currentLeverage: number;
  limit: number;
}

export function AdvicePanel({ currentLeverage, limit }: AdvicePanelProps) {
  let status: "safe" | "warning" | "danger" = "safe";
  let icon = <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
  let title = "Comfortable Exposure";
  let message =
    "You have room to increase exposure by buying more shares.";
  let bgClass = "bg-emerald-500/10 border-emerald-500/20";
  let textClass = "text-emerald-400";

  if (currentLeverage > limit) {
    status = "danger";
    icon = <AlertCircle className="w-6 h-6 text-destructive" />;
    title = "Margin Call Risk!";
    message =
      "Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.";
    bgClass = "bg-destructive/10 border-destructive/20";
    textClass = "text-destructive";
  } else if (currentLeverage > limit * 0.8) {
    status = "warning";
    icon = <ShieldAlert className="w-6 h-6 text-yellow-500" />;
    title = "Approaching Limit";
    message =
      "Your leverage is getting high. Be cautious with new purchases.";
    bgClass = "bg-yellow-500/10 border-yellow-500/20";
    textClass = "text-yellow-500";
  }

  return (
    <Card className={`p-6 border transition-colors duration-500 ${bgClass}`}>
      <div className="flex items-start gap-4">
        <div className="mt-1">{icon}</div>
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <h4 className={`text-lg font-semibold mb-1 ${textClass}`}>
                {title}
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                {message}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}
