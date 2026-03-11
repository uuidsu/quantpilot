import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, RefreshCcw, Trash2, Pencil, X, ChevronRight } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useSimulation } from "@/hooks/useSimulation";
import { useHoldings } from "@/hooks/useHoldings";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { getOptionsTargetMatches, createOptionsTarget, deleteOptionsTarget } from "@/services/api";
import { computeHoldings } from "@shared/optionsTrades";
import { buildUnifiedAccounts } from "@shared/accounts";
import { computeMonthlyPayment } from "@shared/loan";
import { SearchSheet } from "@/components/SearchSheet";
import { Card } from "@/components/Card";
import { colors } from "@/constants/theme";
import type { SearchResult, OptionsTargetMatch, Holding } from "@/types";

export default function AccountScreen() {
  const { sim, updateSim } = useSimulation();
  const { holdings, add, update, remove, fetchPrice } = useHoldings(sim?.id);
  const {
    optionsTrades, stockTrades, loans: loansList,
    addStockTrade, addOptionsTrade, addLoan, removeLoan, refresh: refreshTrades,
  } = useTradeHistory(sim?.id);
  const [targetMatches, setTargetMatches] = useState<OptionsTargetMatch[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddForm, setShowAddForm] = useState<"options_target" | "loan" | null>(null);
  const [otForm, setOtForm] = useState({ action: "SELL" as "SELL" | "BUY", callPut: "P" as "C" | "P", targetDelta: "0.15", contractMonth: "", quantity: "1" });
  const [loanForm, setLoanForm] = useState({ name: "", principal: "", annualRate: "", periods: "", startDate: new Date().toISOString().slice(0, 10).replace(/-/g, "") });
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editField, setEditField] = useState<"shares" | "beta" | null>(null);
  const [editValue, setEditValue] = useState("");

  // Account expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [accountTradeForm, setAccountTradeForm] = useState<"stock" | "options" | null>(null);
  const [stkTradeForm, setStkTradeForm] = useState({
    tradeDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    action: "BUY" as "BUY" | "SELL", price: "", quantity: "", fee: "0",
  });
  const [optTradeForm, setOptTradeForm] = useState({
    tradeDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    action: "BUY" as "BUY" | "SELL", contractMonth: "", callPut: "P" as "C" | "P",
    strikePrice: "", price: "", quantity: "1", fee: "0",
  });

  // Cash
  const [cashInput, setCashInput] = useState("0");
  const [savingCash, setSavingCash] = useState(false);
  const cash = 0;

  useEffect(() => {
    if (sim?.id) {
      getOptionsTargetMatches(sim.id).then(setTargetMatches).catch(() => { });
    }
  }, [sim?.id]);

  const optHoldings = computeHoldings(optionsTrades);

  const accounts = buildUnifiedAccounts({
    positions: holdings as any,
    optionsTargetMatches: targetMatches,
    optionsHoldings: optHoldings as any,
    loans: loansList,
    stockTrades,
    optionsTrades,
  });

  const toggleAccount = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
    setAccountTradeForm(null);
  };

  const handleAddStock = async (result: SearchResult) => {
    if (addingSymbol) return;
    setAddingSymbol(result.symbol);
    try {
      const created = await add(result.symbol);
      if (!created) return;
      try {
        const { holding, fromCache } = await fetchPrice(created);
        Toast.show({ type: "success", text1: `${result.symbol} $${holding.currentPrice}`, text2: fromCache ? "使用快取價格" : undefined });
      } catch (err) {
        Toast.show({ type: "error", text1: err instanceof Error ? err.message : "股價撈取失敗" });
      }
    } catch (err) {
      Toast.show({ type: "error", text1: err instanceof Error ? err.message : "加入失敗" });
    } finally {
      setAddingSymbol(null);
    }
  };

  const handleFetchPrice = async (h: Holding) => {
    setFetchingId(h.id);
    try {
      const { fromCache } = await fetchPrice(h);
      Toast.show({ type: "success", text1: fromCache ? `${h.name} 使用快取` : `${h.name} 已更新` });
    } catch (err) {
      Toast.show({ type: "error", text1: err instanceof Error ? err.message : "撈取失敗" });
    } finally {
      setFetchingId(null);
    }
  };

  const startEdit = (id: number, field: "shares" | "beta", current: number) => {
    setEditId(id);
    setEditField(field);
    setEditValue(String(current));
  };

  const commitEdit = async () => {
    if (editId == null || !editField) return;
    const val = parseFloat(editValue);
    if (isNaN(val)) { setEditId(null); setEditField(null); return; }
    try {
      await update(editId, { [editField]: val });
    } catch {
      Toast.show({ type: "error", text1: "更新失敗" });
    }
    setEditId(null);
    setEditField(null);
  };

  const handleSaveCash = async () => {
    const val = parseFloat(cashInput);
    if (isNaN(val)) return;
    setSavingCash(true);
    try {
      // no-op, cash is computed, not stored on sim anymore
      console.log("cash update skipped", val);
      Toast.show({ type: "success", text1: "現金已更新" });
    } catch {
      Toast.show({ type: "error", text1: "儲存失敗" });
    } finally {
      setSavingCash(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>帳戶</Text>
          <Text style={styles.headerSub}>{accounts.length} 個帳戶</Text>
        </View>
        <Pressable
          onPress={() => setShowAddMenu(true)}
          disabled={!!addingSymbol}
          style={[styles.addBtn, addingSymbol ? { opacity: 0.5 } : null]}
        >
          {addingSymbol ? (
            <><RefreshCcw size={14} color={colors.primary} /><Text style={styles.addBtnText}>加入中…</Text></>
          ) : (
            <><Plus size={14} color={colors.primary} /><Text style={styles.addBtnText}>新增</Text></>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {accounts.map(acct => {
          const isExpanded = expandedId === acct.id;

          {/* ── Cash Account ── */ }
          if (acct.type === "cash") {
            return (
              <Card key={acct.id} style={styles.accountCard}>
                <Pressable onPress={() => toggleAccount(acct.id)} style={styles.accountRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>$</Text>
                    <View>
                      <Text style={styles.accountLabel}>現金</Text>
                      <Text style={styles.accountSub}>負數代表負債</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.accountValue, { color: cash >= 0 ? "#10b981" : "#ef4444" }]}>
                      ${Math.abs(cash).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </Text>
                    <ChevronRight size={16} color={colors.mutedForeground} style={isExpanded ? { transform: [{ rotate: "90deg" }] } : undefined} />
                  </View>
                </Pressable>
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        value={cashInput} onChangeText={setCashInput} placeholder="0"
                        placeholderTextColor={colors.mutedForeground} keyboardType="numeric" style={styles.cashInput}
                      />
                      <Pressable style={styles.cashSaveBtn} onPress={handleSaveCash} disabled={savingCash}>
                        {savingCash ? <ActivityIndicator size="small" color={colors.foreground} /> : <Text style={styles.cashSaveBtnText}>儲存</Text>}
                      </Pressable>
                    </View>
                  </View>
                )}
              </Card>
            );
          }

          {/* ── Stock Account ── */ }
          if (acct.type === "stock") {
            const h: Holding = (acct.data as any).position || (acct.data as any).holding;
            if (!h.name && (h as any).symbol) h.name = (h as any).symbol;
            const trades = acct.data.trades ?? [];
            const marketValue = h.shares * h.currentPrice;
            const isFetching = fetchingId === h.id;

            return (
              <Card key={acct.id} style={styles.accountCard}>
                <Pressable onPress={() => toggleAccount(acct.id)} style={styles.accountRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>📈</Text>
                    <View>
                      <Text style={styles.accountLabel}>{h.name}</Text>
                      <Text style={styles.accountSub}>{acct.subtitle}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.accountValue}>${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                    <ChevronRight size={16} color={colors.mutedForeground} style={isExpanded ? { transform: [{ rotate: "90deg" }] } : undefined} />
                  </View>
                </Pressable>
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {/* Details */}
                    <View style={styles.fieldRow}>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>股數</Text>
                        {editId === h.id && editField === "shares" ? (
                          <TextInput value={editValue} onChangeText={setEditValue} onBlur={commitEdit}
                            onSubmitEditing={commitEdit} keyboardType="numeric" autoFocus style={styles.fieldInput} />
                        ) : (
                          <Pressable onPress={() => startEdit(h.id, "shares", h.shares)} style={styles.editableRow}>
                            <Text style={styles.fieldValue}>{h.shares} 股</Text>
                            <Pencil size={10} color={colors.mutedForeground} />
                          </Pressable>
                        )}
                      </View>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Beta</Text>
                        {editId === h.id && editField === "beta" ? (
                          <TextInput value={editValue} onChangeText={setEditValue} onBlur={commitEdit}
                            onSubmitEditing={commitEdit} keyboardType="numeric" autoFocus style={[styles.fieldInput, { borderColor: colors.blue + "66" }]} />
                        ) : (
                          <Pressable onPress={() => startEdit(h.id, "beta", h.beta ?? 1.0)} style={styles.editableRow}>
                            <Text style={styles.fieldValue}>{(h.beta ?? 1.0).toFixed(2)}</Text>
                            <Pencil size={10} color={colors.mutedForeground} />
                          </Pressable>
                        )}
                      </View>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>現價</Text>
                        <Text style={styles.fieldValue}>${h.currentPrice.toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* Trade History */}
                    {trades.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.sectionLabel}>交易記錄</Text>
                        {trades.slice().sort((a: any, b: any) => b.tradeDate.localeCompare(a.tradeDate)).map((t: any) => (
                          <View key={t.id} style={styles.tradeRow}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={{ fontSize: 10, fontFamily: "monospace", color: colors.mutedForeground }}>
                                {t.tradeDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1/$2/$3")}
                              </Text>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: t.action === "BUY" ? "#10b981" : "#ef4444" }}>{t.action}</Text>
                            </View>
                            <Text style={{ fontSize: 11, fontFamily: "monospace", color: colors.foreground }}>
                              {t.quantity}股 ${t.price.toLocaleString()}{t.fee > 0 ? ` 費$${t.fee}` : ""}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Add Stock Trade Form */}
                    {accountTradeForm === "stock" && (
                      <View style={styles.tradeFormContainer}>
                        <Text style={styles.sectionLabel}>新增交易</Text>
                        <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                          {(["BUY", "SELL"] as const).map(a => (
                            <Pressable key={a} onPress={() => setStkTradeForm(f => ({ ...f, action: a }))}
                              style={[styles.chip, stkTradeForm.action === a && (a === "BUY" ? styles.chipGreenActive : styles.chipRedActive)]}>
                              <Text style={[styles.chipText, stkTradeForm.action === a && { color: a === "BUY" ? "#10b981" : "#ef4444" }]}>{a}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>日期</Text>
                            <TextInput value={stkTradeForm.tradeDate} onChangeText={v => setStkTradeForm(f => ({ ...f, tradeDate: v }))}
                              keyboardType="numeric" style={styles.formInput} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>價格</Text>
                            <TextInput value={stkTradeForm.price} onChangeText={v => setStkTradeForm(f => ({ ...f, price: v }))}
                              keyboardType="numeric" style={styles.formInput} />
                          </View>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>股數</Text>
                            <TextInput value={stkTradeForm.quantity} onChangeText={v => setStkTradeForm(f => ({ ...f, quantity: v }))}
                              keyboardType="numeric" style={styles.formInput} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>手續費</Text>
                            <TextInput value={stkTradeForm.fee} onChangeText={v => setStkTradeForm(f => ({ ...f, fee: v }))}
                              keyboardType="numeric" style={styles.formInput} />
                          </View>
                        </View>
                        <Pressable style={styles.submitBtn} onPress={async () => {
                          const price = parseFloat(stkTradeForm.price);
                          const qty = parseInt(stkTradeForm.quantity);
                          if (!price || !qty) { Toast.show({ type: "error", text1: "請填寫價格與股數" }); return; }
                          try {
                            await addStockTrade({
                              tradeDate: stkTradeForm.tradeDate, action: stkTradeForm.action,
                              symbol: h.name, price, quantity: qty, fee: parseFloat(stkTradeForm.fee) || 0,
                            });
                            setAccountTradeForm(null);
                            setStkTradeForm(f => ({ ...f, price: "", quantity: "", fee: "0" }));
                            refreshTrades();
                            Toast.show({ type: "success", text1: "交易已新增" });
                          } catch { Toast.show({ type: "error", text1: "新增失敗" }); }
                        }}>
                          <Text style={styles.submitBtnText}>確認新增</Text>
                        </Pressable>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                      <Pressable onPress={() => setAccountTradeForm(accountTradeForm === "stock" ? null : "stock")} style={styles.actionBtn}>
                        <Plus size={12} color={colors.primary} />
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>新增交易</Text>
                      </Pressable>
                      <Pressable onPress={() => handleFetchPrice(h)} disabled={isFetching} style={styles.actionBtn}>
                        <RefreshCcw size={12} color={colors.foreground} />
                        <Text style={styles.actionBtnText}>更新價格</Text>
                      </Pressable>
                      <Pressable onPress={async () => { await remove(h.id); Toast.show({ type: "success", text1: `已刪除 ${h.name}` }); }} style={styles.actionBtn}>
                        <Trash2 size={12} color="#ef4444" />
                        <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>刪除</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </Card>
            );
          }

          {/* ── Options Account ── */ }
          if (acct.type === "options") {
            const targetMatch = acct.data.targetMatch ?? null;
            const holding = acct.data.holding ?? null;
            const trades = acct.data.trades ?? [];

            return (
              <Card key={acct.id} style={styles.accountCard}>
                <Pressable onPress={() => toggleAccount(acct.id)} style={styles.accountRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>🎯</Text>
                    <View>
                      <Text style={styles.accountLabel}>{acct.label}</Text>
                      <Text style={styles.accountSub}>{acct.subtitle}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {holding && (
                      <Text style={[styles.accountValue, { color: holding.netQuantity > 0 ? "#10b981" : "#ef4444" }]}>
                        {holding.netQuantity > 0 ? "+" : ""}{holding.netQuantity}口
                      </Text>
                    )}
                    <ChevronRight size={16} color={colors.mutedForeground} style={isExpanded ? { transform: [{ rotate: "90deg" }] } : undefined} />
                  </View>
                </Pressable>
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {/* Target match details */}
                    {targetMatch && targetMatch.matchedStrike != null && (
                      <View style={styles.fieldRow}>
                        <View style={styles.field}>
                          <Text style={styles.fieldLabel}>履約價</Text>
                          <Text style={styles.fieldValue}>{targetMatch.matchedStrike.toLocaleString()}</Text>
                        </View>
                        <View style={styles.field}>
                          <Text style={styles.fieldLabel}>Delta</Text>
                          <Text style={styles.fieldValue}>{targetMatch.matchedDelta?.toFixed(4)}</Text>
                        </View>
                        <View style={styles.field}>
                          <Text style={styles.fieldLabel}>收盤</Text>
                          <Text style={styles.fieldValue}>{targetMatch.matchedPrice?.toFixed(1) ?? "-"}</Text>
                        </View>
                      </View>
                    )}
                    {/* Holding info */}
                    {holding && (
                      <View style={[styles.fieldRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
                        <View style={styles.field}>
                          <Text style={styles.fieldLabel}>口數</Text>
                          <Text style={[styles.fieldValue, { color: holding.netQuantity > 0 ? "#10b981" : "#ef4444" }]}>
                            {holding.netQuantity > 0 ? "+" : ""}{holding.netQuantity}
                          </Text>
                        </View>
                        <View style={styles.field}>
                          <Text style={styles.fieldLabel}>均價</Text>
                          <Text style={styles.fieldValue}>{holding.avgCost.toFixed(1)}</Text>
                        </View>
                        <View style={styles.field}>
                          <Text style={styles.fieldLabel}>成本</Text>
                          <Text style={styles.fieldValue}>{holding.totalCost.toLocaleString()}</Text>
                        </View>
                      </View>
                    )}
                    {targetMatch?.lastMarketDate && (
                      <Text style={{ fontSize: 9, color: colors.mutedForeground, marginTop: 4 }}>
                        最後市場日 {targetMatch.lastMarketDate}{targetMatch.lastFetchedAt ? ` · 拉取於 ${new Date(targetMatch.lastFetchedAt).toLocaleString("zh-TW")}` : ""}
                      </Text>
                    )}

                    {/* Trade History */}
                    {trades.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.sectionLabel}>交易記錄</Text>
                        {trades.slice().sort((a: any, b: any) => b.tradeDate.localeCompare(a.tradeDate)).map((t: any) => (
                          <View key={t.id} style={styles.tradeRow}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={{ fontSize: 10, fontFamily: "monospace", color: colors.mutedForeground }}>
                                {t.tradeDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1/$2/$3")}
                              </Text>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: t.action === "BUY" ? "#10b981" : "#ef4444" }}>{t.action}</Text>
                            </View>
                            <Text style={{ fontSize: 11, fontFamily: "monospace", color: colors.foreground }}>
                              {t.quantity}口 ${t.price.toLocaleString()}{t.fee > 0 ? ` 費$${t.fee}` : ""}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Add Options Trade Form */}
                    {accountTradeForm === "options" && (
                      <View style={styles.tradeFormContainer}>
                        <Text style={styles.sectionLabel}>新增交易</Text>
                        <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                          {(["BUY", "SELL"] as const).map(a => (
                            <Pressable key={a} onPress={() => setOptTradeForm(f => ({ ...f, action: a }))}
                              style={[styles.chip, optTradeForm.action === a && (a === "BUY" ? styles.chipGreenActive : styles.chipRedActive)]}>
                              <Text style={[styles.chipText, optTradeForm.action === a && { color: a === "BUY" ? "#10b981" : "#ef4444" }]}>{a}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>日期</Text>
                            <TextInput value={optTradeForm.tradeDate} onChangeText={v => setOptTradeForm(f => ({ ...f, tradeDate: v }))}
                              keyboardType="numeric" style={styles.formInput} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>合約月</Text>
                            <TextInput value={optTradeForm.contractMonth} onChangeText={v => setOptTradeForm(f => ({ ...f, contractMonth: v }))}
                              style={styles.formInput} />
                          </View>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>C/P</Text>
                            <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                              {(["P", "C"] as const).map(cp => (
                                <Pressable key={cp} onPress={() => setOptTradeForm(f => ({ ...f, callPut: cp }))}
                                  style={[styles.chip, { flex: 1 }, optTradeForm.callPut === cp && (cp === "P" ? styles.chipRedActive : styles.chipGreenActive)]}>
                                  <Text style={[styles.chipText, optTradeForm.callPut === cp && { color: cp === "P" ? "#ef4444" : "#10b981" }]}>{cp === "P" ? "Put" : "Call"}</Text>
                                </Pressable>
                              ))}
                            </View>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>履約價</Text>
                            <TextInput value={optTradeForm.strikePrice} onChangeText={v => setOptTradeForm(f => ({ ...f, strikePrice: v }))}
                              keyboardType="numeric" style={styles.formInput} />
                          </View>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>價格</Text>
                            <TextInput value={optTradeForm.price} onChangeText={v => setOptTradeForm(f => ({ ...f, price: v }))}
                              keyboardType="numeric" style={styles.formInput} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>口數</Text>
                            <TextInput value={optTradeForm.quantity} onChangeText={v => setOptTradeForm(f => ({ ...f, quantity: v }))}
                              keyboardType="numeric" style={styles.formInput} />
                          </View>
                        </View>
                        <Pressable style={styles.submitBtn} onPress={async () => {
                          const price = parseFloat(optTradeForm.price);
                          const strike = parseFloat(optTradeForm.strikePrice);
                          const qty = parseInt(optTradeForm.quantity);
                          if (!price || !strike || !qty || !optTradeForm.contractMonth) {
                            Toast.show({ type: "error", text1: "請填寫完整" }); return;
                          }
                          try {
                            await addOptionsTrade({
                              tradeDate: optTradeForm.tradeDate, action: optTradeForm.action,
                              contractMonth: optTradeForm.contractMonth, callPut: optTradeForm.callPut,
                              strikePrice: strike, price, quantity: qty, fee: parseFloat(optTradeForm.fee) || 0,
                            });
                            setAccountTradeForm(null);
                            setOptTradeForm(f => ({ ...f, strikePrice: "", price: "", quantity: "1", fee: "0" }));
                            refreshTrades();
                            Toast.show({ type: "success", text1: "交易已新增" });
                          } catch { Toast.show({ type: "error", text1: "新增失敗" }); }
                        }}>
                          <Text style={styles.submitBtnText}>確認新增</Text>
                        </Pressable>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                      <Pressable onPress={() => {
                        setAccountTradeForm(accountTradeForm === "options" ? null : "options");
                        if (targetMatch) {
                          setOptTradeForm(f => ({
                            ...f, contractMonth: targetMatch.matchedContractMonth ?? "",
                            callPut: targetMatch.target.callPut, strikePrice: targetMatch.matchedStrike?.toString() ?? "",
                          }));
                        } else if (holding) {
                          setOptTradeForm(f => ({
                            ...f, contractMonth: holding.contractMonth, callPut: holding.callPut as "C" | "P",
                            strikePrice: holding.strikePrice.toString(),
                          }));
                        }
                      }} style={styles.actionBtn}>
                        <Plus size={12} color={colors.primary} />
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>新增交易</Text>
                      </Pressable>
                      {targetMatch && (
                        <Pressable onPress={async () => {
                          await deleteOptionsTarget(targetMatch.target.id);
                          if (sim?.id) getOptionsTargetMatches(sim.id).then(setTargetMatches).catch(() => { });
                        }} style={styles.actionBtn}>
                          <Trash2 size={12} color="#ef4444" />
                          <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>刪除帳戶</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </Card>
            );
          }

          {/* ── Loan Account ── */ }
          if (acct.type === "loan") {
            const loan = acct.data.loan;
            const monthly = acct.data.monthly;
            const remaining = acct.data.remaining;

            return (
              <Card key={acct.id} style={styles.accountCard}>
                <Pressable onPress={() => toggleAccount(acct.id)} style={styles.accountRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>⚠️</Text>
                    <View>
                      <Text style={styles.accountLabel}>{loan.name}</Text>
                      <Text style={styles.accountSub}>月付 ${Math.round(monthly).toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.accountValue, { color: "#ef4444" }]}>餘${remaining.toLocaleString()}</Text>
                    <ChevronRight size={16} color={colors.mutedForeground} style={isExpanded ? { transform: [{ rotate: "90deg" }] } : undefined} />
                  </View>
                </Pressable>
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.fieldRow}>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>餘額</Text>
                        <Text style={[styles.fieldValue, { color: "#ef4444" }]}>${remaining.toLocaleString()}</Text>
                      </View>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>本金</Text>
                        <Text style={styles.fieldValue}>${loan.principal.toLocaleString()}</Text>
                      </View>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>利率</Text>
                        <Text style={styles.fieldValue}>{(loan.annualRate * 100).toFixed(1)}%</Text>
                      </View>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>月付</Text>
                        <Text style={styles.fieldValue}>${Math.round(monthly).toLocaleString()}</Text>
                      </View>
                    </View>
                    <View style={styles.actionRow}>
                      <Pressable onPress={async () => {
                        await removeLoan(loan.id);
                        Toast.show({ type: "success", text1: `已刪除 ${loan.name}` });
                      }} style={styles.actionBtn}>
                        <Trash2 size={12} color="#ef4444" />
                        <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>刪除</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </Card>
            );
          }

          return null;
        })}
      </ScrollView>

      <SearchSheet
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onSelect={handleAddStock}
      />

      {/* Add Menu Bottom Sheet */}
      <Modal visible={showAddMenu} transparent animationType="fade" onRequestClose={() => setShowAddMenu(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowAddMenu(false)}>
          <Pressable style={styles.sheet} onPress={() => { }}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>新增帳戶</Text>
              <Pressable onPress={() => setShowAddMenu(false)} hitSlop={12}><X size={20} color={colors.mutedForeground} /></Pressable>
            </View>
            {([
              { key: "stock" as const, label: "持股", desc: "新增股票 ETF" },
              { key: "options_target" as const, label: "選擇權策略", desc: "追蹤目標 Delta" },
              { key: "loan" as const, label: "貸款", desc: "信貸、房貸等" },
            ]).map(item => (
              <Pressable
                key={item.key}
                style={styles.menuRow}
                onPress={() => {
                  setShowAddMenu(false);
                  if (item.key === "stock") setShowSearch(true);
                  else setShowAddForm(item.key);
                }}
              >
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{item.label}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{item.desc}</Text>
                </View>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Options Target Form */}
      <Modal visible={showAddForm === "options_target"} transparent animationType="slide" onRequestClose={() => setShowAddForm(null)}>
        <Pressable style={styles.overlay} onPress={() => setShowAddForm(null)}>
          <Pressable style={styles.formSheet} onPress={() => { }}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>新增選擇權策略</Text>
              <Pressable onPress={() => setShowAddForm(null)} hitSlop={12}><X size={20} color={colors.mutedForeground} /></Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {(["SELL", "BUY"] as const).map(a => (
                <Pressable key={a} onPress={() => setOtForm(f => ({ ...f, action: a }))}
                  style={[styles.chip, otForm.action === a && (a === "SELL" ? styles.chipRedActive : styles.chipGreenActive)]}>
                  <Text style={[styles.chipText, otForm.action === a && { color: a === "SELL" ? "#ef4444" : "#10b981" }]}>{a}</Text>
                </Pressable>
              ))}
              {(["P", "C"] as const).map(cp => (
                <Pressable key={cp} onPress={() => setOtForm(f => ({ ...f, callPut: cp }))}
                  style={[styles.chip, otForm.callPut === cp && (cp === "P" ? styles.chipRedActive : styles.chipGreenActive)]}>
                  <Text style={[styles.chipText, otForm.callPut === cp && { color: cp === "P" ? "#ef4444" : "#10b981" }]}>{cp === "P" ? "Put" : "Call"}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>目標 Delta</Text>
                <TextInput value={otForm.targetDelta} onChangeText={v => setOtForm(f => ({ ...f, targetDelta: v }))}
                  keyboardType="numeric" style={styles.formInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>口數</Text>
                <TextInput value={otForm.quantity} onChangeText={v => setOtForm(f => ({ ...f, quantity: v }))}
                  keyboardType="numeric" style={styles.formInput} />
              </View>
            </View>
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.fieldLabel}>合約月份（空白=最近月）</Text>
              <TextInput value={otForm.contractMonth} onChangeText={v => setOtForm(f => ({ ...f, contractMonth: v }))}
                placeholder="如 202604" placeholderTextColor={colors.mutedForeground} style={styles.formInput} />
            </View>
            <Pressable
              style={styles.submitBtn}
              onPress={async () => {
                const delta = parseFloat(otForm.targetDelta);
                if (isNaN(delta) || !sim?.id) return;
                try {
                  await createOptionsTarget({
                    simulationId: sim.id, action: otForm.action, callPut: otForm.callPut,
                    targetDelta: delta, contractMonth: otForm.contractMonth || null,
                    quantity: parseInt(otForm.quantity) || 1,
                  });
                  setShowAddForm(null);
                  getOptionsTargetMatches(sim.id).then(setTargetMatches).catch(() => { });
                  Toast.show({ type: "success", text1: "已新增選擇權策略" });
                } catch { Toast.show({ type: "error", text1: "新增失敗" }); }
              }}
            >
              <Text style={styles.submitBtnText}>新增</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Loan Form */}
      <Modal visible={showAddForm === "loan"} transparent animationType="slide" onRequestClose={() => setShowAddForm(null)}>
        <Pressable style={styles.overlay} onPress={() => setShowAddForm(null)}>
          <Pressable style={styles.formSheet} onPress={() => { }}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>新增貸款</Text>
              <Pressable onPress={() => setShowAddForm(null)} hitSlop={12}><X size={20} color={colors.mutedForeground} /></Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>名稱</Text>
                <TextInput value={loanForm.name} onChangeText={v => setLoanForm(f => ({ ...f, name: v }))} style={styles.formInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>起始日</Text>
                <TextInput value={loanForm.startDate} onChangeText={v => setLoanForm(f => ({ ...f, startDate: v }))}
                  keyboardType="numeric" style={styles.formInput} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>本金</Text>
                <TextInput value={loanForm.principal} onChangeText={v => setLoanForm(f => ({ ...f, principal: v }))}
                  keyboardType="numeric" style={styles.formInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>年利率 (%)</Text>
                <TextInput value={loanForm.annualRate} onChangeText={v => setLoanForm(f => ({ ...f, annualRate: v }))}
                  keyboardType="numeric" style={styles.formInput} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>期數（月）</Text>
                <TextInput value={loanForm.periods} onChangeText={v => setLoanForm(f => ({ ...f, periods: v }))}
                  keyboardType="numeric" style={styles.formInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>月付</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", fontFamily: "monospace", color: colors.foreground, marginTop: 6 }}>
                  {(() => {
                    const p = parseFloat(loanForm.principal), r = parseFloat(loanForm.annualRate) / 100, n = parseInt(loanForm.periods);
                    if (!p || !r || !n) return "-";
                    return `$${Math.round(computeMonthlyPayment(p, r, n)).toLocaleString()}`;
                  })()}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.submitBtn}
              onPress={async () => {
                const p = parseFloat(loanForm.principal), r = parseFloat(loanForm.annualRate) / 100, n = parseInt(loanForm.periods);
                if (!loanForm.name || !p || r == null || !n || !loanForm.startDate || !sim?.id) {
                  Toast.show({ type: "error", text1: "請填寫完整" }); return;
                }
                try {
                  await addLoan({ simulationId: sim.id, name: loanForm.name, principal: p, annualRate: r, periods: n, startDate: loanForm.startDate });
                  setShowAddForm(null);
                  setLoanForm({ name: "", principal: "", annualRate: "", periods: "", startDate: new Date().toISOString().slice(0, 10).replace(/-/g, "") });
                  refreshTrades();
                  Toast.show({ type: "success", text1: "已新增貸款" });
                } catch { Toast.show({ type: "error", text1: "新增失敗" }); }
              }}
            >
              <Text style={styles.submitBtnText}>新增</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  headerSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + "4d",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  addBtnText: { fontSize: 12, fontWeight: "500", color: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 8, paddingBottom: 32 },

  // Account cards
  accountCard: {},
  accountRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14,
  },
  accountLabel: { fontSize: 14, fontWeight: "700", fontFamily: "monospace", color: colors.foreground },
  accountSub: { fontSize: 10, color: colors.mutedForeground, marginTop: 1 },
  accountValue: { fontSize: 13, fontWeight: "700", fontFamily: "monospace", color: colors.foreground },

  expandedSection: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: colors.border,
  },

  fieldRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  field: { flex: 1 },
  fieldLabel: { fontSize: 11, color: colors.mutedForeground },
  fieldValue: { fontSize: 13, fontWeight: "600", fontFamily: "monospace", color: colors.foreground, marginTop: 2 },
  editableRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  fieldInput: {
    fontFamily: "monospace", fontWeight: "600", fontSize: 13, color: colors.foreground,
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.primary + "66",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, width: 80, marginTop: 2,
  },

  sectionLabel: { fontSize: 10, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },

  tradeRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 3,
  },

  tradeFormContainer: {
    backgroundColor: colors.inputBg, borderRadius: 12, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: colors.border,
  },

  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg,
  },
  actionBtnText: { fontSize: 11, fontWeight: "500", color: colors.foreground },

  cashInput: {
    flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 12, height: 36,
    color: colors.foreground, fontFamily: "monospace", fontSize: 13,
  },
  cashSaveBtn: {
    backgroundColor: colors.secondary, paddingHorizontal: 14, height: 36, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center",
  },
  cashSaveBtnText: { fontSize: 12, fontWeight: "500", color: colors.foreground },

  // Modals
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" as const },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 32 },
  formSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 40 },
  sheetHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: "700" as const, color: colors.foreground },
  menuRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },

  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: "transparent" },
  chipText: { fontSize: 13, fontWeight: "600" as const, color: colors.mutedForeground, textAlign: "center" as const },
  chipRedActive: { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.4)" },
  chipGreenActive: { backgroundColor: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.4)" },

  formInput: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: "monospace",
    color: colors.foreground, marginTop: 4,
  },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" as const,
  },
  submitBtnText: { fontSize: 14, fontWeight: "600" as const, color: "#fff" },
});
