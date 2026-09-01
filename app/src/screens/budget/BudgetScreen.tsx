import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors, FontSize, Spacing, Radius } from '../../theme/tokens';
import { getBudgetSummary, BudgetCategory, MonthlySummary } from '../../db/queries/budgets';

function getCategoryEmoji(icon?: string) {
  const map: Record<string, string> = { briefcase:'💼',laptop:'💻','trending-up':'📈',coffee:'☕',car:'🚗',home:'🏠',film:'🎬',heart:'❤️','shopping-bag':'🛍️',book:'📚',zap:'⚡','more-horizontal':'⋯',circle:'💳' };
  return map[icon||'']||'💳';
}

export default function BudgetScreen() {
  const { theme, baseCurrency } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<MonthlySummary>({ income: 0, expense: 0, balance: 0 });
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    const result = getBudgetSummary(month, year);
    setSummary(result.summary);
    setCategories(result.categories);
    setRefreshing(false);
  }, [month, year]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const fmt = (n: number) => {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: baseCurrency, maximumFractionDigits: 0 }).format(n); }
    catch { return n.toFixed(0); }
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const navigate = (dir: number) => {
    let m = month + dir, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <LinearGradient colors={theme === 'dark' ? ['#1F1038', '#0A0F1E'] : ['#EDE9FE', '#F8FAFC']} style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>Budget</Text>

        {/* Month selector */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => navigate(-1)} style={styles.arrow}><Text style={styles.arrowTxt}>‹</Text></TouchableOpacity>
          <Text style={[styles.monthLabel, { color: C.text }]}>{monthName}</Text>
          <TouchableOpacity onPress={() => navigate(1)} style={styles.arrow}><Text style={styles.arrowTxt}>›</Text></TouchableOpacity>
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          {[{ label: 'Income', val: summary.income, color: Colors.income }, { label: 'Spent', val: summary.expense, color: Colors.expense }, { label: 'Balance', val: summary.balance, color: summary.balance >= 0 ? Colors.income : Colors.expense }].map(s => (
            <View key={s.label} style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{s.label}</Text>
              <Text style={[styles.summaryValue, { color: s.color }]}>{fmt(s.val)}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
      >
        {categories.filter(c => c.spent_amount > 0 || c.monthly_limit).map(cat => {
          const pct = cat.percent_used ?? 0;
          const over = pct > 100;
          return (
            <View key={cat.id} style={[styles.catCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.catTop}>
                <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                  <Text style={{ fontSize: 20 }}>{getCategoryEmoji(cat.icon)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catName, { color: C.text }]}>{cat.name}</Text>
                  <Text style={[styles.catSpent, { color: C.textSecondary }]}>
                    {fmt(cat.spent_amount)}{cat.monthly_limit ? ` / ${fmt(cat.monthly_limit)}` : ' spent'}
                  </Text>
                </View>
                {cat.monthly_limit ? (
                  <View style={[styles.pctBadge, { backgroundColor: (over ? Colors.expense : pct > 80 ? Colors.warning : Colors.income) + '22' }]}>
                    <Text style={[styles.pctText, { color: over ? Colors.expense : pct > 80 ? Colors.warning : Colors.income }]}>{pct.toFixed(0)}%</Text>
                  </View>
                ) : null}
              </View>
              {cat.monthly_limit ? (
                <View style={[styles.progressBg, { backgroundColor: cat.color + '22' }]}>
                  <LinearGradient
                    colors={over ? [Colors.expense, Colors.expense + 'AA'] : [cat.color, cat.color + 'AA']}
                    style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` as any }]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />
                </View>
              ) : null}
            </View>
          );
        })}

        {categories.every(c => c.spent_amount === 0 && !c.monthly_limit) && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48 }}>📊</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>No spending this month</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', marginBottom: Spacing.md },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  arrow: { padding: 8 },
  arrowTxt: { color: Colors.primary, fontSize: 26, fontWeight: '700' },
  monthLabel: { fontSize: FontSize.lg, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: Radius.lg, padding: Spacing.md },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.xs, marginBottom: 4 },
  summaryValue: { fontSize: FontSize.sm, fontWeight: '800' },
  catCard: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  catTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  catIcon: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  catName: { fontSize: FontSize.base, fontWeight: '700' },
  catSpent: { fontSize: FontSize.xs, marginTop: 2 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pctText: { fontSize: FontSize.sm, fontWeight: '700' },
  progressBg: { height: 8, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: Radius.full },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.lg, fontWeight: '600' },
});
