import { LuxuryColors } from '@/constants/Colors';
import { SecureStorageService } from '@/services/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function IndexScreen() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      console.log('🔍 Checking setup status...');
      
      // Check if API is configured
      const isApiConfigured = await SecureStorageService.isPriceLabsApiConfigured();
      console.log('🔑 API configured:', isApiConfigured);
      
      if (!isApiConfigured) {
        console.log('➡️ Redirecting to API setup');
        router.replace('/setup');
        return;
      }
      
      // Check if property context is configured
      const isContextConfigured = await SecureStorageService.isPropertyContextConfigured();
      console.log('📋 Context configured:', isContextConfigured);
      
      if (!isContextConfigured) {
        console.log('➡️ Redirecting to context setup');
        router.replace('/context-setup');
        return;
      }
      
      // Both are configured, go to main app
      console.log('✅ Setup complete, going to main app');
      router.replace('/(tabs)');
      
    } catch (error) {
      console.error('❌ Error checking setup status:', error);
      // Default to setup on error
      router.replace('/setup');
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View style={styles.container}>
        <LinearGradient 
          colors={LuxuryColors.luxuryBackgroundGradient as any}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={LuxuryColors.accent} />
            <Text style={styles.loadingText}>Loading mAIrble...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // This shouldn't render since we redirect, but just in case
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LuxuryColors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.text,
  },
}); 