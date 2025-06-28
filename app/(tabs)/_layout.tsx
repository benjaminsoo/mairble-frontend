import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';

// Custom 3D Tab Bar Background
function CustomTabBarBackground() {
  return (
    <View style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    }}>
      {/* 3D Gradient Background - positioned below the gold line */}
      <LinearGradient
        colors={[
          '#1A1A1A', // Lighter top
          '#000000', // Pure black
          '#111111', // Slightly lighter center
          '#000000', // Pure black bottom
        ]}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 1,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Enhanced Top accent line with glow */}
      <LinearGradient
        colors={['rgba(212, 175, 55, 1)', 'rgba(244, 208, 63, 0.9)', 'rgba(212, 175, 55, 0.7)', 'rgba(212, 175, 55, 0.3)']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 4,
          shadowColor: '#D4AF37',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.8,
          shadowRadius: 3,
          elevation: 5,
          zIndex: 3,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      
      {/* Subtle glow underneath the line */}
      <LinearGradient
        colors={['rgba(212, 175, 55, 0.3)', 'rgba(212, 175, 55, 0.1)', 'transparent']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 4,
          height: 8,
          zIndex: 2,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F4D03F', // Bright luxury gold
        tabBarInactiveTintColor: '#7D6F50', // Muted gold
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: CustomTabBarBackground,
        tabBarShowLabel: false, // Hide text labels - icons only
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            height: 88,
            paddingBottom: 34,
            paddingTop: 15,
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 30,
          },
          default: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            height: 70,
            paddingBottom: 8,
            paddingTop: 12,
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 30,
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={32} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <IconSymbol size={32} name="bubble.left.and.bubble.right.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
