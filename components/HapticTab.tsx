import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Animated, View } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnimation, {
        toValue: 0.88,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.timing(glowAnimation, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.timing(glowAnimation, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

    return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      paddingTop: 6,
      paddingBottom: 4,
      minHeight: 70,
    }}>
      {/* Outer Circle Ring */}
      <Animated.View 
        style={{ 
          position: 'absolute',
          width: 72,
          height: 72,
          borderRadius: 36,
          borderWidth: 1,
          borderColor: 'rgba(212, 175, 55, 0.25)',
          opacity: glowAnimation,
          transform: [{ scale: scaleAnimation }],
        }}
      />
      
      {/* Inner Circle Ring */}
      <Animated.View 
        style={{ 
          position: 'absolute',
          width: 60,
          height: 60,
          borderRadius: 30,
          borderWidth: 1,
          borderColor: 'rgba(212, 175, 55, 0.35)',
          opacity: glowAnimation,
          transform: [{ scale: scaleAnimation }],
        }}
      />
      
      {/* Main Button Container */}
      <Animated.View 
        style={{ 
          transform: [{ scale: scaleAnimation }],
          shadowColor: '#D4AF37',
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          shadowOpacity: glowAnimation,
          elevation: 6,
          borderRadius: 26,
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(212, 175, 55, 0.2)',
          width: 52,
          height: 52,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <PlatformPressable
          {...props}
          style={[
            props.style,
            {
              borderRadius: 22,
              overflow: 'hidden',
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }
          ]}
          onPressIn={(ev) => {
            animateIn();
            if (process.env.EXPO_OS === 'ios') {
              // Enhanced haptic feedback
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            props.onPressIn?.(ev);
          }}
          onPressOut={(ev) => {
            animateOut();
            props.onPressOut?.(ev);
          }}
        />
      </Animated.View>
    </View>
  );
}
