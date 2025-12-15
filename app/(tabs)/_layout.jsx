import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For icons
import { useColorScheme } from '@/hooks/useColorScheme';


export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00308F",
        headerShown: false,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          android: { elevation: 0 },
          default: {},
        }),
      }}
    >
      
      {/* requesting tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Request',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paper-plane-outline" size={size} color={color} />
          ),
        }}
      />

      {/* available requests tab */}
      <Tabs.Screen
        name="plan"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Profile Tab (Tab bar hidden) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}