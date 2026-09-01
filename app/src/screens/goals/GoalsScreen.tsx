import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors, FontSize, Spacing, Radius } from '../../theme/tokens';
import { getGoals, createGoal, addContribution, deleteGoal, SavingsGoal } from '../../db/queries/goals';

const COLORS = ['#10B981','#7C3AED','#3B82F6','#F59E0B','#EC4899','#F43F5E','#14B8A6','#F97316'];

export default function GoalsScreen() {
  const { theme, baseCurrency } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [contributeId, setContributeId] = useState<string | null>(null);
  const [contribution, setContribution] = useState('');
  const [form, setForm] = useState({ name:'', description:'', target_amount:'', target_date:'', color:'#10B981' });

  const load = useCallback(() => { setGoals(getGoals()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const fmt = (n: number) => {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: baseCurrency }).format(n); }
    catch { return `${n.toFixed(2)}`; }
  };

  const handleCreate = () => {
    if (!form.name || !form.target_amount) return Alert.alert('Error', 'Name and target amount are required');
    const target = parseFloat(form.target_amount);
    if (isNaN(target) || target <= 0) return Alert.alert('Error', 'Enter a valid target amount');
    createGoal({ name: form.name, description: form.description || null, target_amount: target, currency: baseCurrency, target_date: form.target_date || null, icon: 'target', color: form.color });
    setShowAdd(false);
    setForm({ name:'', description:'', target_amount:'', target_date:'', color:'#10B981' });
    load();
  };

  const handleContribute = () => {
    const amount = parseFloat(contribution);
    if (!amount || amount <= 0) return Alert.alert('Error', 'Enter a valid amount');
    addContribution(contributeId!, amount);
    setContributeId(null);
    setContribution('');
    load();
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <LinearGradient colors={theme === 'dark' ? ['#1F1038', '#0A0F1E'] : ['#EDE9FE', '#F8FAFC']} style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>Savings Goals</Text>
        <Text style={[styles.sub, { color: C.textSecondary }]}>
          {goals.length} goal{goals.length !== 1 ? 's' : ''} · {goals.filter(g => g.current_amount >= g.target_amount).length} completed
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}>
        {goals.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48 }}>🎯</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>No goals yet</Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>Tap + to create your first goal</Text>
          </View>
        ) : goals.map(goal => {
          const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
          const done = pct >= 100;
          return (
            <TouchableOpacity
              key={goal.id}
              style={[styles.goalCard, { backgroundColor: C.card, borderColor: done ? goal.color : C.border }]}
              onLongPress={() => Alert.alert('Delete Goal', 'Remove this goal?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteGoal(goal.id); load(); } }])}
              activeOpacity={0.9}
            >
              {done && <View style={[styles.doneBadge, { backgroundColor: goal.color }]}><Text style={styles.doneBadgeText}>✓ COMPLETED</Text></View>}
              <View style={styles.goalRow}>
                {/* Progress ring */}
                <View style={[styles.ring, { borderColor: goal.color + '44' }]}>
                  <Text style={[styles.ringPct, { color: goal.color }]}>{Math.round(pct)}%</Text>
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={[styles.goalName, { color: C.text }]}>{goal.name}</Text>
                  {goal.description ? <Text style={[styles.goalDesc, { color: C.textMuted }]} numberOfLines={1}>{goal.description}</Text> : null}
                  {goal.target_date ? <Text style={[styles.goalDate, { color: C.textSecondary }]}>🗓 {goal.target_date}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={[styles.goalCurrent, { color: goal.color }]}>{fmt(goal.current_amount)}</Text>
                    <Text style={[styles.goalTarget, { color: C.textMuted }]}> / {fmt(goal.target_amount)}</Text>
                  </View>
                </View>
              </View>
              {/* Gradient progress bar */}
              <View style={[styles.progressBg, { backgroundColor: goal.color + '22' }]}>
                <LinearGradient colors={[goal.color, goal.color + 'AA']} style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` as any }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              </View>
              {!done && (
                <TouchableOpacity style={[styles.contributeBtn, { borderColor: goal.color }]} onPress={() => setContributeId(goal.id)}>
                  <Text style={[styles.contributeBtnText, { color: goal.color }]}>+ Add Contribution</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.fabGrad}>
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Goal Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: C.surface }]}>
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: C.text }]}>New Goal</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[{ label: 'Goal Name *', key: 'name', placeholder: 'e.g. Emergency Fund' }, { label: 'Description', key: 'description', placeholder: 'Optional' }, { label: 'Target Amount *', key: 'target_amount', placeholder: '0.00', keyboard: 'decimal-pad' as any }, { label: 'Target Date', key: 'target_date', placeholder: 'YYYY-MM-DD' }].map(f => (
                <View key={f.key}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>{f.label}</Text>
                  <TextInput style={[styles.input, { backgroundColor: C.cardAlt, color: C.text, borderColor: C.border }]} placeholder={f.placeholder} placeholderTextColor={C.textMuted} value={(form as any)[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} keyboardType={f.keyboard} />
                </View>
              ))}
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
                {COLORS.map(c => <TouchableOpacity key={c} onPress={() => setForm(p => ({ ...p, color: c }))} style={[styles.colorCircle, { backgroundColor: c, borderWidth: form.color === c ? 3 : 0, borderColor: '#fff' }]} />)}
              </ScrollView>
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: C.border }]} onPress={() => setShowAdd(false)}><Text style={{ color: C.textSecondary }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} activeOpacity={0.85}><LinearGradient colors={['#7C3AED','#5B21B6']} style={styles.saveBtnGrad}><Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text></LinearGradient></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Contribute Modal */}
      <Modal visible={!!contributeId} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.smallModal, { backgroundColor: C.surface }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Add Contribution</Text>
            <TextInput style={[styles.input, { backgroundColor: C.cardAlt, color: C.text, borderColor: C.border, marginBottom: Spacing.md }]} placeholder="Amount" placeholderTextColor={C.textMuted} value={contribution} onChangeText={setContribution} keyboardType="decimal-pad" autoFocus />
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: C.border }]} onPress={() => { setContributeId(null); setContribution(''); }}><Text style={{ color: C.textSecondary }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleContribute} activeOpacity={0.85}><LinearGradient colors={['#10B981','#059669']} style={styles.saveBtnGrad}><Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text></LinearGradient></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  title: { fontSize: FontSize['2xl'], fontWeight: '800' },
  sub: { fontSize: FontSize.sm, marginTop: 4 },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.lg, fontWeight: '600' },
  emptySub: { fontSize: FontSize.sm },
  goalCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md, overflow: 'hidden' },
  doneBadge: { position: 'absolute', top: Spacing.sm, right: Spacing.sm, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  doneBadgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  goalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  ring: { width: 72, height: 72, borderRadius: 36, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: FontSize.sm, fontWeight: '800' },
  goalName: { fontSize: FontSize.base, fontWeight: '700', marginBottom: 2 },
  goalDesc: { fontSize: FontSize.xs, marginBottom: 4 },
  goalDate: { fontSize: FontSize.xs, marginBottom: 4 },
  goalCurrent: { fontSize: FontSize.lg, fontWeight: '800' },
  goalTarget: { fontSize: FontSize.sm },
  progressBg: { height: 8, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.md },
  progressFill: { height: 8, borderRadius: Radius.full },
  contributeBtn: { borderRadius: Radius.md, borderWidth: 1.5, paddingVertical: 10, alignItems: 'center' },
  contributeBtnText: { fontWeight: '700', fontSize: FontSize.sm },
  fab: { position: 'absolute', bottom: 90, right: Spacing.lg, borderRadius: Radius.full, overflow: 'hidden', elevation: 12 },
  fabGrad: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  fabIcon: { color: '#fff', fontSize: 34, fontWeight: '300', lineHeight: 38 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, maxHeight: '85%' },
  smallModal: { margin: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.lg },
  handle: { width: 40, height: 4, backgroundColor: '#4B5563', borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: Spacing.sm },
  input: { height: 48, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, fontSize: FontSize.base },
  colorCircle: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.xl },
  cancelBtn: { flex: 1, height: 48, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 2, borderRadius: Radius.md, overflow: 'hidden' },
  saveBtnGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
