import { LuxuryColors } from '@/constants/Colors';
import { AIResult, ApiService, NightData } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DayData {
  date: string;
  day: string;
  currentPrice: number;
  marketPrice: number;
  suggestedPrice: number;
  aiInsight: string;
  boost: string;
}

interface AppData {
  propertyName: string;
  location: string;
  currentPrice: number;
  marketPrice: number;
  suggestedPrice: number;
  priceChange: string;
  totalIncrease: string;
  nextFiveDays: DayData[];
}

export default function MainScreen() {
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [appData, setAppData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(0)).current;

  const toggleDay = (index: number) => {
    setExpandedDays(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Transform backend data to UI format
  const transformBackendData = (nights: NightData[], aiResults?: AIResult[]): AppData => {
    const firstNight = nights[0];
    const currentPrice = firstNight?.your_price || 450;
    const marketPrice = firstNight?.market_avg_price || 425;
    
    // Calculate averages for header
    const avgCurrentPrice = Math.round(nights.reduce((sum, n) => sum + (n.your_price || 0), 0) / nights.length);
    const avgMarketPrice = Math.round(nights.reduce((sum, n) => sum + (n.market_avg_price || 0), 0) / nights.length);
    
    // Transform nights to day format
    const nextFiveDays: DayData[] = nights.slice(0, 5).map((night, index) => {
      const aiResult = aiResults?.find(ai => ai.date === night.date);
      const suggestedPrice = aiResult?.suggested_price || night.your_price || currentPrice;
      const currentNightPrice = night.your_price || currentPrice;
      
      // Calculate boost percentage
      const boost = suggestedPrice && currentNightPrice 
        ? `${suggestedPrice > currentNightPrice ? '+' : ''}${Math.round(((suggestedPrice - currentNightPrice) / currentNightPrice) * 100)}%`
        : "0%";
      
      // Format date
      const dateObj = new Date(night.date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = dateObj.getDate();
      
      return {
        date: `${dateObj.toLocaleDateString('en-US', { month: 'short' })} ${dayNumber}`,
        day: dayName,
        currentPrice: currentNightPrice,
        marketPrice: night.market_avg_price || avgMarketPrice,
        suggestedPrice: suggestedPrice,
        aiInsight: aiResult?.explanation || "Loading AI insights...",
        boost: boost
      };
    });

    // Calculate suggested price for header (average of AI suggestions)
    const avgSuggestedPrice = aiResults?.length 
      ? Math.round(aiResults.reduce((sum, ai) => sum + (ai.suggested_price || 0), 0) / aiResults.length)
      : avgCurrentPrice;

    const priceChange = avgSuggestedPrice && avgCurrentPrice 
      ? `${avgSuggestedPrice > avgCurrentPrice ? '+' : ''}${((avgSuggestedPrice - avgCurrentPrice) / avgCurrentPrice * 100).toFixed(1)}%`
      : "+0%";

    const totalIncrease = avgSuggestedPrice && avgCurrentPrice 
      ? `${avgSuggestedPrice > avgCurrentPrice ? '+' : ''}$${avgSuggestedPrice - avgCurrentPrice}`
      : "+$0";

    return {
      propertyName: "Newport Luxury Property",
      location: "Newport, RI",
      currentPrice: avgCurrentPrice,
      marketPrice: avgMarketPrice,
      suggestedPrice: avgSuggestedPrice,
      priceChange,
      totalIncrease,
      nextFiveDays
    };
  };

  // Start shimmer animation
  const startShimmerAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Simple bounce animation that can't break
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: -8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnimation.stopAnimation();
    pulseAnimation.setValue(0);
  };

  // Fade in animation when data loads
  const startFadeInAnimation = () => {
    fadeAnimation.setValue(0);
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  // Load data from backend
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // When refreshing (not initial load), don't show splash
      if (appData) setShowSplash(false);
      startShimmerAnimation();
      startPulseAnimation(); // Show pulse animation during loading
      
      console.log('🔄 Loading pricing data...');
      
      // Step 1: Fetch pricing data
      const nights = await ApiService.fetchPricingData();
      
      if (!nights || nights.length === 0) {
        throw new Error('No pricing data available');
      }
      
      // Step 2: Transform initial data without AI (for quick display)
      const initialData = transformBackendData(nights);
      setAppData(initialData);
      
      // Step 3: Get AI analysis (can take longer)
      console.log('🤖 Getting AI analysis...');
      const aiResults = await ApiService.analyzeWithAI(nights.slice(0, 5));
      
      // Step 4: Update with AI insights
      const finalData = transformBackendData(nights, aiResults);
      setAppData(finalData);
      
      console.log('✅ Data loaded successfully');
      startFadeInAnimation();
      
    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      
      // Show user-friendly error
      Alert.alert(
        'Unable to Load Data',
        'Could not connect to pricing service. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      shimmerAnimation.stopAnimation();
      stopPulseAnimation();
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
    
    // Hide splash screen after 1.5 seconds to show loading animation + skeletons
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    
    return () => {
      clearTimeout(splashTimer);
      stopPulseAnimation();
      shimmerAnimation.stopAnimation();
    };
  }, []);

  // Cleanup when loading finishes
  useEffect(() => {
    if (!loading) {
      stopPulseAnimation();
    }
  }, [loading]);

  // Show loading state (splash screen)
  if (loading && showSplash) {
    return (
      <View style={styles.container}>
        {/* Same background as main screen */}
        <LinearGradient 
          colors={LuxuryColors.luxuryBackgroundGradient as any}
          style={styles.backgroundGradient}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Animated.View style={{ opacity: shimmerAnimation }}>
              <Text style={[styles.appName, { color: LuxuryColors.accent }]}>mAIrble</Text>
            </Animated.View>
            <View style={styles.loadingTextContainer}>
              <Ionicons name="hourglass-outline" size={24} color={LuxuryColors.textSecondary} />
              <Text style={styles.loadingText}>Fetching your pricing data...</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Show error state
  if (error && !appData && !loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.appName, { color: LuxuryColors.error }]}>Error</Text>
        <Text style={styles.propertyLocation}>Unable to load pricing data</Text>
        <TouchableOpacity 
          style={[styles.primaryButton, { marginTop: 20, width: 200 }]} 
          onPress={loadData}
        >
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Shimmer interpolation for loading effect
  const shimmerOpacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  // Simple loading component that can't break
  const LoadingDots = () => {
    if (!loading) return null;
    
    return (
      <View style={styles.loadingDotsContainer}>
        <Animated.View style={{ transform: [{ translateY: pulseAnimation }] }}>
          <Text style={styles.loadingDotsText}>● ● ●</Text>
        </Animated.View>
      </View>
    );
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <View style={styles.dayContainer}>
      <Animated.View style={[styles.dayItem, { opacity: shimmerOpacity }]}>
        <View style={styles.dayLeft}>
          <View style={styles.dateInfo}>
            <View style={[styles.skeletonText, styles.skeletonSmall]} />
            <View style={[styles.skeletonText, styles.skeletonMedium]} />
          </View>
          <View style={styles.priceInfo}>
            <View style={styles.priceFlow}>
              <View style={[styles.skeletonText, styles.skeletonLarge]} />
              <View style={[styles.skeletonText, styles.skeletonMedium, { marginLeft: 10 }]} />
            </View>
          </View>
        </View>
        <View style={[styles.skeletonText, styles.skeletonSmall]} />
      </Animated.View>
    </View>
  );

  // Use appData or default loading data
  const defaultLoadingData: AppData = {
    propertyName: "Newport Luxury Property",
    location: "Newport, RI",
    currentPrice: 0,
    marketPrice: 0,
    suggestedPrice: 0,
    priceChange: "+0%",
    totalIncrease: "+$0",
    nextFiveDays: []
  };
  
  const data = appData || defaultLoadingData;

  return (
    <View style={styles.container}>
      {/* High Contrast Background */}
      <LinearGradient 
        colors={LuxuryColors.luxuryBackgroundGradient as any}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Elite Split Background */}
      <LinearGradient 
        colors={LuxuryColors.darkBackgroundGradient as any}
        style={styles.splitDarkSection}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Rich Gold Transition */}
      <LinearGradient 
        colors={LuxuryColors.darkGoldGradient as any}
        style={styles.goldTransition}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      

      {/* Elite Accent */}
      <View style={styles.eliteAccent} />
      
      {/* Luxury Corner Detail */}
      <LinearGradient 
        colors={['rgba(184, 134, 11, 0.4)', 'transparent']}
        style={styles.luxuryCorner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Clean Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>mAIrble</Text>
            <Text style={styles.propertyLocation}>{data.propertyName} • {data.location}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Text style={styles.profileInitial}>B</Text>
          </TouchableOpacity>
        </View>

        {/* Current Pricing - Dark Elite Card */}
        <Animated.View style={{ opacity: loading ? 0.7 : fadeAnimation }}>
          <LinearGradient 
            colors={LuxuryColors.darkEliteGradient as any}
            style={styles.pricingCard}
          >
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingTitle}>Current Rate</Text>
            <View style={styles.potentialTag}>
              <Text style={styles.potentialText}>{data.totalIncrease} potential</Text>
            </View>
          </View>
          <View style={styles.pricingGrid}>
            <View style={styles.priceItem}>
              <Text style={styles.priceValue}>${data.currentPrice}</Text>
              <Text style={styles.priceLabel}>Your Price</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceValue}>${data.marketPrice}</Text>
              <Text style={styles.priceLabel}>Market Avg</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={[styles.priceValue, styles.suggestedPrice]}>${data.suggestedPrice}</Text>
              <Text style={[styles.priceLabel, styles.suggestedLabel]}>AI Suggests</Text>
            </View>
          </View>
        </LinearGradient>
        </Animated.View>

        {/* Upcoming Days - Minimal Design */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Next 5 Days</Text>
          <TouchableOpacity 
            style={[styles.refreshButton, loading && styles.refreshButtonLoading]} 
            onPress={loadData}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={loading ? "hourglass" : "refresh"} 
              size={18} 
              color={loading ? LuxuryColors.textLight : LuxuryColors.accent} 
            />
            <Text style={[styles.refreshButtonText, loading && styles.refreshButtonTextLoading]}>
              {loading ? 'Updating...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View>
            <LoadingDots />
            <Text style={styles.loadingIndicatorText}>
              {appData ? 'Updating pricing insights...' : 'Loading pricing insights...'}
            </Text>
          </View>
        )}
        
        {loading ? (
          // Show loading skeletons
          Array.from({ length: 5 }).map((_, index) => (
            <LoadingSkeleton key={`skeleton-${index}`} />
          ))
        ) : (
          // Show actual data with fade-in animation
          <Animated.View style={{ opacity: fadeAnimation }}>
            {data.nextFiveDays.map((day: DayData, index: number) => (
          <View key={index} style={styles.dayContainer}>
            <TouchableOpacity 
              onPress={() => toggleDay(index)}
              activeOpacity={0.7}
            >
              <LinearGradient 
                colors={LuxuryColors.dayCardGradient as any}
                style={[
                  styles.dayItem, 
                  expandedDays.includes(index) && styles.dayItemExpanded
                ]}
              >
              <View style={styles.dayLeft}>
                <View style={styles.dateInfo}>
                  <Text style={styles.dayName}>{day.day}</Text>
                  <Text style={styles.dateNumber}>{day.date.split(' ')[1]}</Text>
                </View>
                <View style={styles.priceInfo}>
                  <View style={styles.priceFlow}>
                    <Text style={styles.currentPrice}>${day.currentPrice}</Text>
                    <Ionicons 
                      name={day.suggestedPrice > day.currentPrice ? "trending-up" : "trending-down"} 
                      size={16} 
                      color={LuxuryColors.accent} 
                      style={styles.trendIcon}
                    />
                    <Text style={[
                      styles.suggestedPriceHighlight,
                      styles.goldGlow
                    ]}>
                      ${day.suggestedPrice}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons 
                name={expandedDays.includes(index) ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={LuxuryColors.textSecondary} 
              />
              </LinearGradient>
            </TouchableOpacity>

            {expandedDays.includes(index) && (
              <LinearGradient 
                colors={LuxuryColors.lightSurfaceGradient as any}
                style={styles.expandedContent}
              >
                {/* AI's Take - Clean Card */}
                <LinearGradient 
                  colors={LuxuryColors.cardGradient as any}
                  style={styles.aiTakeCard}
                >
                  <View style={styles.aiTakeHeader}>
                    <Ionicons name="sparkles" size={16} color={LuxuryColors.accent} />
                    <Text style={styles.aiTakeTitle}>AI's Take</Text>
                  </View>
                  <Text style={styles.aiTakeText}>{day.aiInsight}</Text>
                </LinearGradient>

                {/* Quick Stats */}
                <View style={styles.quickStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>${day.currentPrice}</Text>
                    <Text style={styles.statLabel}>Your Price</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>${day.marketPrice}</Text>
                    <Text style={styles.statLabel}>Market Avg</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, styles.suggestedStat]}>${day.suggestedPrice}</Text>
                    <Text style={[styles.statLabel, styles.suggestedStatLabel]}>AI Suggests</Text>
                  </View>
                </View>
                </LinearGradient>
            )}
          </View>
            ))}
          </Animated.View>
        )}

        {/* Single Action Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert(
                'Apply AI Suggestions',
                'This will update your pricing based on AI recommendations. This feature will be available soon!',
                [{ text: 'OK' }]
              );
            }}
          >
            <LinearGradient 
              colors={LuxuryColors.moneyGoldGradient as any}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Loading...' : 'Apply All AI Suggestions'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        </ScrollView>
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
  goldOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '40%',
  },
  splitDarkSection: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '60%',
    height: '100%',
    opacity: 0.15,
  },
  goldTransition: {
    position: 'absolute',
    left: '45%',
    top: 0,
    width: '30%',
    height: '100%',
    opacity: 0.8,
  },

  eliteAccent: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: LuxuryColors.eliteAccentBg,
    shadowColor: LuxuryColors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
    elevation: 8,
  },
  luxuryCorner: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    shadowColor: '#6B4E00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 6,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LuxuryColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LuxuryColors.border,
    shadowColor: LuxuryColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshButtonLoading: {
    opacity: 0.6,
    borderColor: LuxuryColors.textLight,
  },
  refreshButtonText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: LuxuryColors.accent,
    marginLeft: 6,
  },
  refreshButtonTextLoading: {
    color: LuxuryColors.textLight,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Manrope-ExtraBold',
    color: LuxuryColors.primary,
    marginBottom: 2,
    textShadowColor: 'rgba(212, 175, 55, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: LuxuryColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
    color: LuxuryColors.secondary,
  },
  propertyLocation: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textSecondary,
  },
  pricingCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 28,
    marginBottom: 32,
    shadowColor: LuxuryColors.shadowDark,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 35,
    elevation: 25,
    borderWidth: 3,
    borderColor: LuxuryColors.goldBorder,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pricingTitle: {
    fontSize: 20,
    fontFamily: 'Manrope-Bold',
    color: LuxuryColors.secondary,
  },
  potentialTag: {
    backgroundColor: `${LuxuryColors.success}25`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${LuxuryColors.success}40`,
  },
  potentialText: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: LuxuryColors.success,
  },
  pricingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceValue: {
    fontSize: 28,
    fontFamily: 'Manrope-Bold',
    color: LuxuryColors.secondary,
    marginBottom: 6,
  },
  suggestedPrice: {
    color: LuxuryColors.accent,
    fontSize: 32,
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textLight,
  },
  suggestedLabel: {
    color: LuxuryColors.accent,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Manrope-Bold',
    color: LuxuryColors.primary,
  },
  dayContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  dayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#B8860B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  dayItemExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateInfo: {
    marginRight: 20,
    alignItems: 'center',
    minWidth: 40,
  },
  dayName: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: LuxuryColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateNumber: {
    fontSize: 24,
    fontFamily: 'Manrope-Bold',
    color: LuxuryColors.accent,
    marginTop: 2,
  },
  priceInfo: {
    flex: 1,
  },
  priceFlow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPrice: {
    fontSize: 20,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textSecondary,
    marginRight: 8,
  },
  trendIcon: {
    marginHorizontal: 6,
  },
  suggestedPriceHighlight: {
    fontSize: 22,
    fontFamily: 'Manrope-Bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  goldGlow: {
    color: LuxuryColors.accent,
    backgroundColor: LuxuryColors.goldGlowBg,
    shadowColor: LuxuryColors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: LuxuryColors.goldGlowBorder,
  },

  expandedContent: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginTop: 0,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#B8860B',
  },
  aiTakeCard: {
    padding: 20,
    borderRadius: 16,
    margin: 16,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#B8860B',
  },
  aiTakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTakeTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: LuxuryColors.accent,
    marginLeft: 8,
  },
  aiTakeText: {
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textSecondary,
    lineHeight: 22,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Manrope-Bold',
    color: LuxuryColors.primary,
    marginBottom: 4,
  },
  suggestedStat: {
    color: LuxuryColors.accent,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textSecondary,
  },
  suggestedStatLabel: {
    color: LuxuryColors.accent,
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 2,
    borderColor: '#6B4E00',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: LuxuryColors.secondary,
  },
  // Loading skeleton styles
  skeletonText: {
    backgroundColor: LuxuryColors.border,
    borderRadius: 4,
  },
  skeletonSmall: {
    width: 40,
    height: 12,
    marginVertical: 2,
  },
  skeletonMedium: {
    width: 80,
    height: 16,
    marginVertical: 2,
  },
  skeletonLarge: {
    width: 120,
    height: 20,
    marginVertical: 2,
  },
  // Loading screen styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textSecondary,
    marginLeft: 12,
  },
  // Simple loading dots styles
  loadingDotsContainer: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 8,
  },
  loadingDotsText: {
    fontSize: 18,
    color: LuxuryColors.accent,
    fontFamily: 'Manrope-Medium',
    letterSpacing: 4,
  },
  loadingIndicatorText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: LuxuryColors.textLight,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
});
