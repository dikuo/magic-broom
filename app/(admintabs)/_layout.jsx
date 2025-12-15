import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For icons
import { Colors } from '@/constants/Colors';
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
        name="CleanerManage"
        options={{
            title: 'CleanerManage',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="paper-plane-outline" size={size} color={color} />
            ),
          }}
      />
      

      

    </Tabs>
  );
}