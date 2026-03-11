import type { Loan, LoanInstallment, LoanPayment, LoanRateEvent, UnifiedTrade } from "./types";
import { todayTW } from "./dateUtils";

/**
 * 等額本息月付金 = P × r × (1+r)^n / ((1+r)^n - 1)
 * r = 月利率, n = 期數
 */
export function computeMonthlyPayment(principal: number, annualRate: number, periods: number): number {
  if (periods <= 0) return 0;
  if (annualRate <= 0) return principal / periods;
  const r = annualRate / 12;
  const factor = Math.pow(1 + r, periods);
  return principal * r * factor / (factor - 1);
}

/**
 * 產生還款明細表（動態版：支援提前還款策略 + 利率調整事件）
 *
 * 提前還款策略（prepaymentStrategy）：
 *   "reduce_payment"：實際還款超出排程後，剩餘期數不變，下期月付重算（變小）
 *   "reduce_term"：維持原月付金額，餘額提早歸零即提早還完
 *
 * 利率調整事件（rateEvents）：
 *   每次利率變動後，月付金以「當時剩餘本金 + 新利率 + 剩餘期數」重算
 *   （無論是哪種提前還款策略，利率變動都會觸發重算）
 *
 * 實際還款紀錄（actualPayments）：
 *   有記錄的期次使用實際 principalPortion；無記錄的期次用排程金額計算
 */
export function generateLoanSchedule(
  loan: Loan,
  rateEvents: LoanRateEvent[] = [],
  actualPayments: LoanPayment[] = [],
): LoanInstallment[] {
  const schedule: LoanInstallment[] = [];

  if (loan.loanType === "interest_only") {
    // 質押：套用利率事件但本金不隨月份減少
    const sortedRates = [...rateEvents].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
    let currentRate = loan.annualRate;
    for (let i = 1; i <= loan.periods; i++) {
      const periodDate = addMonths(loan.startDate, i);
      const prevDate = addMonths(loan.startDate, i - 1);
      for (const re of sortedRates) {
        if (re.effectiveDate > prevDate && re.effectiveDate <= periodDate) {
          currentRate = re.newRate;
        }
      }
      const monthlyInterest = Math.round(loan.principal * (currentRate / 12));
      schedule.push({
        period: i,
        paymentDate: periodDate,
        totalPayment: monthlyInterest,
        principalPortion: 0,
        interestPortion: monthlyInterest,
        remainingBalance: loan.principal,
      });
    }
    return schedule;
  }

  // ── 等額本息（動態計算）─────────────────────────────────────────
  const strategy = (loan.prepaymentStrategy ?? "reduce_payment") as "reduce_payment" | "reduce_term";
  const sortedRates = [...rateEvents].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  const sortedPayments = [...actualPayments].sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));

  let balance = loan.principal;
  let currentRate = loan.annualRate;
  // reduce_term 維持的「目標月付」（利率調整後重算）
  let targetMonthly = computeMonthlyPayment(loan.principal, loan.annualRate, loan.periods);

  for (let i = 1; i <= loan.periods; i++) {
    if (balance < 1) break; // 提早還完

    const periodDate = addMonths(loan.startDate, i);
    const prevDate = addMonths(loan.startDate, i - 1);
    const remaining = loan.periods - i + 1;

    // 套用此期的利率變動（effectiveDate 落在 (prevDate, periodDate] 之間）
    let rateChanged = false;
    for (const re of sortedRates) {
      if (re.effectiveDate > prevDate && re.effectiveDate <= periodDate) {
        currentRate = re.newRate;
        rateChanged = true;
      }
    }

    // 找此期的實際還款（paymentDate 落在 (prevDate, periodDate] 之間）
    const actualPmt = sortedPayments.find(
      p => p.paymentDate > prevDate && p.paymentDate <= periodDate,
    );

    const r = currentRate / 12;
    let interest: number;
    let principalPortion: number;
    let totalPayment: number;

    if (actualPmt) {
      // 使用實際還款資料
      interest = Math.round(balance * r);
      const actualPrincipal = actualPmt.principalPortion != null
        ? actualPmt.principalPortion
        : Math.max(0, actualPmt.amount - interest);
      principalPortion = Math.min(Math.round(actualPrincipal), Math.round(balance));
      totalPayment = actualPmt.amount;

      // 提前還款後，下期月付根據策略決定
      if (strategy === "reduce_payment" || rateChanged) {
        // 剩餘期數不變，月付重算（reduce_payment 和利率調整都走這條）
        targetMonthly = computeMonthlyPayment(
          Math.max(balance - principalPortion, 0),
          currentRate,
          Math.max(remaining - 1, 1),
        );
      }
      // reduce_term：targetMonthly 不變，餘額少了自然提早結束
    } else {
      // 無實際還款：用排程金額
      if (rateChanged) {
        // 利率變動：無論策略都重算月付
        targetMonthly = computeMonthlyPayment(balance, currentRate, remaining);
      } else if (strategy === "reduce_payment") {
        // reduce_payment：每期重算（已含提前還款影響）
        targetMonthly = computeMonthlyPayment(balance, currentRate, remaining);
      }
      // reduce_term：沿用 targetMonthly

      const monthly = Math.min(targetMonthly, balance * (1 + r)); // 不超過剩餘本息
      interest = Math.round(balance * r);
      principalPortion = Math.min(Math.round(monthly - interest), Math.round(balance));
      principalPortion = Math.max(principalPortion, 0);
      totalPayment = monthly;
    }

    balance = Math.max(balance - principalPortion, 0);

    schedule.push({
      period: i,
      paymentDate: periodDate,
      totalPayment: Math.round(totalPayment),
      principalPortion: Math.round(principalPortion),
      interestPortion: Math.round(interest),
      remainingBalance: Math.round(balance),
    });
  }

  return schedule;
}

