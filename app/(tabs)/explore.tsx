import PromptSuggestions from '@/components/PromptSuggestions';
import { LuxuryColors } from '@/constants/Colors';
import { ApiService } from '@/services/api';
import { SecureStorageService } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `### Welcome! 🎯

I'm your **AI property assistant** for short-term rental optimization. I can help you with:

- **Pricing strategies** and market analysis
- **Guest management** and targeting  
- **Property optimization** recommendations
- **Revenue forecasting** and availability planning

> **Ready to maximize your property's potential?** Ask me about pricing, availability, or any property management questions!

What would you like to discuss today?`,
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load persisted conversation ID and history on component mount
  useEffect(() => {
    loadConversationState();
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadConversationState = async () => {
    try {
      setIsLoadingHistory(true);
      
      // Try to load the last conversation ID from storage
      const lastConversationId = await SecureStorageService.getItem('lastConversationId');
      
      if (lastConversationId) {
        console.log('📖 Loading conversation history for:', lastConversationId);
        
        try {
          const conversationHistory = await ApiService.getConversationHistory(lastConversationId);
          
          // Convert backend messages to frontend format
          const backendMessages = conversationHistory.messages.map((msg, index) => ({
            id: `${msg.timestamp.getTime()}_${index}`,
            text: msg.content,
            isUser: msg.role === 'user',
            timestamp: msg.timestamp
          }));
          
          if (backendMessages.length > 0) {
            // Replace the default welcome message with conversation history
            setMessages(backendMessages);
            setConversationId(lastConversationId);
            console.log('✅ Loaded conversation history:', backendMessages.length, 'messages');
          }
        } catch (error) {
          console.log('⚠️ Could not load conversation history, starting fresh:', error);
          // If conversation history fails to load, start fresh (keep default welcome message)
          await SecureStorageService.removeItem('lastConversationId');
        }
      }
    } catch (error) {
      console.error('❌ Error loading conversation state:', error);
      // Continue with default state if loading fails
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveConversationId = async (convId: string) => {
    try {
      await SecureStorageService.setItem('lastConversationId', convId);
      console.log('💾 Saved conversation ID:', convId);
    } catch (error) {
      console.error('❌ Error saving conversation ID:', error);
    }
  };

  const startNewConversation = async () => {
    try {
      // Clear conversation state
      setConversationId(undefined);
      await SecureStorageService.removeItem('lastConversationId');
      
      // Reset to default welcome message
      setMessages([
        {
          id: '1',
          text: "Hello! I'm your AI property assistant. I can help you with pricing strategies, guest management, and property optimization. What would you like to discuss?",
          isUser: false,
          timestamp: new Date()
        }
      ]);
      
      console.log('🆕 Started new conversation');
    } catch (error) {
      console.error('❌ Error starting new conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      const { response, conversationId: newConversationId } = await ApiService.chatWithAI(messageText, conversationId);
      
      // Update conversation ID if this is a new conversation
      if (!conversationId && newConversationId) {
        setConversationId(newConversationId);
        await saveConversationId(newConversationId);
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Please make sure your backend server is running and try again.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setInputText(prompt);
    // Optionally auto-send the message
    // sendMessage();
  };

  // Check if this is the initial state (only welcome message and no conversation ID)
  const isInitialState = messages.length === 1 && !conversationId && messages[0].id === '1';

  const showConversationOptions = () => {
    Alert.alert(
      'Conversation Options',
      'Choose an action for your conversation:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'New Conversation', 
          style: 'default',
          onPress: startNewConversation
        },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Clear History',
              'This will permanently delete this conversation. Are you sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    if (conversationId) {
                      try {
                        await ApiService.deleteConversation(conversationId);
                        await startNewConversation();
                        console.log('🗑️ Conversation deleted and reset');
                      } catch (error) {
                        console.error('❌ Error deleting conversation:', error);
                        // Still reset locally even if backend deletion fails
                        await startNewConversation();
                      }
                    } else {
                      await startNewConversation();
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const renderMessage = (message: Message) => (
    <View key={message.id} style={[styles.messageContainer, message.isUser ? styles.userMessage : styles.aiMessage]}>
      {!message.isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={16} color={LuxuryColors.accent} />
        </View>
      )}
      <View style={[styles.messageBubble, message.isUser ? styles.userBubble : styles.aiBubble]}>
        <Markdown
          style={{
            body: {
              fontSize: 16,
              lineHeight: 22,
              fontFamily: 'Inter-Medium',
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.text,
            },
            heading1: {
              fontSize: 20,
              fontFamily: 'Inter-Bold',
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.primary,
              marginBottom: 8,
            },
            heading2: {
              fontSize: 18,
              fontFamily: 'Inter-Bold', 
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.primary,
              marginBottom: 6,
            },
            heading3: {
              fontSize: 16,
              fontFamily: 'Inter-Bold',
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.primary,
              marginBottom: 4,
            },
            paragraph: {
              fontSize: 16,
              lineHeight: 22,
              fontFamily: 'Inter-Medium',
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.text,
              marginBottom: 8,
            },
            strong: {
              fontFamily: 'Inter-Bold',
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.accent,
            },
            code_inline: {
              fontSize: 14,
              fontFamily: 'Inter-Medium',
              backgroundColor: 'rgba(184, 134, 11, 0.1)',
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.accent,
              paddingHorizontal: 4,
              paddingVertical: 2,
              borderRadius: 4,
            },
            code_block: {
              fontSize: 14,
              fontFamily: 'Inter-Medium',
              backgroundColor: 'rgba(184, 134, 11, 0.1)',
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.text,
              padding: 12,
              borderRadius: 8,
              marginVertical: 8,
            },
            bullet_list: {
              marginBottom: 8,
            },
            ordered_list: {
              marginBottom: 8,
            },
            list_item: {
              fontSize: 16,
              lineHeight: 22,
              fontFamily: 'Inter-Medium',
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.text,
              marginBottom: 4,
            },
            blockquote: {
              backgroundColor: 'rgba(184, 134, 11, 0.05)',
              borderLeftWidth: 4,
              borderLeftColor: LuxuryColors.accent,
              paddingLeft: 12,
              paddingVertical: 8,
              marginVertical: 8,
              fontStyle: 'italic',
            },
            hr: {
              backgroundColor: 'rgba(184, 134, 11, 0.2)',
              height: 1,
              marginVertical: 12,
            },
            table: {
              borderWidth: 1,
              borderColor: 'rgba(184, 134, 11, 0.2)',
              borderRadius: 8,
              marginVertical: 8,
            },
            thead: {
              backgroundColor: 'rgba(184, 134, 11, 0.1)',
            },
            th: {
              fontSize: 14,
              fontFamily: 'Inter-Bold',
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.primary,
              padding: 8,
            },
            td: {
              fontSize: 14,
              fontFamily: 'Inter-Medium',
              color: message.isUser ? LuxuryColors.secondary : LuxuryColors.text,
              padding: 8,
            },
          }}
        >
          {message.text}
        </Markdown>
      </View>
    </View>
  );

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Ionicons name="chatbubbles" size={24} color={LuxuryColors.accent} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <Text style={styles.headerSubtitle}>
                {isLoadingHistory ? 'Loading conversation...' : 'Property management expert'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={showConversationOptions}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={LuxuryColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? -50 : 0}
        >
          {/* Messages */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
          >
            {isLoadingHistory && (
              <View style={styles.loadingHistoryContainer}>
                <Ionicons name="hourglass-outline" size={16} color={LuxuryColors.textSecondary} />
                <Text style={styles.loadingHistoryText}>Loading conversation history...</Text>
              </View>
            )}
            
            {messages.map(renderMessage)}
            
            {/* Show prompt suggestions after the initial welcome message */}
            {isInitialState && (
              <PromptSuggestions onPromptSelect={handlePromptSelect} />
            )}
            
            {isLoading && (
              <View style={[styles.messageContainer, styles.aiMessage]}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={16} color={LuxuryColors.accent} />
                </View>
                <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                  <Text style={styles.loadingText}>● ● ●</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            <LinearGradient
              colors={LuxuryColors.darkEliteGradient as any}
              style={styles.inputGradient}
            >
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about pricing, guests, optimization..."
                placeholderTextColor={LuxuryColors.textSecondary}
                multiline
                maxLength={500}
                editable={!isLoading && !isLoadingHistory}
                textAlignVertical="center"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() || isLoading || isLoadingHistory) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isLoading || isLoadingHistory}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={(!inputText.trim() || isLoading || isLoadingHistory) ? LuxuryColors.textLight : LuxuryColors.accent} 
                />
              </TouchableOpacity>
            </LinearGradient>
          </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184, 134, 11, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: LuxuryColors.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
    marginTop: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingHistoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingHistoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.textSecondary,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: LuxuryColors.accent,
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: LuxuryColors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.1)',
  },
  loadingBubble: {
    paddingVertical: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Inter-Medium',
  },
  userText: {
    color: LuxuryColors.secondary,
  },
  aiText: {
    color: LuxuryColors.text,
  },
  loadingText: {
    fontSize: 16,
    color: LuxuryColors.textLight,
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
  },
  inputGradient: {
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.2)',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: LuxuryColors.secondary, // Bright white/cream for typing visibility
    maxHeight: 100,
    paddingRight: 12,
    paddingVertical: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(184, 134, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.4,
    backgroundColor: 'rgba(184, 134, 11, 0.05)',
    borderColor: 'rgba(212, 175, 55, 0.1)',
  },
});
