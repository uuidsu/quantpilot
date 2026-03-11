import { Router } from "express";
import { db } from "../db/index.js";
import { loans, loanPayments, loanRateEvents } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/loans?simId=
router.get("/", async (req, res) => {
  const simId = req.query.simId ? Number(req.query.simId) : undefined;
  const rows = simId
    ? await db.select().from(loans).where(eq(loans.simulationId, simId)).orderBy(desc(loans.startDate))
    : await db.select().from(loans).orderBy(desc(loans.startDate));
  res.json(rows);
});

// POST /api/loans
router.post("/", async (req, res) => {
  const { simulationId, name, principal, annualRate, periods, startDate, loanType, notes } = req.body;
  if (!simulationId || !name || !principal || annualRate == null || !periods || !startDate) {
    return res.status(400).json({ error: "缺少必要欄位" });
  }

  const [row] = await db.insert(loans).values({
    simulationId, name, principal, annualRate, periods, startDate,
    loanType: loanType ?? "annuity",
    notes: notes ?? null,
  }).returning();

  res.json(row);
});

// PATCH /api/loans/:id
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [old] = await db.select().from(loans).where(eq(loans.id, id));
  if (!old) return res.status(404).json({ error: "找不到貸款" });

  const updates: Record<string, any> = {};
  for (const key of ["name", "principal", "annualRate", "periods", "startDate", "loanType", "notes"]) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [updated] = await db.update(loans).set(updates).where(eq(loans.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "找不到貸款" });

  res.json(updated);
});

// DELETE /api/loans/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(loans).where(eq(loans.id, id));
  res.json({ ok: true });
});

// ── Loan Payments ───────────────────────────────────────────────

// GET /api/loans/:loanId/payments
router.get("/:loanId/payments", async (req, res) => {
  const loanId = Number(req.params.loanId);
  const rows = await db.select().from(loanPayments).where(eq(loanPayments.loanId, loanId)).orderBy(desc(loanPayments.paymentDate));
  res.json(rows);
});

// POST /api/loans/:loanId/payments
router.post("/:loanId/payments", async (req, res) => {
  const loanId = Number(req.params.loanId);
  const { paymentDate, amount, principalPortion, interestPortion, notes } = req.body;
  if (!paymentDate || amount == null) return res.status(400).json({ error: "缺少必要欄位" });
  const [row] = await db.insert(loanPayments).values({
    loanId, paymentDate, amount,
    principalPortion: principalPortion ?? null,
    interestPortion: interestPortion ?? null,
    notes: notes ?? null,
  }).returning();
  res.json(row);
});

// PATCH /api/loans/payments/:id
router.patch("/payments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updates: Record<string, any> = {};
  for (const key of ["paymentDate", "amount", "principalPortion", "interestPortion", "notes"]) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [updated] = await db.update(loanPayments).set(updates).where(eq(loanPayments.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "找不到還款紀錄" });
  res.json(updated);
});

// DELETE /api/loans/payments/:id
router.delete("/payments/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(loanPayments).where(eq(loanPayments.id, id));
  res.json({ ok: true });
});

// ── Loan Rate Events ────────────────────────────────────────────

// GET /api/loans/:loanId/rate-events
router.get("/:loanId/rate-events", async (req, res) => {
  const loanId = Number(req.params.loanId);
  const rows = await db.select().from(loanRateEvents).where(eq(loanRateEvents.loanId, loanId)).orderBy(loanRateEvents.effectiveDate);
  res.json(rows);
});

// POST /api/loans/:loanId/rate-events
router.post("/:loanId/rate-events", async (req, res) => {
  const loanId = Number(req.params.loanId);
  const { effectiveDate, newRate, notes } = req.body;
  if (!effectiveDate || newRate == null) return res.status(400).json({ error: "缺少必要欄位" });
  const [row] = await db.insert(loanRateEvents).values({ loanId, effectiveDate, newRate, notes: notes ?? null }).returning();
  res.json(row);
});

// DELETE /api/loans/rate-events/:id
router.delete("/rate-events/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(loanRateEvents).where(eq(loanRateEvents.id, id));
  res.json({ ok: true });
});

export default router;
