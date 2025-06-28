# Backend Integration Test Guide

## 🚀 Testing Your Backend Integration

### Prerequisites
1. **Backend server must be running** on `http://127.0.0.1:8000`
2. **API keys configured** in backend (as per your provided values)

### Step 1: Start Backend Server
Navigate to your backend directory and start the server:

```bash
cd mairble-app/backend
./start_simple.sh
```

Or manually:
```bash
cd mairble-app/backend
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

You should see:
```
🚀 Starting mAIrble Backend Server (No .env mode)...
✅ All dependencies available
🔧 Starting server on http://127.0.0.1:8000
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**No .env file needed!** All configuration is hardcoded in the backend.

### Step 2: Test Backend Endpoints (Optional)
You can test the backend directly:

```bash
# Test health check endpoint
curl http://127.0.0.1:8000/

# Test pricing data endpoint (this one might take longer)
curl -X POST "http://127.0.0.1:8000/fetch-pricing-data" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "kruUYOXh0NJEQnuh29jkZ11LmycXBJpLNsvCuG6j",
    "listing_id": "21f49919-2f73-4b9e-88c1-f460a316a5bc",
    "pms": "yourporter"
  }'
```

### Step 3: Run React Native App
Start your Expo app:

```bash
npx expo start
```

### Step 4: Test the Integration

**What should happen:**
1. **App launches** → Shows "Loading..." screen
2. **Data loads** → Displays real pricing data from PriceLabs
3. **AI analysis** → Shows AI-generated insights (may take 10-30 seconds)
4. **Refresh button** → Tap to reload data
5. **Expandable cards** → Tap days to see AI insights

**What to look for:**
- ✅ Real property data instead of mock data
- ✅ "Newport Luxury Property" in header
- ✅ Market prices from PriceLabs
- ✅ AI-generated pricing suggestions
- ✅ Refresh button works

### Troubleshooting

**"Network request failed" error:**
- ❓ Is backend server running? Check terminal for "Uvicorn running on..."
- ❓ Test backend directly: `curl http://127.0.0.1:8000/` (should return JSON)
- ❓ Try restarting both backend and React Native app
- ❓ Check React Native logs for "Testing backend connection" messages

**"Unable to Load Data" error:**
- ❓ Backend is running but API calls failing
- ❓ Check backend terminal for error messages
- ❓ Try the health check: `curl http://127.0.0.1:8000/`

**"Loading..." forever:**
- ❓ Network connectivity issue between React Native and backend
- ❓ Check both Metro bundler logs AND backend server logs
- ❓ Try restarting both services

**Mock data still showing:**
- ❓ Make sure you saved all files and restarted the Expo server
- ❓ Clear cache: `npx expo start --clear`
- ❓ Check console logs for "Loading pricing data..." message

### Success Indicators
✅ **Data loads in ~5-10 seconds**
✅ **Real dates (not "Nov 15, Nov 16" etc.)**
✅ **Actual market prices from PriceLabs**
✅ **AI insights appear in expanded cards**
✅ **Refresh button updates data**

### What's Next?
Once this works, we can add:
- 🔐 User authentication & API key input
- 📱 Better error handling & offline support
- 🏠 Multi-property support
- 📊 Advanced analytics & charts

---

**Need help?** Check the console logs in both:
- **Metro bundler** (React Native console)
- **Backend server** (FastAPI logs) 