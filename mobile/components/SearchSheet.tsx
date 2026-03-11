import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X, Search } from "lucide-react-native";
import { colors } from "@/constants/theme";
import * as api from "@/services/api";
import type { SearchResult } from "@/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
}

export function SearchSheet({ visible, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((text: string) => {
    const upper = text.toUpperCase();
    setQuery(upper);
    setResults([]);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (upper.length < 1) {
      setSearching(false);
      return;
    }

    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await api.searchStocks(upper);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleSelect = (item: SearchResult) => {
    onSelect(item);
    setQuery("");
    setResults([]);
    onClose();
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Search bar */}
          <View style={styles.searchRow}>
            <View style={styles.inputWrap}>
              <Search size={16} color={colors.mutedForeground} />
              <TextInput
                value={query}
                onChangeText={handleChange}
                placeholder="搜尋股票代號或名稱…"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
              />
              {query.length > 0 && (
                <Pressable onPress={() => { setQuery(""); setResults([]); }}>
                  <X size={14} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Results */}
          <View style={styles.resultsWrap}>
            {query.length === 0 ? (
              <Text style={styles.placeholder}>輸入代號或公司名稱搜尋</Text>
            ) : searching ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.placeholder}>搜尋中…</Text>
              </View>
            ) : results.length === 0 ? (
              <Text style={styles.placeholder}>找不到「{query}」</Text>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.symbol}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.resultItem}
                    onPress={() => handleSelect(item)}
                  >
                    <View>
                      <Text style={styles.resultSymbol}>{item.symbol}</Text>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <View style={styles.exchangeBadge}>
                      <Text style={styles.exchangeText}>{item.exchange}</Text>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontFamily: "monospace",
    fontSize: 14,
  },
  closeBtn: { padding: 6 },
  resultsWrap: { minHeight: 120 },
  placeholder: {
    textAlign: "center",
    color: colors.mutedForeground,
    fontSize: 12,
    paddingVertical: 40,
  },
  center: { alignItems: "center", paddingVertical: 40, gap: 8 },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultSymbol: { fontSize: 14, fontWeight: "600", fontFamily: "monospace", color: colors.foreground },
  resultName: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, maxWidth: 220 },
  exchangeBadge: { backgroundColor: colors.secondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  exchangeText: { fontSize: 10, color: colors.mutedForeground },
});
