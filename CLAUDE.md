# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mAIrble is a React Native Expo application for Short Term Rental hosts that provides AI-powered pricing analysis using PriceLabs data and OpenAI GPT-4. The app features a luxury-themed mobile interface with secure API key management and conversational AI for pricing insights.

## Architecture

### Frontend (React Native Expo)
- **Main Structure**: Uses Expo Router with file-based routing
- **Navigation**: Stack navigator with tab-based main interface
- **State Management**: Context-based with secure storage for sensitive data
- **Styling**: Custom luxury theme with Inter fonts and gradient backgrounds
- **Key Services**: 
  - `services/api.ts`: Backend communication and AI chat functionality
  - `services/storage.ts`: Secure storage for API keys and property context

### Backend (Python FastAPI)
- **Location**: `backend/` directory with standalone Flask/FastAPI server
- **Purpose**: Proxy between mobile app and external APIs (PriceLabs, OpenAI)
- **Storage**: In-memory conversation storage (production would use database)
- **Deployment**: Railway.app for production, local development support

### Core Features
- **Property Context Setup**: 3-step wizard capturing guest type, special features, and pricing goals
- **AI Pricing Analysis**: Fetches PriceLabs data and analyzes with GPT-4
- **Conversational Chat**: Contextual AI chat with conversation history
- **Custom Date Ranges**: Flexible pricing analysis for any date range
- **Single Price Updates**: Direct PriceLabs price updates through the app

## Development Commands

### Frontend (Expo App)
```bash
# Install dependencies
npm install

# Start development server
npm start
# or
expo start

# Platform-specific development
expo start --ios
expo start --android
expo start --web

# Linting
expo lint
```

### Backend (Python FastAPI)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Local development
source .env && uvicorn app:app --host 127.0.0.1 --port 8000 --reload

# Or manual environment setup
OPENAI_API_KEY="your_key" PRICELABS_API_KEY="your_key" uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

## Key Architectural Patterns

### API Configuration Flow
1. Users configure PriceLabs API keys through the app setup flow
2. Keys are stored securely using Expo SecureStore
3. Frontend sends user's API keys to backend for each request
4. Backend acts as a proxy, never storing user credentials

### Property Context System
- 3-step setup captures: main guest type, special features, pricing goals
- Context is included in all AI requests for personalized advice
- Can be updated anytime through settings
- Stored locally using SecureStore

### Backend URL Discovery
- Frontend tests multiple backend URLs in priority order:
  1. Production Railway deployment
  2. Local development IPs
  3. Localhost variants
- Automatically selects working backend for seamless development

### Conversation Management
- Each chat creates a unique conversation_id
- Messages stored with timestamps and roles (user/assistant)
- Property context included in conversation metadata
- Support for listing, retrieving, and deleting conversations

## File Structure Highlights

### Frontend Core Files
- `app/_layout.tsx`: Root layout with navigation and theme setup
- `app/context-setup.tsx`: Property context wizard
- `app/(tabs)/`: Main tabbed interface
- `services/api.ts`: All backend communication logic
- `services/storage.ts`: Secure storage utilities

### Backend Core Files
- `backend/app.py`: Main FastAPI application
- `backend/config.py`: Environment configuration
- `backend/tools/`: Modular API tools for different services

### Styling & UI
- `constants/Colors.ts`: Luxury color theme
- `components/ui/`: Reusable UI components
- Inter font family loaded for consistent typography

## Development Best Practices

### Code Style (from .cursor/rules/expo.mdc)
- Use functional components with hooks
- Implement proper TypeScript typing
- Follow React Native performance best practices
- Use Expo SDK features and APIs appropriately
- Implement proper error handling and crash reporting

### Security Considerations
- Never commit API keys or sensitive data
- Use Expo SecureStore for all sensitive storage
- Backend validates all API requests
- Environment variables for all configuration

### API Integration
- Always check API configuration before making requests
- Implement graceful fallbacks for network issues
- Log API interactions for debugging
- Use proper error boundaries and user feedback

## Testing & Quality

The project uses ESLint for code quality. No test framework is currently configured.

```bash
# Run linting
expo lint
```

## Environment Setup

### Required API Keys
- **PriceLabs API Key**: From PriceLabs account dashboard
- **OpenAI API Key**: From platform.openai.com
- **Listing ID**: Property identifier from PriceLabs

### Backend Environment Variables
Create `backend/.env` file:
```bash
PRICELABS_API_KEY=your_actual_pricelabs_api_key_here
OPENAI_API_KEY=your_actual_openai_api_key_here
HOST=127.0.0.1
PORT=8000
```