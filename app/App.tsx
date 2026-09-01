import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from './src/db/database';
import { useSettingsStore } from './src/store/settingsStore';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/tokens';

function AppContent() {
  const { loadSettings, isReady, theme } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    // Initialize SQLite database (creates tables, seeds defaults on first launch)
    initDatabase();
    // Load persisted settings (currency, theme)
    loadSettings();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContent />
    </GestureHandlerRootView>
  );
}
