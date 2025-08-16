import { LuxuryColors } from '@/constants/Colors';
import { ApiService } from '@/services/api';
import { SecureStorageService } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [pms, setPms] = useState('airbnb');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ configured: boolean; pms: string | null }>({ configured: false, pms: null });
  const [contextConfigured, setContextConfigured] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    setLoading(true);
    try {
      const config = await SecureStorageService.getApiConfig();
      const status = await ApiService.getApiStatus();
      const contextStatus = await SecureStorageService.isPropertyContextConfigured();
      
      if (config?.priceLabs) {
        setApiKey(config.priceLabs.apiKey || '');
        setPms(config.priceLabs.pms || 'airbnb');
      }
      
      setApiStatus(status);
      setContextConfigured(contextStatus);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;

    // Validate API key
    const validation = SecureStorageService.validatePriceLabsApiKey(apiKey);
    if (!validation.isValid) {
      Alert.alert('Invalid API Key', validation.error || 'Please enter a valid PriceLabs API key');
      return;
    }

    setSaving(true);

    try {
      await SecureStorageService.updatePriceLabsApiKey(apiKey, pms);
      
      // Refresh status
      const status = await ApiService.getApiStatus();
      setApiStatus(status);
      
      Alert.alert(
        'Settings Saved',
        'Your API configuration has been updated successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save your settings. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClearApiKey = () => {
    Alert.alert(
      'Clear API Configuration?',
      'This will remove your stored API key and you will need to set it up again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStorageService.clearApiConfig();
              setApiKey('');
              setPms('airbnb');
              setApiStatus({ configured: false, pms: null });
              Alert.alert('Cleared', 'API configuration has been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear API configuration.');
            }
          }
        }
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App for Testing?',
      'This will clear ALL stored data (API key & property context) and restart the onboarding flow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStorageService.clearApiConfig();
              await SecureStorageService.clearPropertyContext();
              setApiKey('');
              setPms('airbnb');
              setApiStatus({ configured: false, pms: null });
              setContextConfigured(false);
              Alert.alert('App Reset', 'All data cleared. Restart the app to see onboarding flow.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app data.');
            }
          }
        }
      ]
    );
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
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
            <View style={styles.headerContainer}>
              {/* Back Button Row */}
              <View style={styles.backButtonRow}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={24} color={LuxuryColors.accent} />
                </TouchableOpacity>
              </View>
              
              {/* Centered Title Row */}
              <View style={styles.titleRow}>
                <Ionicons name="settings" size={20} color={LuxuryColors.accent} />
                <Text style={styles.title}>Settings</Text>
              </View>
            </View>
            
            {/* Subtitle */}
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>
                Manage your PriceLabs API configuration
              </Text>
            </View>

            {/* Status Card */}
            <LinearGradient 
              colors={LuxuryColors.cardGradient as any}
              style={styles.statusCard}
            >
              <View style={styles.statusHeader}>
                <Ionicons 
                  name={apiStatus.configured ? "checkmark-circle" : "alert-circle"} 
                  size={20} 
                  color={apiStatus.configured ? LuxuryColors.accent : LuxuryColors.textSecondary} 
                />
                <Text style={styles.statusTitle}>
                  {apiStatus.configured ? 'API Configured' : 'API Not Configured'}
                </Text>
              </View>
              
              {apiStatus.configured && (
                <View style={styles.statusDetails}>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>API Key:</Text>
                    <Text style={styles.statusValue}>{maskApiKey(apiKey)}</Text>
                  </View>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>PMS:</Text>
                    <Text style={styles.statusValue}>{pms}</Text>
                  </View>
                </View>
              )}
            </LinearGradient>

            {/* Property Context Section */}
            <LinearGradient 
              colors={LuxuryColors.cardGradient as any}
              style={styles.contextCard}
            >
              <View style={styles.contextHeader}>
                <Ionicons 
                  name={contextConfigured ? "sparkles" : "help-circle"} 
                  size={20} 
                  color={contextConfigured ? LuxuryColors.accent : LuxuryColors.textSecondary} 
                />
                <Text style={styles.contextTitle}>
                  {contextConfigured ? 'Property Context Configured' : 'Property Context Missing'}
                </Text>
              </View>
              
              <Text style={styles.contextDescription}>
                {contextConfigured 
                  ? 'Your AI assistant has personalized context about your guests, competition, and booking patterns.'
                  : 'Add context about your property to get much more accurate AI pricing advice.'
                }
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.contextButton,
                  contextConfigured && styles.contextButtonSecondary
                ]}
                onPress={() => router.push('/context-setup')}
              >
                <Ionicons 
                  name={contextConfigured ? "create" : "add-circle"} 
                  size={18} 
                  color={contextConfigured ? LuxuryColors.text : LuxuryColors.secondary} 
                />
                <Text style={[
                  styles.contextButtonText,
                  contextConfigured && styles.contextButtonTextSecondary
                ]}>
                  {contextConfigured ? 'Edit Property Context' : 'Add Property Context'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* Configuration Form */}
            <LinearGradient 
              colors={LuxuryColors.darkEliteGradient as any}
              style={styles.formCard}
            >
              <Text style={styles.formTitle}>Configuration</Text>

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
                    editable={!saving}
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

              {/* PMS Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Property Management System</Text>
                <View style={styles.pmsContainer}>
                  {['airbnb', 'vrbo', 'yourporter', 'smartbnb', 'ownerrez'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.pmsOption,
                        pms === option && styles.pmsOptionSelected
                      ]}
                      onPress={() => setPms(option)}
                      disabled={saving}
                    >
                      <Text style={[
                        styles.pmsOptionText,
                        pms === option && styles.pmsOptionTextSelected
                      ]}>
                        {option === 'ownerrez' ? 'OwnerRez' : option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </LinearGradient>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!apiKey.trim() || saving) && styles.primaryButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!apiKey.trim() || saving}
              >
                {saving ? (
                  <Text style={styles.primaryButtonText}>Saving...</Text>
                ) : (
                  <>
                    <Ionicons name="save" size={20} color={LuxuryColors.secondary} />
                    <Text style={styles.primaryButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>

              {apiStatus.configured && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleClearApiKey}
                  disabled={saving}
                >
                  <Ionicons name="trash" size={18} color={LuxuryColors.textSecondary} />
                  <Text style={styles.secondaryButtonText}>Clear API Key</Text>
                </TouchableOpacity>
              )}

              {/* Reset App Button for Testing */}
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetApp}
                disabled={saving}
              >
                <Ionicons name="refresh" size={18} color={LuxuryColors.textSecondary} />
                <Text style={styles.resetButtonText}>Reset App (Testing)</Text>
              </TouchableOpacity>
            </View>

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Ionicons name="information-circle" size={16} color={LuxuryColors.textSecondary} />
              <Text style={styles.helpText}>
                Get your API key from PriceLabs Account Settings → API section. The listing ID is optional - if not provided, the app will use the default configured in the backend.
              </Text>
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
    paddingBottom: 100,
  },
  headerContainer: {
    flexDirection: 'column',
    marginBottom: 16,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: LuxuryColors.primary,
    marginLeft: 8,
  },
  subtitleContainer: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
    lineHeight: 24,
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.1)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: LuxuryColors.text,
    marginLeft: 8,
  },
  statusDetails: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.text,
    flex: 1,
    textAlign: 'right',
  },
  formCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.2)',
  },
  formTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: LuxuryColors.secondary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: LuxuryColors.secondary,
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
    color: LuxuryColors.secondary,
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
    color: LuxuryColors.secondary,
  },
  pmsOptionTextSelected: {
    color: LuxuryColors.text,
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
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.2)',
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(184, 134, 11, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.1)',
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  contextCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.1)',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contextTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: LuxuryColors.text,
    marginLeft: 8,
  },
  contextDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  contextButton: {
    backgroundColor: LuxuryColors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  contextButtonSecondary: {
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
  },
  contextButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: LuxuryColors.secondary,
  },
  contextButtonTextSecondary: {
    color: LuxuryColors.text,
  },
  resetButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.2)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ff6b6b',
  },
}); 