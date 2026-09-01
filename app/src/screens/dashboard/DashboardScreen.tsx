import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors, FontSize, Spacing, Radius } from '../../theme/tokens';
import { getDashboardData, DashboardData } from '../../db/queries/analytics';

const { width } = Dimensions.get('window');

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch { return `${currency} ${amount.toFixed(0)}`; }
}

function getCategoryEmoji(icon?: string) {
  const map: Record<string, string> = {
    briefcase: '💼', laptop: '💻', 'trending-up': '📈', coffee: '☕',
    car: '🚗', home: '🏠', film: '🎬', heart: '❤️',
    'shopping-bag': '🛍️', book: '📚', zap: '⚡', 'more-horizontal': '⋯',
    target: '🎯', circle: '💳',
  };
  return map[icon || ''] || '💳';
}

export default function DashboardScreen() {
  const { theme, baseCurrency } = useSettingsStore();
  const navigation = useNavigation<any>();
  const C = theme === 'dark' ? Colors.dark : Colors.light;
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    try {
      const d = getDashboardData(baseCurrency);
      setData(d);
    } catch (e) { console.warn(e); }
    finally { setRefreshing(false); }
  }, [baseCurrency]);

  // Reload data every time the tab is focused
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const monthly = data?.monthly ?? { income: 0, expense: 0, balance: 0 };
  const netWorth = data?.net_worth ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
      >
        {/* Header gradient */}
        <LinearGradient colors={theme === 'dark' ? ['#1F1038', '#0A0F1E'] : ['#EDE9FE', '#F8FAFC']} style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.greeting, { color: C.textSecondary }]}>Good day 👋</Text>
              <Text style={[styles.appName, { color: C.text }]}>FinTrack</Text>
            </View>
            <TouchableOpacity
              style={[styles.settingsBtn, { backgroundColor: Colors.primary + '22', borderColor: Colors.primary + '66' }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={{ fontSize: 22 }}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Net Worth Card */}
          <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.netWorthCard}>
            <Text style={styles.netWorthLabel}>Net Worth</Text>
            <Text style={styles.netWorthAmount}>{fmt(netWorth, baseCurrency)}</Text>
            <Text style={styles.netWorthSub}>All-time balance</Text>
          </LinearGradient>
        </LinearGradient>

        <View style={styles.body}>
          {/* Monthly Stats */}
          <Text style={[styles.sectionTitle, { color: C.text }]}>This Month</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme === 'dark' ? '#0D2318' : '#D1FAE5' }]}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={[styles.statLabel, { color: Colors.income }]}>Income</Text>
              <Text style={[styles.statAmount, { color: Colors.income }]}>{fmt(monthly.income, baseCurrency)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme === 'dark' ? '#2D0A14' : '#FFE4E6' }]}>
              <Text style={styles.statIcon}>💸</Text>
              <Text style={[styles.statLabel, { color: Colors.expense }]}>Expenses</Text>
              <Text style={[styles.statAmount, { color: Colors.expense }]}>{fmt(monthly.expense, baseCurrency)}</Text>
            </View>
          </View>

          {/* Balance chip */}
          <View style={[styles.balanceRow, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.balanceLabel, { color: C.textSecondary }]}>Monthly Balance</Text>
            <Text style={[styles.balanceValue, { color: monthly.balance >= 0 ? Colors.income : Colors.expense }]}>
              {monthly.balance >= 0 ? '+' : ''}{fmt(monthly.balance, baseCurrency)}
            </Text>
          </View>

          {/* Quick Actions */}
          <Text style={[styles.sectionTitle, { color: C.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { emoji: '💳', label: 'Add Expense', screen: 'Transactions' },
              { emoji: '💰', label: 'Add Income',  screen: 'Transactions' },
              { emoji: '🎯', label: 'Goals',       screen: 'Goals' },
              { emoji: '📈', label: 'Portfolio',   screen: 'Investments' },
            ].map(a => (
              <TouchableOpacity
                key={a.label}
                style={[styles.actionBtn, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 28 }}>{a.emoji}</Text>
                <Text style={[styles.actionLabel, { color: C.text }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Transactions */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Recent</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={{ color: Colors.primary, fontSize: FontSize.sm }}>See all →</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.txCard, { backgroundColor: C.card, borderColor: C.border }]}>
            {!data ? (
              <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.lg }} />
            ) : data.recent_transactions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40 }}>💳</Text>
                <Text style={[styles.emptyText, { color: C.textSecondary }]}>No transactions yet</Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>Tap Transactions to add your first</Text>
              </View>
            ) : data.recent_transactions.map((tx: any, i: number) => (
              <View key={tx.id} style={[styles.txRow, i < data.recent_transactions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }]}>
                <View style={[styles.txIconBox, { backgroundColor: (tx.category_color || Colors.primary) + '22' }]}>
                  <Text style={{ fontSize: 18 }}>{getCategoryEmoji(tx.category_icon)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txCat, { color: C.text }]}>{tx.category_name || 'Uncategorized'}</Text>
                  {tx.notes ? <Text style={[styles.txNote, { color: C.textMuted }]} numberOfLines={1}>{tx.notes}</Text> : null}
                </View>
                <Text style={[styles.txAmt, { color: tx.type === 'income' ? Colors.income : Colors.expense }]}>
                  {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount, tx.currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  greeting: { fontSize: FontSize.sm },
  appName: { fontSize: FontSize['2xl'], fontWeight: '800', letterSpacing: -0.5 },
  settingsBtn: { width: 44, height: 44, borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  netWorthCard: { borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', shadowColor: '#7C3AED', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  netWorthLabel: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.sm },
  netWorthAmount: { color: '#fff', fontSize: 40, fontWeight: '800', marginTop: 4 },
  netWorthSub: { color: 'rgba(255,255,255,0.45)', fontSize: FontSize.xs, marginTop: 4 },
  body: { padding: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  statCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statLabel: { fontSize: FontSize.xs, fontWeight: '600', marginBottom: 2 },
  statAmount: { fontSize: FontSize.lg, fontWeight: '800' },
  balanceRow: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  balanceLabel: { fontSize: FontSize.sm },
  balanceValue: { fontSize: FontSize.xl, fontWeight: '800' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  actionBtn: { width: (width - Spacing.lg * 2 - Spacing.sm) / 2, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, alignItems: 'center', gap: 6 },
  actionLabel: { fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' },
  txCard: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.lg },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  txIconBox: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  txCat: { fontSize: FontSize.base, fontWeight: '600' },
  txNote: { fontSize: FontSize.xs, marginTop: 2 },
  txAmt: { fontSize: FontSize.base, fontWeight: '700' },
  emptyBox: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  emptyText: { fontSize: FontSize.base, fontWeight: '600' },
  emptySub: { fontSize: FontSize.sm },
});
