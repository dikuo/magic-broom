import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For icons


export default function TabLayout() {

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
        name="requests"
        options={{
            title: 'Request',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="paper-plane-outline" size={size} color={color} />
            ),
          }}
      />
      
      {/* Cleaner Accepted Orders */}
      <Tabs.Screen
        name="order"
        options={{
          title: "Accepted Orders",
          tabBarIcon: ({ color, size }) => 
            <Ionicons name="checkmark-done-outline" size={size} color={color} />,
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