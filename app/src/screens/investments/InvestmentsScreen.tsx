import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors, FontSize, Spacing, Radius } from '../../theme/tokens';
import { getInvestments, createInvestment, deleteInvestment, getTotalInvested, Investment } from '../../db/queries/investments';

const ASSET_TYPES = [
  { label: '📈 Stock', value: 'stock' },
  { label: '🪙 Crypto', value: 'crypto' },
  { label: '📊 ETF',   value: 'etf' },
  { label: '🏦 Other', value: 'other' },
] as const;

const ASSET_EMOJI: Record<string, string> = { stock: '📈', crypto: '🪙', etf: '📊', other: '🏦' };

export default function InvestmentsScreen() {
  const navigation = useNavigation<any>();
  const { theme, baseCurrency } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ticker: '', name: '', asset_type: 'stock' as Investment['asset_type'], quantity: '', buy_price: '', notes: '' });

  const load = useCallback(() => {
    setInvestments(getInvestments());
    setTotalInvested(getTotalInvested());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  const fmt = (n: number) => {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: baseCurrency }).format(n); }
    catch { return `${n.toFixed(2)}`; }
  };

  const handleSave = () => {
    if (!form.ticker || !form.name || !form.quantity || !form.buy_price)
      return Alert.alert('Error', 'Fill in all required fields');
    const qty = parseFloat(form.quantity), price = parseFloat(form.buy_price);
    if (isNaN(qty) || isNaN(price)) return Alert.alert('Error', 'Enter valid numbers');
    createInvestment({ ticker: form.ticker, name: form.name, asset_type: form.asset_type, quantity: qty, buy_price: price, currency: baseCurrency, notes: form.notes || null });
    setShowAdd(false);
    setForm({ ticker: '', name: '', asset_type: 'stock', quantity: '', buy_price: '', notes: '' });
    load();
  };

  const grouped = ASSET_TYPES.map(at => ({ ...at, items: investments.filter(i => i.asset_type === at.value) })).filter(g => g.items.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <LinearGradient colors={theme === 'dark' ? ['#1F1038', '#0A0F1E'] : ['#EDE9FE', '#F8FAFC']} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: C.cardAlt, borderColor: C.border }]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={[styles.backBtnText, { color: C.text }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: C.text }]}>Portfolio</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={[styles.totalCard, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
          <Text style={styles.totalLabel}>Total Invested</Text>
          <Text style={styles.totalValue}>{fmt(totalInvested)}</Text>
          <Text style={styles.totalSub}>{investments.length} holding{investments.length !== 1 ? 's' : ''}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}>
        {grouped.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48 }}>📈</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>No holdings yet</Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>Tap + to add your first investment</Text>
          </View>
        ) : grouped.map(group => (
          <View key={group.value}>
            <Text style={[styles.groupLabel, { color: C.textSecondary }]}>{group.label}</Text>
            {group.items.map(inv => {
              const value = inv.quantity * inv.buy_price;
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[styles.holdingCard, { backgroundColor: C.card, borderColor: C.border }]}
                  onLongPress={() => Alert.alert('Remove Holding', 'Delete this investment?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteInvestment(inv.id); load(); } }])}
                  activeOpacity={0.85}
                >
                  <View style={[styles.holdingIcon, { backgroundColor: Colors.primary + '22' }]}>
                    <Text style={{ fontSize: 26 }}>{ASSET_EMOJI[inv.asset_type]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ticker, { color: C.text }]}>{inv.ticker}</Text>
                    <Text style={[styles.holdingName, { color: C.textSecondary }]} numberOfLines={1}>{inv.name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.holdingValue, { color: C.text }]}>{fmt(value)}</Text>
                    <Text style={[styles.holdingQty, { color: C.textMuted }]}>{inv.quantity} × {fmt(inv.buy_price)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.fabGrad}>
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: C.surface }]}>
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: C.text }]}>Add Holding</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Asset Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md }}>
                {ASSET_TYPES.map(at => (
                  <TouchableOpacity key={at.value} style={[styles.typeChip, { borderColor: form.asset_type === at.value ? Colors.primary : C.border, backgroundColor: form.asset_type === at.value ? Colors.primary + '22' : C.cardAlt }]} onPress={() => setForm(f => ({ ...f, asset_type: at.value }))}>
                    <Text style={[styles.typeChipText, { color: form.asset_type === at.value ? Colors.primary : C.textSecondary }]}>{at.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {[{ label: 'Ticker *', key: 'ticker', placeholder: 'e.g. AAPL, BTC', upper: true }, { label: 'Name *', key: 'name', placeholder: 'e.g. Apple Inc.' }, { label: 'Quantity *', key: 'quantity', placeholder: '1.0', keyboard: 'decimal-pad' as any }, { label: 'Buy Price *', key: 'buy_price', placeholder: '0.00', keyboard: 'decimal-pad' as any }, { label: 'Notes', key: 'notes', placeholder: 'Optional' }].map(f => (
                <View key={f.key}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>{f.label}</Text>
                  <TextInput style={[styles.input, { backgroundColor: C.cardAlt, color: C.text, borderColor: C.border }]} placeholder={f.placeholder} placeholderTextColor={C.textMuted} value={(form as any)[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: f.upper ? v.toUpperCase() : v }))} keyboardType={f.keyboard} autoCapitalize={f.upper ? 'characters' : 'none'} />
                </View>
              ))}
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: C.border }]} onPress={() => setShowAdd(false)}><Text style={{ color: C.textSecondary }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}><LinearGradient colors={['#7C3AED','#5B21B6']} style={styles.saveBtnGrad}><Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text></LinearGradient></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1 },
  backBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  title: { fontSize: FontSize['2xl'], fontWeight: '800' },
  totalCard: { borderRadius: Radius.xl, padding: Spacing.md, alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm },
  totalValue: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 4 },
  totalSub: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.xs, marginTop: 4 },
  groupLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.md },
  holdingCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  holdingIcon: { width: 50, height: 50, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  ticker: { fontSize: FontSize.lg, fontWeight: '800' },
  holdingName: { fontSize: FontSize.xs, marginTop: 2 },
  holdingValue: { fontSize: FontSize.base, fontWeight: '700' },
  holdingQty: { fontSize: FontSize.xs, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.lg, fontWeight: '600' },
  emptySub: { fontSize: FontSize.sm },
  fab: { position: 'absolute', bottom: 30, right: Spacing.lg, borderRadius: Radius.full, overflow: 'hidden', elevation: 12 },
  fabGrad: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  fabIcon: { color: '#fff', fontSize: 34, fontWeight: '300', lineHeight: 38 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, maxHeight: '90%' },
  handle: { width: 40, height: 4, backgroundColor: '#4B5563', borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.md },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1 },
  typeChipText: { fontSize: FontSize.sm, fontWeight: '600' },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: Spacing.sm },
  input: { height: 48, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, fontSize: FontSize.base },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.xl },
  cancelBtn: { flex: 1, height: 48, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 2, borderRadius: Radius.md, overflow: 'hidden' },
  saveBtnGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
