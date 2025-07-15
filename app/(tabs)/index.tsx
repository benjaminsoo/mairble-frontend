import { LuxuryColors } from '@/constants/Colors';
import { AIResult, ApiService, NightData, SinglePriceUpdateRequest } from '@/services/api';
import { mainScreenStyles } from '@/styles/MainScreenStyles';
import { AppData, CustomTimeWindowData, DayData } from '@/types/MainScreenTypes';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

export default function MainScreen() {
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [appData, setAppData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [updatingDays, setUpdatingDays] = useState<Set<number>>(new Set());
  const [customPrices, setCustomPrices] = useState<{ [key: string]: string }>({});
  
  // Updated state for custom time window with calendar
  const [customWindow, setCustomWindow] = useState<CustomTimeWindowData>({
    days: [],
    startDate: null,
    endDate: null,
    isLoading: false,
    showCalendar: false
  });
  const [expandedCustomDays, setExpandedCustomDays] = useState<number[]>([]);
  const [showCustomWindow, setShowCustomWindow] = useState(false);

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

  // Handle price update for individual days
  const handleUpdatePrice = async (dayIndex: number, useAIPrice: boolean = true) => {
    if (!appData) return;
    
    const day = appData.nextFiveDays[dayIndex];
    if (!day) return;
    
    // Get the price to update to
    let priceToUpdate: number;
    if (useAIPrice) {
      priceToUpdate = day.suggestedPrice;
    } else {
      const customPrice = customPrices[dayIndex];
      if (!customPrice || isNaN(parseFloat(customPrice))) {
        Alert.alert('Invalid Price', 'Please enter a valid price amount.');
        return;
      }
      priceToUpdate = parseFloat(customPrice);
    }
    
    // Show confirmation dialog
    const priceType = useAIPrice ? 'AI recommended' : 'custom';
    const confirmMessage = `Update ${day.date} (${day.day}) price to $${priceToUpdate}?\n\nThis will ${priceType === 'AI recommended' ? 'use the AI recommended price' : 'set your custom price'} in PriceLabs.`;
    
    Alert.alert(
      'Confirm Price Update',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Update Price', 
          style: 'default',
          onPress: () => performPriceUpdate(dayIndex, priceToUpdate, day.date)
        }
      ]
    );
  };
  
  // Perform the actual price update
  const performPriceUpdate = async (dayIndex: number, price: number, originalDate: string) => {
    try {
      // Add to updating set
      setUpdatingDays(prev => new Set(prev).add(dayIndex));
      
      // Use the original API date format directly
      const day = appData?.nextFiveDays[dayIndex];
      if (!day) throw new Error('Day data not found');
      
      const apiDate = day.originalDate; // Use stored original date
      
      console.log(`🔄 Updating price for ${day.date} (API date: ${apiDate}) to $${price}`);
      
      const updateRequest: SinglePriceUpdateRequest = {
        date: apiDate,
        price: price,
        price_type: 'fixed',
        currency: 'USD',
        update_children: false
      };
      
      const result = await ApiService.updateSinglePrice(updateRequest);
      
      if (result.success) {
        Alert.alert(
          'Success!',
          result.message,
          [{ text: 'OK', onPress: () => loadData() }] // Refresh data after successful update
        );
        
        // Clear custom price input
        setCustomPrices(prev => {
          const updated = { ...prev };
          delete updated[dayIndex];
          return updated;
        });
      } else {
        Alert.alert(
          'Update Failed',
          result.message || 'Failed to update price. Please try again.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Error updating price:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      
      // Check if it's a configuration error
      if (errorMessage.includes('Listing ID') || errorMessage.includes('not configured')) {
        Alert.alert(
          'Configuration Required',
          'Your Listing ID is not configured. Please set it up in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go to Settings', 
              style: 'default',
              onPress: () => router.push('/settings')
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } finally {
      // Remove from updating set
      setUpdatingDays(prev => {
        const updated = new Set(prev);
        updated.delete(dayIndex);
        return updated;
      });
    }
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
      
      // Format date - Fix timezone issue by parsing manually
      const [year, month, day] = night.date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = dateObj.getDate();
      
      return {
        date: `${dateObj.toLocaleDateString('en-US', { month: 'short' })} ${dayNumber}`,
        originalDate: night.date,
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
      propertyName: "Test Luxury Property",
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      
      // Show the actual error message from the API
      Alert.alert(
        'Unable to Load Data',
        errorMessage,
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
      <SafeAreaView style={mainScreenStyles.container}>
        <LinearGradient 
          colors={LuxuryColors.luxuryBackgroundGradient as any}
          style={mainScreenStyles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={mainScreenStyles.eliteAccent} />
        <View style={mainScreenStyles.luxuryCorner} />
        <View style={mainScreenStyles.safeArea}>
          <View style={mainScreenStyles.loadingContainer}>
            <Animated.View style={{ opacity: shimmerAnimation }}>
              <Text style={[mainScreenStyles.appName, { color: LuxuryColors.accent }]}>mAIrble</Text>
            </Animated.View>
            <View style={mainScreenStyles.loadingTextContainer}>
              <Ionicons name="hourglass-outline" size={24} color={LuxuryColors.textSecondary} />
              <Text style={mainScreenStyles.loadingText}>Fetching your pricing data...</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error && !appData && !loading) {
    return (
      <SafeAreaView style={mainScreenStyles.container}>
        <LinearGradient 
          colors={LuxuryColors.luxuryBackgroundGradient as any}
          style={mainScreenStyles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={mainScreenStyles.eliteAccent} />
        <View style={mainScreenStyles.luxuryCorner} />
        <View style={mainScreenStyles.safeArea}>
          <View style={[mainScreenStyles.errorContainer]}>
            <Ionicons name="warning-outline" size={48} color={LuxuryColors.error} />
            <Text style={[mainScreenStyles.appName, { color: LuxuryColors.error, marginTop: 16 }]}>Connection Error</Text>
            <Text style={[mainScreenStyles.propertyLocation, { textAlign: 'center', marginHorizontal: 20 }]}>
              Unable to load pricing data. This might be due to an invalid API key or network issue.
            </Text>
            
            <View style={mainScreenStyles.errorButtonContainer}>
              <TouchableOpacity 
                style={[mainScreenStyles.secondaryButton, { marginBottom: 12 }]} 
                onPress={() => router.push('/settings')}
              >
                <Ionicons name="settings-outline" size={20} color={LuxuryColors.accent} style={{ marginRight: 8 }} />
                <Text style={mainScreenStyles.secondaryButtonText}>Go to Settings</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[mainScreenStyles.secondaryButton]} 
                onPress={loadData}
              >
                <Ionicons name="refresh-outline" size={20} color={LuxuryColors.accent} style={{ marginRight: 8 }} />
                <Text style={mainScreenStyles.secondaryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
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
      <View style={mainScreenStyles.loadingDotsContainer}>
        <Animated.View style={{ transform: [{ translateY: pulseAnimation }] }}>
          <Text style={mainScreenStyles.loadingDotsText}>● ● ●</Text>
        </Animated.View>
      </View>
    );
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <View style={mainScreenStyles.dayContainer}>
      <Animated.View style={[mainScreenStyles.dayItem, { opacity: shimmerOpacity }]}>
        <View style={mainScreenStyles.dayLeft}>
          <View style={mainScreenStyles.dateInfo}>
            <View style={[mainScreenStyles.skeletonText, mainScreenStyles.skeletonSmall]} />
            <View style={[mainScreenStyles.skeletonText, mainScreenStyles.skeletonMedium]} />
          </View>
          <View style={mainScreenStyles.priceInfo}>
            <View style={mainScreenStyles.priceFlow}>
              <View style={[mainScreenStyles.skeletonText, mainScreenStyles.skeletonLarge]} />
              <View style={[mainScreenStyles.skeletonText, mainScreenStyles.skeletonMedium, { marginLeft: 10 }]} />
            </View>
          </View>
        </View>
        <View style={[mainScreenStyles.skeletonText, mainScreenStyles.skeletonSmall]} />
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

  // Utility function to chunk array into smaller arrays
  const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Batch process AI analysis for large datasets
  const batchAnalyzeWithAI = async (nights: NightData[]): Promise<AIResult[]> => {
    const chunks = chunkArray(nights, 5); // Max 5 days per OpenAI call
    const allResults: AIResult[] = [];
    
    console.log(`🔄 Processing ${nights.length} nights in ${chunks.length} batches of max 5 days each`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`📊 Processing batch ${i + 1}/${chunks.length} (${chunk.length} nights)`);
      
      try {
        const chunkResults = await ApiService.analyzeWithAI(chunk);
        allResults.push(...chunkResults);
        
        // Add small delay between batches to be respectful to the API
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Error processing batch ${i + 1}:`, error);
        // Continue with other batches even if one fails
      }
    }
    
    return allResults;
  };

  // Helper function to format date for display
  const formatDateDisplay = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00'); // Avoid timezone issues
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayString = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get max date (90 days from today) in YYYY-MM-DD format
  const getMaxDateString = (): string => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    return maxDate.toISOString().split('T')[0];
  };

  // Validate date range
  const validateDateRange = (startDate: string, endDate: string): { valid: boolean; message?: string } => {
    const today = getTodayString();
    const maxDate = getMaxDateString(); // 90 days from today
    
    if (startDate < today) {
      return { valid: false, message: 'Start date cannot be in the past' };
    }

    if (endDate <= startDate) {
      return { valid: false, message: 'End date must be after start date' };
    }

    if (endDate > maxDate) {
      return { valid: false, message: 'End date cannot be more than 90 days from today' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 30) {
      return { valid: false, message: 'Date range cannot exceed 30 days' };
    }

    return { valid: true };
  };

  // Handle calendar date selection
  const handleCalendarDayPress = (day: any) => {
    const selectedDate = day.dateString;
    
    if (!customWindow.startDate || (customWindow.startDate && customWindow.endDate)) {
      // Start new selection
      setCustomWindow(prev => ({
        ...prev,
        startDate: selectedDate,
        endDate: null
      }));
    } else if (customWindow.startDate && !customWindow.endDate) {
      // Complete the range
      if (selectedDate <= customWindow.startDate) {
        // Selected date is before start, make it the new start
        setCustomWindow(prev => ({
          ...prev,
          startDate: selectedDate,
          endDate: null
        }));
      } else {
        // Valid end date
        const validation = validateDateRange(customWindow.startDate, selectedDate);
        if (!validation.valid) {
          Alert.alert('Invalid Date Range', validation.message);
          return;
        }
        
        setCustomWindow(prev => ({
          ...prev,
          endDate: selectedDate
        }));
      }
    }
  };

  // Get marked dates for calendar
  const getMarkedDates = () => {
    if (!customWindow.startDate) return {};
    
    const marked: any = {};
    
    if (customWindow.startDate && !customWindow.endDate) {
      // Only start date selected
      marked[customWindow.startDate] = {
        selected: true,
        selectedColor: LuxuryColors.accent,
        selectedTextColor: LuxuryColors.surface
      };
    } else if (customWindow.startDate && customWindow.endDate) {
      // Both dates selected - create range
      const start = new Date(customWindow.startDate);
      const end = new Date(customWindow.endDate);
      
      marked[customWindow.startDate] = {
        selected: true,
        selectedColor: LuxuryColors.accent,
        selectedTextColor: LuxuryColors.surface
      };
      
      marked[customWindow.endDate] = {
        selected: true,
        selectedColor: LuxuryColors.accent,
        selectedTextColor: LuxuryColors.surface
      };
      
      // Mark intermediate dates
      const current = new Date(start);
      current.setDate(current.getDate() + 1);
      
      while (current < end) {
        const dateString = current.toISOString().split('T')[0];
        marked[dateString] = {
          selected: true,
          selectedColor: LuxuryColors.accent + '40',
          selectedTextColor: LuxuryColors.text
        };
        current.setDate(current.getDate() + 1);
      }
    }
    
    return marked;
  };

  // Load custom time window data with selected dates
  const loadCustomTimeWindow = async () => {
    if (!customWindow.startDate || !customWindow.endDate) {
      Alert.alert('Select Date Range', 'Please select both start and end dates.');
      return;
    }

    const validation = validateDateRange(customWindow.startDate, customWindow.endDate);
    if (!validation.valid) {
      Alert.alert('Invalid Date Range', validation.message);
      return;
    }

    try {
      setCustomWindow(prev => ({ ...prev, isLoading: true }));
      setError(null);

      const start = new Date(customWindow.startDate);
      const end = new Date(customWindow.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`📅 Loading custom window: ${customWindow.startDate} to ${customWindow.endDate} (${daysDiff} days)`);

      // Fetch pricing data for custom range
      const nights = await ApiService.fetchCustomRangePricingData(customWindow.startDate, customWindow.endDate);
      console.log(`📊 Retrieved ${nights.length} nights for custom window`);

      if (nights.length === 0) {
        setCustomWindow(prev => ({ ...prev, days: [], isLoading: false }));
        Alert.alert('No Data', 'No available nights found in the selected date range.');
        return;
      }

      // Batch process AI analysis
      const aiResults = await batchAnalyzeWithAI(nights);
      console.log(`🤖 Completed AI analysis for ${aiResults.length} results`);

      // Transform data for UI
      const customDays = transformNightsToCustomDays(nights, aiResults);
      
      setCustomWindow(prev => ({
        ...prev,
        days: customDays,
        isLoading: false
      }));

      console.log(`✅ Custom window loaded successfully: ${customDays.length} days`);

    } catch (error) {
      console.error('❌ Error loading custom time window:', error);
      setError(error instanceof Error ? error.message : 'Failed to load custom time window');
      setCustomWindow(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Clear date selection
  const clearDateSelection = () => {
    setCustomWindow(prev => ({
      ...prev,
      startDate: null,
      endDate: null,
      days: []
    }));
  };

  // Transform nights data to custom days format
  const transformNightsToCustomDays = (nights: NightData[], aiResults: AIResult[]): DayData[] => {
    return nights.map((night, index) => {
      const aiResult = aiResults.find(ai => ai.date === night.date);
      const suggestedPrice = aiResult?.suggested_price || night.your_price || 450;
      const currentNightPrice = night.your_price || 450;
      
      // Calculate boost percentage
      const boost = suggestedPrice && currentNightPrice 
        ? `${suggestedPrice > currentNightPrice ? '+' : ''}${Math.round(((suggestedPrice - currentNightPrice) / currentNightPrice) * 100)}%`
        : "0%";
      
      // Format date
      const [year, month, day] = night.date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = dateObj.getDate();
      
      return {
        date: `${dateObj.toLocaleDateString('en-US', { month: 'short' })} ${dayNumber}`,
        originalDate: night.date,
        day: dayName,
        currentPrice: currentNightPrice,
        marketPrice: night.market_avg_price || 425,
        suggestedPrice: suggestedPrice,
        aiInsight: aiResult?.explanation || "AI analysis completed",
        boost: boost
      };
    });
  };

  // Toggle custom day expansion
  const toggleCustomDay = (index: number) => {
    setExpandedCustomDays(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Handle custom day price update
  const handleUpdateCustomDayPrice = async (dayIndex: number, useAIPrice: boolean = true) => {
    const day = customWindow.days[dayIndex];
    if (!day) return;
    
    // Get the price to update to
    let priceToUpdate: number;
    if (useAIPrice) {
      priceToUpdate = day.suggestedPrice;
    } else {
      const customPrice = customPrices[`custom_${dayIndex}`];
      if (!customPrice || isNaN(parseFloat(customPrice))) {
        Alert.alert('Invalid Price', 'Please enter a valid price amount.');
        return;
      }
      priceToUpdate = parseFloat(customPrice);
    }
    
    // Show confirmation dialog
    const priceType = useAIPrice ? 'AI recommended' : 'custom';
    const confirmMessage = `Update ${day.date} (${day.day}) price to $${priceToUpdate}?\n\nThis will ${priceType === 'AI recommended' ? 'use the AI recommended price' : 'set your custom price'} in PriceLabs.`;
    
    Alert.alert(
      'Confirm Price Update',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Update Price', 
          style: 'default',
          onPress: () => performCustomDayPriceUpdate(dayIndex, priceToUpdate)
        }
      ]
    );
  };

  // Perform custom day price update
  const performCustomDayPriceUpdate = async (dayIndex: number, price: number) => {
    try {
      const day = customWindow.days[dayIndex];
      if (!day) throw new Error('Day data not found');
      
      const updateRequest: SinglePriceUpdateRequest = {
        date: day.originalDate,
        price: price,
        price_type: 'fixed',
        currency: 'USD',
        update_children: false
      };
      
      const result = await ApiService.updateSinglePrice(updateRequest);
      
      if (result.success) {
        Alert.alert(
          'Success!',
          result.message,
          [{ text: 'OK', onPress: () => loadCustomTimeWindow() }]
        );
        
        // Clear custom price input
        setCustomPrices(prev => {
          const updated = { ...prev };
          delete updated[`custom_${dayIndex}`];
          return updated;
        });
      } else {
        Alert.alert(
          'Update Failed',
          result.message || 'Failed to update price. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error updating custom day price:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={mainScreenStyles.container}>
      {/* High Contrast Background */}
      <LinearGradient 
        colors={LuxuryColors.luxuryBackgroundGradient as any}
        style={mainScreenStyles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Elite Split Background */}
      <LinearGradient 
        colors={LuxuryColors.darkBackgroundGradient as any}
        style={mainScreenStyles.splitDarkSection}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Rich Gold Transition */}
      <LinearGradient 
        colors={LuxuryColors.darkGoldGradient as any}
        style={mainScreenStyles.goldTransition}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      

      {/* Elite Accent */}
      <View style={mainScreenStyles.eliteAccent} />
      
      {/* Luxury Corner Detail */}
      <LinearGradient 
        colors={['rgba(184, 134, 11, 0.4)', 'transparent']}
        style={mainScreenStyles.luxuryCorner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={mainScreenStyles.safeArea}>
        <ScrollView style={mainScreenStyles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Clean Header */}
        <View style={mainScreenStyles.header}>
          <View>
            <Text style={mainScreenStyles.appName}>mAIrble</Text>
            <Text style={mainScreenStyles.propertyLocation}>{data.propertyName} • {data.location}</Text>
          </View>
          <TouchableOpacity style={mainScreenStyles.profileButton} onPress={() => router.push('/settings')}>
            <Text style={mainScreenStyles.profileInitial}>B</Text>
          </TouchableOpacity>
        </View>

        {/* Current Pricing - Dark Elite Card */}
        <Animated.View style={{ opacity: loading ? 0.7 : fadeAnimation }}>
          <LinearGradient 
            colors={LuxuryColors.darkEliteGradient as any}
            style={mainScreenStyles.pricingCard}
          >
          <View style={mainScreenStyles.pricingHeader}>
            <Text style={mainScreenStyles.pricingTitle}>Current Rate</Text>
          </View>
          <View style={mainScreenStyles.pricingGrid}>
            <View style={mainScreenStyles.priceItem}>
              <Text style={mainScreenStyles.priceValue}>${data.currentPrice}</Text>
              <Text style={mainScreenStyles.priceLabel}>Your Price</Text>
            </View>
            <View style={mainScreenStyles.priceItem}>
              <Text style={mainScreenStyles.priceValue}>${data.marketPrice}</Text>
              <Text style={mainScreenStyles.priceLabel}>Market Avg</Text>
            </View>
            <View style={mainScreenStyles.priceItem}>
              <Text style={[mainScreenStyles.priceValue, mainScreenStyles.suggestedPrice]}>${data.suggestedPrice}</Text>
              <Text style={[mainScreenStyles.priceLabel, mainScreenStyles.suggestedLabel]}>AI Suggests</Text>
            </View>
          </View>
        </LinearGradient>
        </Animated.View>

        {/* Upcoming Days - Minimal Design */}
        <View style={mainScreenStyles.sectionHeader}>
          <Text style={mainScreenStyles.sectionTitle}>Next 5 Days</Text>
          <TouchableOpacity 
            style={[mainScreenStyles.refreshButton, loading && mainScreenStyles.refreshButtonLoading]} 
            onPress={loadData}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={loading ? "hourglass" : "refresh"} 
              size={18} 
              color={loading ? LuxuryColors.textLight : LuxuryColors.accent} 
            />
            <Text style={[mainScreenStyles.refreshButtonText, loading && mainScreenStyles.refreshButtonTextLoading]}>
              {loading ? 'Updating...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View>
            <LoadingDots />
            <Text style={mainScreenStyles.loadingIndicatorText}>
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
          <View key={index} style={mainScreenStyles.dayContainer}>
            <TouchableOpacity 
              onPress={() => toggleDay(index)}
              activeOpacity={0.7}
            >
              <LinearGradient 
                colors={LuxuryColors.dayCardGradient as any}
                style={[
                  mainScreenStyles.dayItem, 
                  expandedDays.includes(index) && mainScreenStyles.dayItemExpanded
                ]}
              >
              <View style={mainScreenStyles.dayLeft}>
                <View style={mainScreenStyles.dateInfo}>
                  <Text style={mainScreenStyles.dayName}>{day.day}</Text>
                  <Text style={mainScreenStyles.dateNumber}>{day.date.split(' ')[1]}</Text>
                </View>
                <View style={mainScreenStyles.priceInfo}>
                  <View style={mainScreenStyles.priceFlow}>
                    <Text style={mainScreenStyles.currentPrice}>${day.currentPrice}</Text>
                    <Ionicons 
                      name={day.suggestedPrice > day.currentPrice ? "trending-up" : "trending-down"} 
                      size={16} 
                      color={LuxuryColors.accent} 
                      style={mainScreenStyles.trendIcon}
                    />
                    <Text style={[
                      mainScreenStyles.suggestedPriceHighlight,
                      mainScreenStyles.goldGlow
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
                style={mainScreenStyles.expandedContent}
              >
                {/* AI's Take - Clean Card */}
                <LinearGradient 
                  colors={LuxuryColors.cardGradient as any}
                  style={mainScreenStyles.aiTakeCard}
                >
                  <View style={mainScreenStyles.aiTakeHeader}>
                    <Ionicons name="sparkles" size={16} color={LuxuryColors.accent} />
                    <Text style={mainScreenStyles.aiTakeTitle}>AI's Take</Text>
                  </View>
                  <Text style={mainScreenStyles.aiTakeText}>{day.aiInsight}</Text>
                </LinearGradient>

                {/* Quick Stats */}
                <View style={mainScreenStyles.quickStats}>
                  <View style={mainScreenStyles.statItem}>
                    <Text style={mainScreenStyles.statValue}>${day.currentPrice}</Text>
                    <Text style={mainScreenStyles.statLabel}>Your Price</Text>
                  </View>
                  <View style={mainScreenStyles.statItem}>
                    <Text style={mainScreenStyles.statValue}>${day.marketPrice}</Text>
                    <Text style={mainScreenStyles.statLabel}>Market Avg</Text>
                  </View>
                  <View style={mainScreenStyles.statItem}>
                    <Text style={[mainScreenStyles.statValue, mainScreenStyles.suggestedStat]}>${day.suggestedPrice}</Text>
                    <Text style={[mainScreenStyles.statLabel, mainScreenStyles.suggestedStatLabel]}>AI Suggests</Text>
                  </View>
                </View>

                {/* Price Update Actions */}
                <View style={mainScreenStyles.updateSection}>
                  <Text style={mainScreenStyles.updateSectionTitle}>Update Price</Text>
                  
                  {/* AI Recommended Price Button */}
                  <TouchableOpacity 
                    style={[
                      mainScreenStyles.updateButton, 
                      mainScreenStyles.aiUpdateButton,
                      updatingDays.has(index) && mainScreenStyles.updateButtonDisabled
                    ]}
                    onPress={() => handleUpdatePrice(index, true)}
                    disabled={updatingDays.has(index)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient 
                      colors={LuxuryColors.moneyGoldGradient as any}
                      style={mainScreenStyles.updateButtonGradient}
                    >
                      <Ionicons 
                        name="sparkles" 
                        size={16} 
                        color={LuxuryColors.secondary} 
                        style={mainScreenStyles.updateButtonIcon}
                      />
                      <Text style={[mainScreenStyles.updateButtonText, mainScreenStyles.aiUpdateButtonText]}>
                        {updatingDays.has(index) ? 'Updating...' : `Use AI Price ($${day.suggestedPrice})`}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Custom Price Input and Button */}
                  <View style={mainScreenStyles.customPriceContainer}>
                    <TextInput
                      style={[
                        mainScreenStyles.customPriceInput,
                        updatingDays.has(index) && mainScreenStyles.customPriceInputDisabled
                      ]}
                      placeholder="Enter custom price"
                      placeholderTextColor={LuxuryColors.textLight}
                      value={customPrices[index] || ''}
                      onChangeText={(text) => setCustomPrices(prev => ({ ...prev, [index]: text }))}
                      keyboardType="numeric"
                      editable={!updatingDays.has(index)}
                    />
                    <TouchableOpacity 
                      style={[
                        mainScreenStyles.updateButton,
                        mainScreenStyles.customUpdateButton,
                        updatingDays.has(index) && mainScreenStyles.updateButtonDisabled,
                        (!customPrices[index] || isNaN(parseFloat(customPrices[index]))) && mainScreenStyles.updateButtonDisabled
                      ]}
                      onPress={() => handleUpdatePrice(index, false)}
                      disabled={updatingDays.has(index) || !customPrices[index] || isNaN(parseFloat(customPrices[index]))}
                      activeOpacity={0.8}
                    >
                      <LinearGradient 
                        colors={LuxuryColors.darkEliteGradient as any}
                        style={mainScreenStyles.updateButtonGradient}
                      >
                        <Ionicons 
                          name="create" 
                          size={16} 
                          color={LuxuryColors.accent} 
                          style={mainScreenStyles.updateButtonIcon}
                        />
                        <Text style={[mainScreenStyles.updateButtonText, mainScreenStyles.customUpdateButtonText]}>
                          {updatingDays.has(index) ? 'Updating...' : 'Use Custom Price'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
                </LinearGradient>
            )}
          </View>
            ))}
          </Animated.View>
        )}

        {/* Updated Custom Date Range Section with Calendar */}
        <View style={mainScreenStyles.customWindowSection}>
          <View style={mainScreenStyles.customWindowHeader}>
            <Text style={mainScreenStyles.sectionTitle}>Custom Date Range</Text>
            <TouchableOpacity
              style={mainScreenStyles.toggleButton}
              onPress={() => setShowCustomWindow(!showCustomWindow)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showCustomWindow ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={LuxuryColors.accent} 
              />
            </TouchableOpacity>
          </View>

          {showCustomWindow && (
            <View style={mainScreenStyles.customWindowContent}>
              {/* Date Selection Summary */}
              <View style={mainScreenStyles.dateSelectionSummary}>
                <Text style={mainScreenStyles.selectorLabel}>Select Date Range (max 30 days, within 90 days from today):</Text>
                <View style={mainScreenStyles.selectedDatesRow}>
                  <View style={mainScreenStyles.dateDisplay}>
                    <Text style={mainScreenStyles.dateDisplayLabel}>From:</Text>
                    <Text style={mainScreenStyles.dateDisplayValue}>
                      {customWindow.startDate ? formatDateDisplay(customWindow.startDate) : 'Select date'}
                    </Text>
                  </View>
                  
                  <View style={mainScreenStyles.dateDisplay}>
                    <Text style={mainScreenStyles.dateDisplayLabel}>To:</Text>
                    <Text style={mainScreenStyles.dateDisplayValue}>
                      {customWindow.endDate ? formatDateDisplay(customWindow.endDate) : 'Select date'}
                    </Text>
                  </View>
                </View>

                {customWindow.startDate && customWindow.endDate && (
                  <View style={mainScreenStyles.dateRangeSummary}>
                    <Text style={mainScreenStyles.dateRangeSummaryText}>
                      {(() => {
                        const start = new Date(customWindow.startDate);
                        const end = new Date(customWindow.endDate);
                        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      })()} days selected
                    </Text>
                    <TouchableOpacity onPress={clearDateSelection} style={mainScreenStyles.clearButton}>
                      <Text style={mainScreenStyles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Calendar Toggle */}
              <TouchableOpacity
                style={mainScreenStyles.calendarToggleButton}
                onPress={() => setCustomWindow(prev => ({ ...prev, showCalendar: !prev.showCalendar }))}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="calendar" 
                  size={18} 
                  color={LuxuryColors.accent} 
                />
                <Text style={mainScreenStyles.calendarToggleText}>
                  {customWindow.showCalendar ? 'Hide Calendar' : 'Select Dates'}
                </Text>
                <Ionicons 
                  name={customWindow.showCalendar ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={LuxuryColors.accent} 
                />
              </TouchableOpacity>

              {/* Calendar */}
              {customWindow.showCalendar && (
                <View style={mainScreenStyles.calendarContainer}>
                  <Calendar
                    onDayPress={handleCalendarDayPress}
                    markedDates={getMarkedDates()}
                    minDate={getTodayString()}
                    maxDate={getMaxDateString()}
                    theme={{
                      backgroundColor: 'transparent',
                      calendarBackground: 'transparent',
                      textSectionTitleColor: LuxuryColors.textSecondary,
                      selectedDayBackgroundColor: LuxuryColors.accent,
                      selectedDayTextColor: LuxuryColors.surface,
                      todayTextColor: LuxuryColors.accent,
                      dayTextColor: LuxuryColors.text,
                      textDisabledColor: LuxuryColors.textLight,
                      dotColor: LuxuryColors.accent,
                      selectedDotColor: LuxuryColors.surface,
                      arrowColor: LuxuryColors.accent,
                      monthTextColor: LuxuryColors.accent,
                      indicatorColor: LuxuryColors.accent,
                      textDayFontFamily: 'Inter-Medium',
                      textMonthFontFamily: 'Inter-Bold',
                      textDayHeaderFontFamily: 'Inter-SemiBold',
                      textDayFontSize: 16,
                      textMonthFontSize: 18,
                      textDayHeaderFontSize: 14
                    }}
                    style={mainScreenStyles.calendar}
                  />
                  
                  <Text style={mainScreenStyles.calendarInstruction}>
                    Select start and end dates (max 30-day range, within 90 days from today)
                  </Text>
                </View>
              )}

              {/* Load Button */}
              {customWindow.startDate && customWindow.endDate && (
                <TouchableOpacity
                  style={[mainScreenStyles.loadCustomButton, customWindow.isLoading && mainScreenStyles.loadingButton]}
                  onPress={loadCustomTimeWindow}
                  disabled={customWindow.isLoading}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={customWindow.isLoading ? "hourglass" : "analytics"} 
                    size={18} 
                    color={customWindow.isLoading ? LuxuryColors.textLight : LuxuryColors.surface} 
                  />
                  <Text style={[mainScreenStyles.loadButtonText, customWindow.isLoading && mainScreenStyles.loadingButtonText]}>
                    {customWindow.isLoading ? 'Loading...' : (() => {
                      const start = new Date(customWindow.startDate);
                      const end = new Date(customWindow.endDate);
                      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      return `Analyze ${days} Days`;
                    })()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Custom Days Display - Moved outside customWindowContent for proper width */}
          {customWindow.days.length > 0 && (
            <>
              <View style={mainScreenStyles.customDaysTitleContainer}>
                <Text style={mainScreenStyles.customDaysTitle}>
                  Found {customWindow.days.length} available nights from {formatDateDisplay(customWindow.startDate!)} to {formatDateDisplay(customWindow.endDate!)}
                </Text>
              </View>
              
              {customWindow.days.map((day: DayData, index: number) => (
                <View key={`custom_${index}`} style={mainScreenStyles.dayContainer}>
                  <TouchableOpacity 
                    onPress={() => toggleCustomDay(index)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient 
                      colors={LuxuryColors.dayCardGradient as any}
                      style={[
                        mainScreenStyles.dayItem, 
                        expandedCustomDays.includes(index) && mainScreenStyles.dayItemExpanded
                      ]}
                    >
                      <View style={mainScreenStyles.dayLeft}>
                        <View style={mainScreenStyles.dateInfo}>
                          <Text style={mainScreenStyles.dayName}>{day.day}</Text>
                          <Text style={mainScreenStyles.dateNumber}>{day.date.split(' ')[1]}</Text>
                        </View>
                        <View style={mainScreenStyles.priceInfo}>
                          <View style={mainScreenStyles.priceFlow}>
                            <Text style={mainScreenStyles.currentPrice}>${day.currentPrice}</Text>
                            <Ionicons 
                              name={day.suggestedPrice > day.currentPrice ? "trending-up" : "trending-down"} 
                              size={16} 
                              color={LuxuryColors.accent} 
                              style={mainScreenStyles.trendIcon}
                            />
                            <Text style={[mainScreenStyles.suggestedPriceHighlight, mainScreenStyles.goldGlow]}>
                              ${day.suggestedPrice}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons 
                        name={expandedCustomDays.includes(index) ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={LuxuryColors.textSecondary} 
                      />
                    </LinearGradient>
                  </TouchableOpacity>

                  {expandedCustomDays.includes(index) && (
                    <LinearGradient 
                      colors={LuxuryColors.lightSurfaceGradient as any}
                      style={mainScreenStyles.expandedContent}
                    >
                      {/* AI's Take */}
                      <LinearGradient 
                        colors={LuxuryColors.cardGradient as any}
                        style={mainScreenStyles.aiTakeCard}
                      >
                        <View style={mainScreenStyles.aiTakeHeader}>
                          <Ionicons name="sparkles" size={16} color={LuxuryColors.accent} />
                          <Text style={mainScreenStyles.aiTakeTitle}>AI's Take</Text>
                        </View>
                        <Text style={mainScreenStyles.aiTakeText}>{day.aiInsight}</Text>
                      </LinearGradient>

                      {/* Quick Stats */}
                      <View style={mainScreenStyles.quickStats}>
                        <View style={mainScreenStyles.statItem}>
                          <Text style={mainScreenStyles.statValue}>${day.currentPrice}</Text>
                          <Text style={mainScreenStyles.statLabel}>Your Price</Text>
                        </View>
                        <View style={mainScreenStyles.statItem}>
                          <Text style={mainScreenStyles.statValue}>${day.marketPrice}</Text>
                          <Text style={mainScreenStyles.statLabel}>Market Avg</Text>
                        </View>
                        <View style={mainScreenStyles.statItem}>
                          <Text style={[mainScreenStyles.statValue, mainScreenStyles.suggestedStat]}>${day.suggestedPrice}</Text>
                          <Text style={[mainScreenStyles.statLabel, mainScreenStyles.suggestedStatLabel]}>AI Suggests</Text>
                        </View>
                      </View>

                      {/* Price Update Actions - Use same structure as Next 5 Days */}
                      <View style={mainScreenStyles.actionSection}>
                        {/* AI Recommended Price Button */}
                        <TouchableOpacity 
                          style={[
                            mainScreenStyles.actionButton, 
                            mainScreenStyles.aiButton
                          ]}
                          onPress={() => handleUpdateCustomDayPrice(index, true)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient 
                            colors={LuxuryColors.moneyGoldGradient as any}
                            style={mainScreenStyles.gradientButton}
                          >
                            <Ionicons 
                              name="sparkles" 
                              size={16} 
                              color={LuxuryColors.secondary} 
                            />
                            <Text style={mainScreenStyles.aiButtonText}>
                              Use AI Price (${day.suggestedPrice})
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>

                        {/* Custom Price Input and Button */}
                        <View style={mainScreenStyles.customPriceSection}>
                          <TextInput
                            style={mainScreenStyles.customPriceInput}
                            placeholder="Enter custom price"
                            placeholderTextColor={LuxuryColors.textLight}
                            value={customPrices[`custom_${index}`] || ''}
                            onChangeText={(text) => 
                              setCustomPrices(prev => ({ 
                                ...prev, 
                                [`custom_${index}`]: text 
                              }))
                            }
                            keyboardType="numeric"
                          />
                          <TouchableOpacity 
                            style={[
                              mainScreenStyles.customButton,
                              (!customPrices[`custom_${index}`] || isNaN(parseFloat(customPrices[`custom_${index}`]))) && { opacity: 0.5 }
                            ]}
                            onPress={() => handleUpdateCustomDayPrice(index, false)}
                            disabled={!customPrices[`custom_${index}`] || isNaN(parseFloat(customPrices[`custom_${index}`]))}
                            activeOpacity={0.8}
                          >
                            <Text style={mainScreenStyles.customButtonText}>
                              Update
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </LinearGradient>
                  )}
                </View>
              ))}
            </>
          )}
        </View>

        {/* Single Action Button */}
        <View style={mainScreenStyles.actionSection}>
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
              style={mainScreenStyles.primaryButton}
            >
              <Text style={mainScreenStyles.primaryButtonText}>
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