/**
 * 將貸款轉為 UnifiedTrade 陣列（入帳 + 每期還款）
 */
export function generateLoanTrades(loan: Loan): UnifiedTrade[] {
  const trades: UnifiedTrade[] = [];

  trades.push({
    id: `loan-${loan.id}-0`,
    type: "loan",
    tradeDate: loan.startDate,
    action: "LOAN_IN",
    description: `貸款入帳: ${loan.name}`,
    price: loan.principal,
    quantity: 1,
    fee: 0,
    notes: `${loan.name} ${(loan.annualRate * 100).toFixed(2)}% ${loan.periods}期`,
    raw: loan,
  });

  const schedule = generateLoanSchedule(loan);
  for (const inst of schedule) {
    trades.push({
      id: `loan-${loan.id}-${inst.period}`,
      type: "loan",
      tradeDate: inst.paymentDate,
      action: "LOAN_PAY",
      description: `還款: ${loan.name} #${inst.period}`,
      price: inst.totalPayment,
      quantity: 1,
      fee: inst.interestPortion,
      notes: `本金${inst.principalPortion} 利息${inst.interestPortion} 餘${inst.remainingBalance}`,
      raw: loan,
    });
  }
  return trades;
}

/**
 * 計算貸款總覽
 */
export function computeLoanSummary(loans: Loan[]) {
  let totalPrincipal = 0;
  let totalMonthlyPayment = 0;
  let totalInterest = 0;

  for (const loan of loans) {
    totalPrincipal += loan.principal;
    if (loan.loanType === "interest_only") {
      const monthlyInterest = loan.principal * (loan.annualRate / 12);
      totalMonthlyPayment += monthlyInterest;
      totalInterest += monthlyInterest * loan.periods;
    } else {
      const monthly = computeMonthlyPayment(loan.principal, loan.annualRate, loan.periods);
      totalMonthlyPayment += monthly;
      totalInterest += monthly * loan.periods - loan.principal;
    }
  }

  return {
    totalPrincipal: Math.round(totalPrincipal),
    totalMonthlyPayment: Math.round(totalMonthlyPayment),
    totalInterest: Math.round(totalInterest),
    count: loans.length,
  };
}

/**
 * 計算貸款目前剩餘本金（使用動態排程）
 */
export function computeRemainingBalance(
  loan: Loan,
  totalPaid = 0,
  todayStr?: string,
  rateEvents: LoanRateEvent[] = [],
  actualPayments: LoanPayment[] = [],
): number {
  if (loan.loanType === "interest_only") return Math.max(loan.principal - totalPaid, 0);
  const today = todayStr ?? todayTW();
  const schedule = generateLoanSchedule(loan, rateEvents, actualPayments);
  for (let i = schedule.length - 1; i >= 0; i--) {
    if (schedule[i].paymentDate <= today) {
      return schedule[i].remainingBalance;
    }
  }
  return loan.principal;
}

// ── Helpers ──

function addMonths(yyyymmdd: string, months: number): string {
  const y = parseInt(yyyymmdd.slice(0, 4), 10);
  const m = parseInt(yyyymmdd.slice(4, 6), 10) - 1; // 0-indexed
  const d = parseInt(yyyymmdd.slice(6, 8), 10);

  const date = new Date(y, m + months, 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDay);

  const yy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}
