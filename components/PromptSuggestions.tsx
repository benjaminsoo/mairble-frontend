import { LuxuryColors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PromptSuggestionsProps {
  onPromptSelect: (prompt: string) => void;
}

const PROMPT_SUGGESTIONS = [
  {
    display: "💰 What's the best nightly rate for my next unbooked gap?",
    prompt: "What's the best nightly rate for my next unbooked gap?"
  },
  {
    display: "📅 Am I overpriced on weekends next month?",
    prompt: "Am I overpriced on weekends next month?"
  },
  {
    display: "📈 What's my revenue forecast for the next 30 days?",
    prompt: "What's my revenue forecast for the next 30 days?"
  },
  {
    display: "🏠 What's the right price for my property based on location and size?",
    prompt: "What's the right price for my property based on location and size?"
  },
  {
    display: "📊 Which dates next month might sit empty, and how do I fix them?",
    prompt: "Which dates next month might sit empty, and how do I fix them?"
  },
  {
    display: "💵 What's my price for this weekend, next weekend, and Labor Day?",
    prompt: "What's my price for this weekend, next weekend, and Labor Day?"
  },
  {
    display: "💡 Show me 3 ways I can make more money this month.",
    prompt: "Show me 3 ways I can make more money this month."
  }
];

const INITIAL_VISIBLE_COUNT = 3;

export default function PromptSuggestions({ onPromptSelect }: PromptSuggestionsProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleSuggestions = showAll 
    ? PROMPT_SUGGESTIONS 
    : PROMPT_SUGGESTIONS.slice(0, INITIAL_VISIBLE_COUNT);

  const handlePromptPress = (suggestion: { display: string; prompt: string }) => {
    onPromptSelect(suggestion.prompt);
  };

  const toggleShowAll = () => {
    setShowAll(!showAll);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Try asking:</Text>
      
      <View style={styles.chipsContainer}>
        {visibleSuggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.chip}
            onPress={() => handlePromptPress(suggestion)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{suggestion.display}</Text>
          </TouchableOpacity>
        ))}
        
        {PROMPT_SUGGESTIONS.length > INITIAL_VISIBLE_COUNT && (
          <TouchableOpacity
            style={[styles.chip, styles.showMoreChip]}
            onPress={toggleShowAll}
            activeOpacity={0.7}
          >
            <Text style={styles.showMoreText}>
              {showAll ? 'Show less' : `Show ${PROMPT_SUGGESTIONS.length - INITIAL_VISIBLE_COUNT} more`}
            </Text>
            <Ionicons 
              name={showAll ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color={LuxuryColors.accent} 
              style={styles.chevronIcon}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: LuxuryColors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.2)',
    flexShrink: 1,
    shadowColor: LuxuryColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.text,
    textAlign: 'center',
  },
  showMoreChip: {
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    borderColor: 'rgba(184, 134, 11, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.accent,
    marginRight: 4,
  },
  chevronIcon: {
    marginLeft: 2,
  },
}); 