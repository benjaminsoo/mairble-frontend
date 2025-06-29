import { LuxuryColors } from '@/constants/Colors';
import { SecureStorageService } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SetupScreen() {
  const [apiKey, setApiKey] = useState('');
  const [listingId, setListingId] = useState('');
  const [pms, setPms] = useState('airbnb');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = async () => {
    if (loading) return;

    // Validate API key
    const validation = SecureStorageService.validatePriceLabsApiKey(apiKey);
    if (!validation.isValid) {
      Alert.alert('Invalid API Key', validation.error || 'Please enter a valid PriceLabs API key');
      return;
    }

    setLoading(true);

    try {
      // Save the API configuration
      await SecureStorageService.updatePriceLabsApiKey(apiKey, listingId, pms);
      
      Alert.alert(
        'Step 1 Complete!',
        'Your API key has been saved. Next, let\'s add context to make your AI incredibly smart about YOUR property.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to context setup (Step 2)
              router.replace('/context-setup');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to save API key:', error);
      Alert.alert(
        'Setup Failed',
        'Failed to save your API key. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Setup?',
      'You can configure your API key later from the settings, but the app will use demo data until then.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)')
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Luxury Background */}
      <LinearGradient 
        colors={LuxuryColors.luxuryBackgroundGradient as any}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="key" size={40} color={LuxuryColors.accent} />
              </View>
              <Text style={styles.title}>Welcome to mAIrble</Text>
              <Text style={styles.subtitle}>
                Connect your PriceLabs account to get AI-powered pricing insights for your property
              </Text>
            </View>

            {/* Setup Form */}
            <LinearGradient 
              colors={LuxuryColors.cardGradient as any}
              style={styles.formCard}
            >
              {/* API Key Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PriceLabs API Key *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={apiKey}
                    onChangeText={setApiKey}
                    placeholder="Enter your PriceLabs API key"
                    placeholderTextColor={LuxuryColors.textLight}
                    secureTextEntry={!showApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowApiKey(!showApiKey)}
                  >
                    <Ionicons 
                      name={showApiKey ? "eye-off" : "eye"} 
                      size={20} 
                      color={LuxuryColors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Listing ID Input (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Listing ID (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={listingId}
                  onChangeText={setListingId}
                  placeholder="e.g., 21f49919-2f73-4b9e-88c1-f460a316a5bc"
                  placeholderTextColor={LuxuryColors.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* PMS Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Property Management System</Text>
                <View style={styles.pmsContainer}>
                  {['airbnb', 'vrbo', 'yourporter', 'other'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.pmsOption,
                        pms === option && styles.pmsOptionSelected
                      ]}
                      onPress={() => setPms(option)}
                      disabled={loading}
                    >
                      <Text style={[
                        styles.pmsOptionText,
                        pms === option && styles.pmsOptionTextSelected
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Help Text */}
              <View style={styles.helpContainer}>
                <Ionicons name="information-circle" size={16} color={LuxuryColors.textSecondary} />
                <Text style={styles.helpText}>
                  Get your API key from PriceLabs Account Settings → API section
                </Text>
              </View>
            </LinearGradient>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!apiKey.trim() || loading) && styles.primaryButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!apiKey.trim() || loading}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.primaryButtonText}>Saving...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={LuxuryColors.secondary} />
                    <Text style={styles.primaryButtonText}>Save & Continue</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSkip}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: LuxuryColors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  formCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.1)',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: LuxuryColors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 134, 11, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.2)',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.text,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 52,
  },
  eyeButton: {
    padding: 16,
  },
  pmsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pmsOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(184, 134, 11, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.2)',
  },
  pmsOptionSelected: {
    backgroundColor: LuxuryColors.accent,
    borderColor: LuxuryColors.accent,
  },
  pmsOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.text,
  },
  pmsOptionTextSelected: {
    color: LuxuryColors.secondary,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: LuxuryColors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: LuxuryColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: LuxuryColors.secondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
  },
}); 