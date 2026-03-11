import { z } from "zod";

export const holdingSchema = z.object({
  name: z.string().min(1, "請輸入代號"),
  shares: z.number().positive("股數必須大於 0"),
  currentPrice: z.number().min(0),
  costBasis: z.number().min(0),
  beta: z.number().default(1.0),
});

export type HoldingInput = z.infer<typeof holdingSchema>;
