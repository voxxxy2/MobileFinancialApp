import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors, FontSize, Spacing, Radius, ChartColors } from '../../theme/tokens';
import {
  getMonthlySummary, getCategoryBreakdown, getNetWorthHistory,
  MonthlyPoint, CategoryBreakdown, NetWorthPoint
} from '../../db/queries/analytics';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - Spacing.lg * 2;

type Tab = 'monthly' | 'categories' | 'networth';

export default function AnalyticsScreen() {
  const { theme, baseCurrency } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<Tab>('monthly');
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
  const [netWorthData, setNetWorthData] = useState<NetWorthPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: baseCurrency, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${baseCurrency} ${n.toFixed(0)}`;
    }
  };

  const load = useCallback(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const monthly = getMonthlySummary(6);
    const cats = getCategoryBreakdown(month, year);
    const netWorth = getNetWorthHistory(12);

    setMonthlyData(monthly);
    setCategoryData(cats);
    setNetWorthData(netWorth);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const chartConfig = {
    backgroundColor: C.card,
    backgroundGradientFrom: C.card,
    backgroundGradientTo: C.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    labelColor: () => C.textSecondary,
    style: { borderRadius: Radius.lg },
    propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary },
  };

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'monthly', label: 'Monthly', emoji: '📊' },
    { key: 'categories', label: 'Breakdown', emoji: '🥧' },
    { key: 'networth', label: 'Net Worth', emoji: '📈' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <LinearGradient colors={theme === 'dark' ? ['#1F1038', '#0A0F1E'] : ['#EDE9FE', '#F8FAFC']} style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Analytics</Text>

        <View style={styles.tabRow}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive, { borderColor: C.border }]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabText, { color: activeTab === t.key ? '#fff' : C.textSecondary }]}>
                {t.emoji} {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
      >
        {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} /> : (

          activeTab === 'monthly' ? (
            monthlyData.length === 0 ? <EmptyChart text="Not enough data yet. Add transactions to see monthly charts!" /> : (
              <View>
                <Text style={[styles.chartTitle, { color: C.text }]}>Income vs Expenses (last 6 months)</Text>
                <View style={[styles.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
                  <BarChart
                    data={{
                      labels: monthlyData.map(d => d.month.slice(5)),
                      datasets: [
                        { data: monthlyData.map(d => d.expense || 0) },
                      ],
                    }}
                    width={CHART_WIDTH - Spacing.lg * 2}
                    height={220}
                    chartConfig={chartConfig}
                    yAxisLabel=""
                    yAxisSuffix=""
                    style={{ borderRadius: Radius.md }}
                    showValuesOnTopOfBars={false}
                  />
                </View>

                {/* Monthly breakdown table */}
                <Text style={[styles.chartTitle, { color: C.text, marginTop: Spacing.lg }]}>Breakdown</Text>
                {monthlyData.map(d => (
                  <View key={d.month} style={[styles.monthRow, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Text style={[styles.monthLabel, { color: C.text }]}>{d.month}</Text>
                    <Text style={[styles.monthIncome, { color: Colors.income }]}>+{fmt(d.income || 0)}</Text>
                    <Text style={[styles.monthExpense, { color: Colors.expense }]}>-{fmt(d.expense || 0)}</Text>
                  </View>
                ))}
              </View>
            )
          ) : activeTab === 'categories' ? (
            categoryData.length === 0 ? <EmptyChart text="No expense data for this month." /> : (
              <View>
                <Text style={[styles.chartTitle, { color: C.text }]}>Spending by Category</Text>
                <View style={[styles.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
                  <PieChart
                    data={categoryData.map((c, i) => ({
                      name: c.name,
                      amount: c.total,
                      color: c.color || ChartColors[i % ChartColors.length],
                      legendFontColor: C.textSecondary,
                      legendFontSize: 12,
                    }))}
                    width={CHART_WIDTH - Spacing.lg * 2}
                    height={220}
                    chartConfig={chartConfig}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    center={[0, 0]}
                    absolute={false}
                  />
                </View>

                {/* Category list */}
                <Text style={[styles.chartTitle, { color: C.text, marginTop: Spacing.lg }]}>Details</Text>
                {categoryData.map(c => {
                  const total = categoryData.reduce((s, x) => s + x.total, 0);
                  const pct = total > 0 ? ((c.total / total) * 100).toFixed(1) : '0';
                  return (
                    <View key={c.id} style={[styles.catRow, { backgroundColor: C.card, borderColor: C.border }]}>
                      <View style={[styles.catDot, { backgroundColor: c.color || Colors.primary }]} />
                      <Text style={[styles.catName, { color: C.text }]}>{c.name}</Text>
                      <Text style={[styles.catPct, { color: C.textSecondary }]}>{pct}%</Text>
                      <Text style={[styles.catAmt, { color: C.text }]}>{fmt(c.total)}</Text>
                    </View>
                  );
                })}
              </View>
            )
          ) : (
            netWorthData.length === 0 ? <EmptyChart text="Not enough data for net worth chart." /> : (
              <View>
                <Text style={[styles.chartTitle, { color: C.text }]}>Net Worth Over Time</Text>
                {netWorthData.length > 0 && (
                  <View style={[styles.netWorthBig, { backgroundColor: netWorthData[netWorthData.length - 1].cumulative >= 0 ? '#0D2318' : '#2D0A14' }]}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm }}>Current Net Worth</Text>
                    <Text style={[styles.netWorthBigVal, { color: netWorthData[netWorthData.length - 1].cumulative >= 0 ? Colors.income : Colors.expense }]}>
                      {fmt(netWorthData[netWorthData.length - 1].cumulative)}
                    </Text>
                  </View>
                )}
                <View style={[styles.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
                  <LineChart
                    data={{
                      labels: netWorthData.map(d => d.month.slice(5)),
                      datasets: [{ data: netWorthData.map(d => d.cumulative) }],
                    }}
                    width={CHART_WIDTH - Spacing.lg * 2}
                    height={220}
                    chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})` }}
                    bezier
                    style={{ borderRadius: Radius.md }}
                    withShadow={false}
                  />
                </View>
              </View>
            )
          )
        )}
      </ScrollView>
    </View>
  );
}

function EmptyChart({ text }: { text: string }) {
  const { theme } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={{ alignItems: 'center', paddingTop: 60 }}>
      <Text style={{ fontSize: 48 }}>📉</Text>
      <Text style={{ color: C.textSecondary, fontSize: FontSize.base, marginTop: Spacing.md, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { fontSize: FontSize['2xl'], fontWeight: '800', marginBottom: Spacing.md },
  tabRow: { flexDirection: 'row', gap: Spacing.sm },
  tab: { flex: 1, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.xs, fontWeight: '700' },
  chartTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  chartCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md, overflow: 'hidden' },
  monthRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.sm },
  monthLabel: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  monthIncome: { fontSize: FontSize.sm, fontWeight: '700', marginRight: Spacing.md },
  monthExpense: { fontSize: FontSize.sm, fontWeight: '700' },
  catRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.sm },
  catDot: { width: 12, height: 12, borderRadius: 6, marginRight: Spacing.sm },
  catName: { flex: 1, fontSize: FontSize.sm },
  catPct: { fontSize: FontSize.sm, marginRight: Spacing.sm },
  catAmt: { fontSize: FontSize.sm, fontWeight: '700' },
  netWorthBig: { borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
  netWorthBigVal: { fontSize: FontSize['3xl'], fontWeight: '800', marginTop: 4 },
});
