/**
 * App Navigator
 * Main navigation structure optimized for governance workflows
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, useColorScheme, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Lucide';

import type { RootStackParamList, TabParamList } from '@/types/mobile';
import { COLORS, NAVIGATION } from '@/config/constants';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

// Import screens
import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { BiometricSetupScreen } from '@/screens/auth/BiometricSetupScreen';

import { DashboardScreen } from '@/screens/main/DashboardScreen';
import { MeetingsScreen } from '@/screens/main/MeetingsScreen';
import { DocumentsScreen } from '@/screens/main/DocumentsScreen';
import { NotificationsScreen } from '@/screens/main/NotificationsScreen';
import { ProfileScreen } from '@/screens/main/ProfileScreen';

import { DocumentViewerScreen } from '@/screens/documents/DocumentViewerScreen';
import { MeetingDetailScreen } from '@/screens/meetings/MeetingDetailScreen';
import { VotingSessionScreen } from '@/screens/meetings/VotingSessionScreen';

import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { SecuritySettingsScreen } from '@/screens/settings/SecuritySettingsScreen';
import { NotificationSettingsScreen } from '@/screens/settings/NotificationSettingsScreen';

import { OrganizationListScreen } from '@/screens/organizations/OrganizationListScreen';
import { OrganizationDetailScreen } from '@/screens/organizations/OrganizationDetailScreen';

import { OfflineModeScreen } from '@/screens/offline/OfflineModeScreen';
import { ErrorScreen } from '@/screens/error/ErrorScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Tab Bar Icon Component
const TabBarIcon = ({ 
  name, 
  color, 
  size = 24 
}: { 
  name: string; 
  color: string; 
  size?: number; 
}) => (
  <Icon name={name} size={size} color={color} />
);

// Main Tab Navigator
const MainTabNavigator = () => {
  const { theme } = useThemeStore();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = NAVIGATION.TAB_BAR_ICONS[route.name as keyof typeof NAVIGATION.TAB_BAR_ICONS];
          return (
            <TabBarIcon 
              name={iconName} 
              color={focused ? COLORS.primary : color} 
              size={size}
            />
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: theme === 'dark' ? COLORS.dark.textSecondary : COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: theme === 'dark' ? COLORS.dark.surface : COLORS.surface,
          borderTopColor: theme === 'dark' ? COLORS.dark.border : COLORS.border,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingTop: 5,
          paddingBottom: Platform.OS === 'ios' ? 30 : 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS === 'android',
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarBadge: undefined, // Will be set by notification count
        }}
      />
      <Tab.Screen 
        name="Meetings" 
        component={MeetingsScreen}
        options={{
          title: 'Meetings',
        }}
      />
      <Tab.Screen 
        name="Documents" 
        component={DocumentsScreen}
        options={{
          title: 'Documents',
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          title: 'Alerts',
          tabBarBadge: undefined, // Will be set by unread count
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

// Auth Navigator
const AuthNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      animationDuration: 300,
    }}
  >
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
  </Stack.Navigator>
);

// App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { theme } = useThemeStore();
  const systemColorScheme = useColorScheme();
  
  const [navigationTheme, setNavigationTheme] = useState(DefaultTheme);

  useEffect(() => {
    const effectiveTheme = theme === 'system' ? systemColorScheme : theme;
    
    setNavigationTheme({
      ...DefaultTheme,
      dark: effectiveTheme === 'dark',
      colors: {
        ...DefaultTheme.colors,
        primary: COLORS.primary,
        background: effectiveTheme === 'dark' ? COLORS.dark.background : COLORS.background,
        card: effectiveTheme === 'dark' ? COLORS.dark.surface : COLORS.surface,
        text: effectiveTheme === 'dark' ? COLORS.dark.text : COLORS.text,
        border: effectiveTheme === 'dark' ? COLORS.dark.border : COLORS.border,
        notification: COLORS.error,
      },
    });
  }, [theme, systemColorScheme]);

  if (isLoading) {
    // Return loading screen component
    return null; // TODO: Implement loading screen
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme === 'dark' ? COLORS.dark.background : COLORS.background}
        translucent={false}
      />
      
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 300,
        }}
      >
        {isAuthenticated ? (
          // Authenticated Stack
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            
            {/* Document Management */}
            <Stack.Screen 
              name="DocumentViewer" 
              component={DocumentViewerScreen}
              options={{
                headerShown: true,
                title: 'Document',
                animation: 'slide_from_bottom',
                presentation: 'modal',
              }}
            />
            
            {/* Meeting Management */}
            <Stack.Screen 
              name="MeetingDetail" 
              component={MeetingDetailScreen}
              options={{
                headerShown: true,
                title: 'Meeting Details',
              }}
            />
            <Stack.Screen 
              name="VotingSession" 
              component={VotingSessionScreen}
              options={{
                headerShown: true,
                title: 'Voting Session',
                gestureEnabled: false, // Prevent accidental dismissal during voting
              }}
            />
            
            {/* Settings */}
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Settings',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen 
              name="SecuritySettings" 
              component={SecuritySettingsScreen}
              options={{
                headerShown: true,
                title: 'Security Settings',
              }}
            />
            <Stack.Screen 
              name="NotificationSettings" 
              component={NotificationSettingsScreen}
              options={{
                headerShown: true,
                title: 'Notification Settings',
              }}
            />
            
            {/* Organization Management */}
            <Stack.Screen 
              name="OrganizationList" 
              component={OrganizationListScreen}
              options={{
                headerShown: true,
                title: 'Organizations',
              }}
            />
            <Stack.Screen 
              name="OrganizationDetail" 
              component={OrganizationDetailScreen}
              options={{
                headerShown: true,
                title: 'Organization',
              }}
            />
            
            {/* Error and Offline States */}
            <Stack.Screen 
              name="OfflineMode" 
              component={OfflineModeScreen}
              options={{
                headerShown: true,
                title: 'Offline Mode',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen 
              name="ErrorScreen" 
              component={ErrorScreen}
              options={{
                headerShown: true,
                title: 'Error',
                animation: 'fade',
              }}
            />
          </Stack.Group>
        ) : (
          // Authentication Stack
          <Stack.Group>
            <Stack.Screen name="Auth" component={AuthNavigator} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;