import { LuxuryColors } from '@/constants/Colors';
import { PropertyContext, SecureStorageService } from '@/services/storage';
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

export default function ContextSetupScreen() {
  const [guestProfile, setGuestProfile] = useState('');
  const [competitiveAdvantage, setCompetitiveAdvantage] = useState('');
  const [bookingPatterns, setBookingPatterns] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    loadExistingContext();
  }, []);

  const loadExistingContext = async () => {
    try {
      const existingContext = await SecureStorageService.getPropertyContext();
      if (existingContext) {
        setGuestProfile(existingContext.guestProfile);
        setCompetitiveAdvantage(existingContext.competitiveAdvantage);
        setBookingPatterns(existingContext.bookingPatterns);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Failed to load existing context:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (loading) return;

    // Validate all answers are provided
    if (!guestProfile.trim() || !competitiveAdvantage.trim() || !bookingPatterns.trim()) {
      Alert.alert('Missing Information', 'Please answer all 3 questions to continue.');
      return;
    }

    setLoading(true);

    try {
      const context: PropertyContext = {
        guestProfile: guestProfile.trim(),
        competitiveAdvantage: competitiveAdvantage.trim(),
        bookingPatterns: bookingPatterns.trim(),
        createdAt: new Date().toISOString(),
      };

      await SecureStorageService.storePropertyContext(context);
      
      Alert.alert(
        isEditing ? 'Context Updated!' : 'Context Saved!',
        isEditing 
          ? 'Your property context has been updated. The AI will use this new information for pricing advice.'
          : 'Your property context has been saved. The AI will now provide much more personalized pricing advice.',
        [
          {
            text: 'Continue to App',
            onPress: () => {
              router.replace('/(tabs)');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to save context:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save your context. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Context Setup?',
      'This helps make the AI pricing advice much more accurate for your specific property. You can add this later from settings.',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)')
        }
      ]
    );
  };

  const renderQuestion = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>
              Who are your typical guests and what do they love most about your place?
            </Text>
            <Text style={styles.questionSubtitle}>
              Help the AI understand your guest demographics and unique value proposition
            </Text>
            <TextInput
              style={styles.textArea}
              value={guestProfile}
              onChangeText={setGuestProfile}
              placeholder="Examples:
• Business travelers who love the downtown location and workspace
• Bachelorette groups who come for the hot tub and can split costs  
• Families with dogs who need the mountain access and space"
              placeholderTextColor={LuxuryColors.textLight}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={500}
              editable={!loading}
            />
            <Text style={styles.characterCount}>{guestProfile.length}/500</Text>
          </View>
        );
      
      case 2:
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>
              What's your main competition nearby, and why do guests choose you instead?
            </Text>
            <Text style={styles.questionSubtitle}>
              This helps the AI price competitively while highlighting your advantages
            </Text>
            <TextInput
              style={styles.textArea}
              value={competitiveAdvantage}
              onChangeText={setCompetitiveAdvantage}
              placeholder="Examples:
• Hampton Inn at $89/night, but we have full kitchen and more space
• Other Airbnbs, but we're the only one with hot tub + sauna combo
• Hotels are $120+, we're the affordable option with better amenities"
              placeholderTextColor={LuxuryColors.textLight}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={500}
              editable={!loading}
            />
            <Text style={styles.characterCount}>{competitiveAdvantage.length}/500</Text>
          </View>
        );
      
      case 3:
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>
              When do you get booked up first vs struggle to fill dates?
            </Text>
            <Text style={styles.questionSubtitle}>
              Understanding your seasonal patterns helps optimize pricing strategy
            </Text>
            <TextInput
              style={styles.textArea}
              value={bookingPatterns}
              onChangeText={setBookingPatterns}
              placeholder="Examples:
• Weekends book months ahead, weekdays are last-minute business
• Summer is crazy, winter slow except holidays
• Bachelorette season (May-Sept) is gold, off-season I drop prices"
              placeholderTextColor={LuxuryColors.textLight}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={500}
              editable={!loading}
            />
            <Text style={styles.characterCount}>{bookingPatterns.length}/500</Text>
          </View>
        );
      
      default:
        return null;
    }
  };

  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return guestProfile.trim().length > 0;
      case 2:
        return competitiveAdvantage.trim().length > 0;
      case 3:
        return bookingPatterns.trim().length > 0;
      default:
        return false;
    }
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
                <Ionicons name="sparkles" size={40} color={LuxuryColors.accent} />
              </View>
              <Text style={styles.title}>
                {isEditing ? 'Update Property Context' : 'Smart Context Capture'}
              </Text>
              <Text style={styles.subtitle}>
                {isEditing 
                  ? 'Update your property context to keep AI advice accurate'
                  : 'Just 3 quick questions to make your AI pricing incredibly accurate'
                }
              </Text>
              
              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(currentStep / 3) * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>Question {currentStep} of 3</Text>
              </View>
            </View>

            {/* Question Card */}
            <LinearGradient 
              colors={LuxuryColors.cardGradient as any}
              style={styles.questionCard}
            >
              {renderQuestion()}
            </LinearGradient>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <View style={styles.navigationButtons}>
                {currentStep > 1 && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                    disabled={loading}
                  >
                    <Ionicons name="chevron-back" size={20} color={LuxuryColors.text} />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    !isCurrentStepValid() && styles.nextButtonDisabled
                  ]}
                  onPress={handleNext}
                  disabled={!isCurrentStepValid() || loading}
                >
                  {loading ? (
                    <Text style={styles.nextButtonText}>Saving...</Text>
                  ) : (
                    <>
                      <Text style={styles.nextButtonText}>
                        {currentStep === 3 ? 'Save & Continue' : 'Next'}
                      </Text>
                      <Ionicons 
                        name={currentStep === 3 ? "checkmark-circle" : "chevron-forward"} 
                        size={20} 
                        color={LuxuryColors.secondary} 
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                disabled={loading}
              >
                <Text style={styles.skipButtonText}>Skip for now</Text>
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
    marginBottom: 32,
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
    fontSize: 28,
    fontFamily: 'Manrope-Bold',
    color: LuxuryColors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(184, 134, 11, 0.2)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: LuxuryColors.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textSecondary,
  },
  questionCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.1)',
  },
  questionContainer: {
    alignItems: 'stretch',
  },
  questionTitle: {
    fontSize: 20,
    fontFamily: 'Manrope-Bold',
    color: LuxuryColors.text,
    marginBottom: 8,
    lineHeight: 28,
  },
  questionSubtitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  textArea: {
    backgroundColor: 'rgba(184, 134, 11, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.2)',
    padding: 16,
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.text,
    minHeight: 160,
    maxHeight: 200,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textLight,
    textAlign: 'right',
    marginTop: 8,
  },
  actionsContainer: {
    gap: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.text,
  },
  nextButton: {
    backgroundColor: LuxuryColors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 140,
    shadowColor: LuxuryColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: LuxuryColors.secondary,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textSecondary,
  },
}); 