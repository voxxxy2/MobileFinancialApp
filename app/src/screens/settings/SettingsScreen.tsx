import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors, FontSize, Spacing, Radius } from '../../theme/tokens';
import { getTransactionsCSV } from '../../db/queries/transactions';
import db from '../../db/database';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'SGD', 'INR', 'KRW', 'IDR', 'THB', 'MYR', 'PHP', 'VND', 'BRL', 'MXN'];

function SettingRow({ icon, label, value, onPress, right }: any) {
  const { theme } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;
  return (
    <TouchableOpacity
      style={[styles.settingRow, { backgroundColor: C.card, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, { color: C.text }]}>{label}</Text>
        {value && <Text style={[styles.settingValue, { color: C.textSecondary }]}>{value}</Text>}
      </View>
      {right || (onPress && <Text style={{ color: C.textMuted, fontSize: 18 }}>›</Text>)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { theme, toggleTheme, baseCurrency, setBaseCurrency } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;
  const [exporting, setExporting] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const csvData = getTransactionsCSV();
      const filename = `fintrack_transactions_${new Date().toISOString().slice(0, 10)}.csv`;

      if (Platform.OS === 'web') {
        // Web export fallback
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Native Android / iOS sharing via Expo Sharing
        const file = new File(Paths.document, filename);
        await file.write(csvData);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export FinTrack Transactions',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Export Complete', `File saved to: ${file.uri}`);
        }
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      '⚠️ Clear All Data',
      'Are you sure you want to delete all transactions, goals, and investments? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            try {
              db.execSync(`
                DELETE FROM transactions;
                DELETE FROM savings_goals;
                DELETE FROM investments;
              `);
              Alert.alert('Success', 'All transaction data has been cleared.');
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

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
          <Text style={[styles.headerTitle, { color: C.text }]}>Settings</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Offline Badge Card */}
        <View style={[styles.profileCard, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.avatar}>
            <Text style={styles.avatarText}>🔒</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Local & Offline</Text>
            <Text style={styles.profileEmail}>Stored on your device (SQLite)</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}>

        {/* Appearance */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>APPEARANCE</Text>
        <View style={styles.group}>
          <SettingRow
            icon="🌙"
            label="Dark Mode"
            right={<Switch value={theme === 'dark'} onValueChange={toggleTheme} trackColor={{ true: Colors.primary }} thumbColor="#fff" />}
          />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>PREFERENCES</Text>
        <View style={styles.group}>
          <SettingRow
            icon="💱"
            label="Base Currency"
            value={baseCurrency}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
          />
          {showCurrencyPicker && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.currencyPicker, { backgroundColor: C.cardAlt }]}>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    setBaseCurrency(c);
                    setShowCurrencyPicker(false);
                  }}
                  style={[styles.currencyChip, { backgroundColor: baseCurrency === c ? Colors.primary : 'transparent', borderColor: baseCurrency === c ? Colors.primary : C.border }]}
                >
                  <Text style={[styles.currencyChipText, { color: baseCurrency === c ? '#fff' : C.text }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Data & Backup */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>DATA & BACKUP</Text>
        <View style={styles.group}>
          <SettingRow
            icon="📄"
            label="Export as CSV"
            value="Share / save all your transactions"
            onPress={handleExportCSV}
          />
          {exporting && <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.sm }} />}
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: Colors.expense }]}>DANGER ZONE</Text>
        <View style={styles.group}>
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: Colors.expense + '1A', borderColor: Colors.expense + '55' }]}
            onPress={handleClearAllData}
            activeOpacity={0.75}
          >
            <Text style={styles.resetText}>🗑️ Clear All Transaction Data</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: C.textMuted }]}>FinTrack Offline v1.0.0 (SQLite)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1 },
  backBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  headerTitle: { fontSize: FontSize['2xl'], fontWeight: '800' },
  profileCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.md, gap: Spacing.md },
  avatar: { width: 52, height: 52, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.xl },
  profileName: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  profileEmail: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginTop: 2 },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.5, marginBottom: Spacing.sm, marginTop: Spacing.lg, textTransform: 'uppercase' },
  group: { borderRadius: Radius.xl, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  settingIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  settingLabel: { fontSize: FontSize.base, fontWeight: '600' },
  settingValue: { fontSize: FontSize.xs, marginTop: 2 },
  currencyPicker: { padding: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  currencyChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, marginRight: 8 },
  currencyChipText: { fontSize: FontSize.sm, fontWeight: '700' },
  resetBtn: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, alignItems: 'center' },
  resetText: { color: Colors.expense, fontSize: FontSize.base, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: FontSize.xs, marginTop: Spacing.xl },
});
