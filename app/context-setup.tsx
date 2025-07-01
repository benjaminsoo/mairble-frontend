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
    TouchableOpacity,
    View,
} from 'react-native';

export default function ContextSetupScreen() {
  const [mainGuest, setMainGuest] = useState('');
  const [specialFeature, setSpecialFeature] = useState<string[]>([]);
  const [pricingGoal, setPricingGoal] = useState<string[]>([]);
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
        setMainGuest(existingContext.mainGuest);
        setSpecialFeature(existingContext.specialFeature || []);
        setPricingGoal(existingContext.pricingGoal || []);
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
    if (!mainGuest.trim() || specialFeature.length === 0 || pricingGoal.length === 0) {
      Alert.alert('Missing Information', 'Please answer all 3 questions to continue.');
      return;
    }

    setLoading(true);

    try {
      const context: PropertyContext = {
        mainGuest: mainGuest.trim(),
        specialFeature: specialFeature,
        pricingGoal: pricingGoal,
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

  const renderSingleSelectOption = (value: string, selectedValue: string, onSelect: (value: string) => void, label: string, description?: string) => (
    <TouchableOpacity
      key={value}
      style={[
        styles.dropdownOption,
        selectedValue === value && styles.dropdownOptionSelected
      ]}
      onPress={() => onSelect(value)}
      disabled={loading}
    >
      <View style={styles.dropdownOptionContent}>
        <View style={styles.dropdownOptionHeader}>
          <View style={[
            styles.radioButton,
            selectedValue === value && styles.radioButtonSelected
          ]}>
            {selectedValue === value && <View style={styles.radioButtonInner} />}
          </View>
          <Text style={[
            styles.dropdownOptionLabel,
            selectedValue === value && styles.dropdownOptionLabelSelected
          ]}>
            {label}
          </Text>
        </View>
        {description && (
          <Text style={[
            styles.dropdownOptionDescription,
            selectedValue === value && styles.dropdownOptionDescriptionSelected
          ]}>
            {description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMultiSelectOption = (value: string, selectedValues: string[], onToggle: (value: string) => void, label: string, description?: string) => {
    const isSelected = selectedValues.includes(value);
    
    return (
      <TouchableOpacity
        key={value}
        style={[
          styles.dropdownOption,
          isSelected && styles.dropdownOptionSelected
        ]}
        onPress={() => onToggle(value)}
        disabled={loading}
      >
        <View style={styles.dropdownOptionContent}>
          <View style={styles.dropdownOptionHeader}>
            <View style={[
              styles.checkboxButton,
              isSelected && styles.checkboxButtonSelected
            ]}>
              {isSelected && <Ionicons name="checkmark" size={14} color={LuxuryColors.secondary} />}
            </View>
            <Text style={[
              styles.dropdownOptionLabel,
              isSelected && styles.dropdownOptionLabelSelected
            ]}>
              {label}
            </Text>
          </View>
          {description && (
            <Text style={[
              styles.dropdownOptionDescription,
              isSelected && styles.dropdownOptionDescriptionSelected
            ]}>
              {description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const toggleSpecialFeature = (value: string) => {
    setSpecialFeature(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const togglePricingGoal = (value: string) => {
    setPricingGoal(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const renderQuestion = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>
              Who is your main guest?
            </Text>
            <View style={styles.dropdownContainer}>
              {renderSingleSelectOption(
                'Leisure',
                mainGuest,
                setMainGuest,
                'Leisure',
                'Often book further in advance, sensitive to total cost, look for amenities and experiences. Weekends, holidays, summer are key.'
              )}
              {renderSingleSelectOption(
                'Business',
                mainGuest,
                setMainGuest,
                'Business',
                'Often book last-minute, less price-sensitive, prioritize location, workspace, reliable internet. Weekdays are key.'
              )}
              {renderSingleSelectOption(
                'Groups',
                mainGuest,
                setMainGuest,
                'Groups',
                'Highly sensitive to per-person cost, look for capacity and entertainment. Weekends and events are key.'
              )}
            </View>
          </View>
        );
      
      case 2:
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>
              What makes your property special?
            </Text>
            <View style={styles.dropdownContainer}>
              {renderMultiSelectOption(
                'Location',
                specialFeature,
                toggleSpecialFeature,
                'Location (e.g., Beachfront, Downtown, Mountain View)',
                'Proximity to key attractions, natural beauty, or urban convenience. This is often the #1 driver for guests.'
              )}
              {renderMultiSelectOption(
                'Unique Amenity',
                specialFeature,
                toggleSpecialFeature,
                'Unique Amenity (e.g., Hot Tub, Pool, Sauna, Home Theater)',
                'Specific features that are rare or highly desirable in your market, justifying a premium.'
              )}
              {renderMultiSelectOption(
                'Size/Capacity',
                specialFeature,
                toggleSpecialFeature,
                'Size/Capacity (e.g., Sleeps 10+, Multiple Bedrooms/Baths)',
                'Ability to accommodate larger groups, which often means higher per-night rates and less competition.'
              )}
              {renderMultiSelectOption(
                'Luxury/Design',
                specialFeature,
                toggleSpecialFeature,
                'Luxury/Design (e.g., High-end finishes, Architecturally unique)',
                'Premium aesthetic and comfort that appeals to discerning guests willing to pay more.'
              )}
              {renderMultiSelectOption(
                'Pet-Friendly',
                specialFeature,
                toggleSpecialFeature,
                'Pet-Friendly (with specific features like fenced yard)',
                'Taps into a specific, often underserved market segment willing to pay a premium for their pets.'
              )}
              {renderMultiSelectOption(
                'Exceptional View',
                specialFeature,
                toggleSpecialFeature,
                'Exceptional View (e.g., Ocean, City Skyline, Mountain Panorama)',
                'A visual appeal that significantly enhances the guest experience and justifies higher rates.'
              )}
              {renderMultiSelectOption(
                'Unique Experience',
                specialFeature,
                toggleSpecialFeature,
                'Unique Experience (e.g., Historic property, Farm stay, Glamping)',
                'Offers something truly different that guests can\'t find elsewhere, creating strong demand.'
              )}
            </View>
          </View>
        );
      
      case 3:
        return (
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>
              What's your top pricing goal?
            </Text>
            <View style={styles.dropdownContainer}>
              {renderMultiSelectOption(
                'Fill Dates',
                pricingGoal,
                togglePricingGoal,
                'Fill Dates',
                'LLM will prioritize getting a booking, even if it means a lower price. This directly solves your "unbooked dates at $1000" problem – the LLM knows you\'d rather get $750 than $0.'
              )}
              {renderMultiSelectOption(
                'Max Price',
                pricingGoal,
                togglePricingGoal,
                'Max Price',
                'LLM will push for the highest possible rate, even if it means slightly fewer bookings. It will justify this by highlighting your property\'s special features and target guest\'s willingness to pay.'
              )}
              {renderMultiSelectOption(
                'Avoid Bad Guests',
                pricingGoal,
                togglePricingGoal,
                'Avoid Bad Guests',
                'LLM will recommend pricing strategies that naturally filter for higher-quality guests, even if it means leaving some money on the table or having slightly lower occupancy. It might suggest not dropping below a certain price floor.'
              )}
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return mainGuest.trim().length > 0;
      case 2:
        return specialFeature.length > 0;
      case 3:
        return pricingGoal.length > 0;
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
    fontFamily: 'Inter-Bold',
    color: LuxuryColors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Bold',
    color: LuxuryColors.text,
    marginBottom: 8,
    lineHeight: 28,
  },
  questionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  dropdownContainer: {
    gap: 12,
  },
  dropdownOption: {
    backgroundColor: 'rgba(184, 134, 11, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.2)',
    padding: 16,
  },
  dropdownOptionSelected: {
    borderColor: LuxuryColors.accent,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
  },
  dropdownOptionContent: {
    flex: 1,
  },
  dropdownOptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(184, 134, 11, 0.4)',
    borderRadius: 10,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: LuxuryColors.accent,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: LuxuryColors.accent,
  },
  checkboxButton: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(184, 134, 11, 0.4)',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxButtonSelected: {
    borderColor: LuxuryColors.accent,
    backgroundColor: LuxuryColors.accent,
  },
  dropdownOptionLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: LuxuryColors.text,
    flex: 1,
    lineHeight: 22,
  },
  dropdownOptionLabelSelected: {
    color: LuxuryColors.accent,
  },
  dropdownOptionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
    lineHeight: 20,
    marginLeft: 32,
  },
  dropdownOptionDescriptionSelected: {
    color: LuxuryColors.text,
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Bold',
    color: LuxuryColors.secondary,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
  },
}); 