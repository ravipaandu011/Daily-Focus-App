import { Tabs } from 'expo-router';
import React from 'react';
import { DynamicBottomTabBar } from '@/components/dynamic-bottom-tab-bar';
import { SECTIONS } from '@/constants/sections';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <DynamicBottomTabBar />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: SECTIONS.work.tabLabel,
        }}
      />
      <Tabs.Screen
        name="education"
        options={{
          title: SECTIONS.education.tabLabel,
        }}
      />
      <Tabs.Screen
        name="gym"
        options={{
          title: SECTIONS.gym.tabLabel,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: SECTIONS.home.tabLabel,
        }}
      />
      <Tabs.Screen
        name="other"
        options={{
          title: SECTIONS.personal.tabLabel,
        }}
      />
    </Tabs>
  );
}
