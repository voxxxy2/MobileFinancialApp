import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors, FontSize, Spacing, Radius } from '../../theme/tokens';
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction, Transaction,
} from '../../db/queries/transactions';
import { getCategories, Category } from '../../db/queries/categories';

function getCategoryEmoji(icon?: string) {
  const map: Record<string, string> = {
    briefcase: '💼', laptop: '💻', 'trending-up': '📈', coffee: '☕',
    car: '🚗', home: '🏠', film: '🎬', heart: '❤️',
    'shopping-bag': '🛍️', book: '📚', zap: '⚡', 'more-horizontal': '⋯', circle: '💳',
  };
  return map[icon || ''] || '💳';
}

function fmt(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount); }
  catch { return `${amount.toFixed(2)}`; }
}

const EMPTY_FORM = { type: 'expense' as 'income' | 'expense', amount: '', category_id: '', notes: '', date: new Date().toISOString().slice(0, 10) };

export default function TransactionsScreen() {
  const { theme, baseCurrency } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = useCallback(() => {
    const txFilter = filter !== 'all' ? { type: filter as 'income' | 'expense' } : {};
    setTransactions(getTransactions({ ...txFilter, limit: 200 }));
    setCategories(getCategories());
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setForm({ type: tx.type, amount: String(tx.amount), category_id: tx.category_id || '', notes: tx.notes || '', date: tx.date.slice(0, 10) });
    setShowModal(true);
  };

  const handleSave = () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return Alert.alert('Error', 'Enter a valid amount');
    if (!form.date.match(/^\d{4}-\d{2}-\d{2}$/)) return Alert.alert('Error', 'Date must be YYYY-MM-DD');

    try {
      if (editId) {
        updateTransaction(editId, { type: form.type, amount, currency: baseCurrency, amount_in_base: amount, category_id: form.category_id || null, notes: form.notes || null, date: form.date });
      } else {
        createTransaction({ type: form.type, amount, currency: baseCurrency, amount_in_base: amount, category_id: form.category_id || null, notes: form.notes || null, date: form.date });
      }
      setShowModal(false);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteTransaction(id); load(); } },
    ]);
  };

  const filteredCats = categories.filter(c => c.type === form.type);

  const renderItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={[styles.txRow, { backgroundColor: C.card, borderColor: C.border }]}
      onPress={() => openEdit(item)}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.txIcon, { backgroundColor: (item.category_color || Colors.primary) + '22' }]}>
        <Text style={{ fontSize: 20 }}>{getCategoryEmoji(item.category_icon)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.txCat, { color: C.text }]}>{item.category_name || 'Uncategorized'}</Text>
        {item.notes ? <Text style={[styles.txNote, { color: C.textMuted }]} numberOfLines={1}>{item.notes}</Text> : null}
        <Text style={[styles.txDate, { color: C.textMuted }]}>{item.date}</Text>
      </View>
      <Text style={[styles.txAmt, { color: item.type === 'income' ? Colors.income : Colors.expense }]}>
        {item.type === 'income' ? '+' : '-'}{fmt(item.amount, item.currency)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <LinearGradient colors={theme === 'dark' ? ['#1F1038', '#0A0F1E'] : ['#EDE9FE', '#F8FAFC']} style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>Transactions</Text>
        <View style={styles.filterRow}>
          {(['all', 'income', 'expense'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterActive, { borderColor: C.border }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, { color: filter === f ? '#fff' : C.textSecondary }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={transactions}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48 }}>💳</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>No transactions yet</Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>Tap + to add one</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.fabGrad}>
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: C.surface }]}>
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: C.text }]}>{editId ? 'Edit Transaction' : 'New Transaction'}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Toggle */}
              <View style={[styles.typeToggle, { backgroundColor: C.cardAlt }]}>
                {(['expense', 'income'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, form.type === t && { backgroundColor: t === 'income' ? Colors.income : Colors.expense }]}
                    onPress={() => setForm(f => ({ ...f, type: t, category_id: '' }))}
                  >
                    <Text style={[styles.typeBtnText, { color: form.type === t ? '#fff' : C.textSecondary }]}>
                      {t === 'expense' ? '💸 Expense' : '💰 Income'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Amount ({baseCurrency})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.cardAlt, color: C.text, borderColor: C.border }]}
                placeholder="0.00" placeholderTextColor={C.textMuted}
                value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.cardAlt, color: C.text, borderColor: C.border }]}
                placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted}
                value={form.date} onChangeText={v => setForm(f => ({ ...f, date: v }))}
              />

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                {filteredCats.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, {
                      borderColor: form.category_id === cat.id ? cat.color : C.border,
                      backgroundColor: form.category_id === cat.id ? cat.color + '33' : C.cardAlt,
                    }]}
                    onPress={() => setForm(f => ({ ...f, category_id: cat.id }))}
                  >
                    <Text>{getCategoryEmoji(cat.icon)}</Text>
                    <Text style={[styles.catChipText, { color: C.text }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: C.cardAlt, color: C.text, borderColor: C.border }]}
                placeholder="Add a note..." placeholderTextColor={C.textMuted}
                value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                multiline numberOfLines={3}
              />

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: C.border }]} onPress={() => setShowModal(false)}>
                  <Text style={{ color: C.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                  <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.saveBtnGrad}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{editId ? 'Update' : 'Add'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
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
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', marginBottom: Spacing.md },
  filterRow: { flexDirection: 'row', gap: Spacing.sm },
  filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1 },
  filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, fontWeight: '600' },
  txRow: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  txIcon: { width: 46, height: 46, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  txCat: { fontSize: FontSize.base, fontWeight: '600' },
  txNote: { fontSize: FontSize.xs, marginTop: 2 },
  txDate: { fontSize: FontSize.xs, marginTop: 2 },
  txAmt: { fontSize: FontSize.base, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.lg, fontWeight: '600' },
  emptySub: { fontSize: FontSize.sm },
  fab: { position: 'absolute', bottom: 90, right: Spacing.lg, borderRadius: Radius.full, overflow: 'hidden', elevation: 12, shadowColor: '#7C3AED', shadowOpacity: 0.5, shadowRadius: 16 },
  fabGrad: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  fabIcon: { color: '#fff', fontSize: 34, fontWeight: '300', lineHeight: 38 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, maxHeight: '90%' },
  handle: { width: 40, height: 4, backgroundColor: '#4B5563', borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.md },
  typeToggle: { flexDirection: 'row', borderRadius: Radius.lg, padding: 4, marginBottom: Spacing.md },
  typeBtn: { flex: 1, padding: 10, borderRadius: Radius.md, alignItems: 'center' },
  typeBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: Spacing.sm },
  input: { height: 48, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, fontSize: FontSize.base },
  textarea: { height: 80, paddingTop: Spacing.sm, textAlignVertical: 'top' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, marginRight: 8 },
  catChipText: { fontSize: FontSize.sm, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.xl },
  cancelBtn: { flex: 1, height: 48, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 2, borderRadius: Radius.md, overflow: 'hidden' },
  saveBtnGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
