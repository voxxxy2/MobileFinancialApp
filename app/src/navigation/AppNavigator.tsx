import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { Colors } from '../theme/tokens';

// Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TransactionsScreen from '../screens/transactions/TransactionsScreen';
import BudgetScreen from '../screens/budget/BudgetScreen';
import GoalsScreen from '../screens/goals/GoalsScreen';
import InvestmentsScreen from '../screens/investments/InvestmentsScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Dashboard: '🏠',
  Transactions: '💳',
  Budget: '📊',
  Goals: '🎯',
  Analytics: '📈',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const { theme } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={{ alignItems: 'center', paddingTop: 4 }}>
      <Text style={{ fontSize: 22 }}>{TAB_ICONS[name]}</Text>
      <Text style={{ fontSize: 10, marginTop: 2, color: focused ? Colors.primary : C.textMuted, fontWeight: focused ? '700' : '400' }}>
        {name}
      </Text>
    </View>
  );
}

function MainTabs() {
  const { theme } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 8,
        },
      }}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen}    options={{ tabBarIcon: ({ focused }) => <TabIcon name="Dashboard"    focused={focused} /> }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="Transactions" focused={focused} /> }} />
      <Tab.Screen name="Budget"       component={BudgetScreen}       options={{ tabBarIcon: ({ focused }) => <TabIcon name="Budget"       focused={focused} /> }} />
      <Tab.Screen name="Goals"        component={GoalsScreen}        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Goals"        focused={focused} /> }} />
      <Tab.Screen name="Analytics"    component={AnalyticsScreen}    options={{ tabBarIcon: ({ focused }) => <TabIcon name="Analytics"    focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useSettingsStore();
  const C = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main"        component={MainTabs}        />
        <Stack.Screen name="Settings"    component={SettingsScreen}  />
        <Stack.Screen name="Investments" component={InvestmentsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
