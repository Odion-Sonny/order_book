#!/usr/bin/env python3
"""
System Test Script for Order Book Trading Engine
Tests key functionality and API endpoints
"""

import requests
import json
import sys
from datetime import datetime

def test_api_endpoints():
    """Test all critical API endpoints"""
    base_url = "http://localhost:8001/api"
    
    print("🚀 Testing Order Book Trading Engine API Endpoints")
    print("=" * 60)
    
    # Test 1: Assets endpoint
    print("1. Testing Assets API...")
    try:
        response = requests.get(f"{base_url}/assets/", timeout=5)
        if response.status_code == 200:
            assets = response.json()
            print(f"   ✅ Assets API: {len(assets)} assets loaded")
            for asset in assets[:3]:  # Show first 3
                print(f"      - {asset['name']} ({asset['ticker']})")
        else:
            print(f"   ❌ Assets API failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Assets API error: {e}")
        return False
    
    # Test 2: Market Data endpoint
    print("\n2. Testing Market Data API...")
    try:
        response = requests.get(f"{base_url}/assets/market_data/", timeout=10)
        if response.status_code == 200:
            market_data = response.json()
            print(f"   ✅ Market Data API: {len(market_data)} assets with live data")
            for asset in market_data[:2]:  # Show first 2
                price = asset.get('current_price', 'N/A')
                change = asset.get('price_change_percent', 'N/A')
                print(f"      - {asset['ticker']}: ${price} ({change:.2f}%)" if isinstance(change, (int, float)) else f"      - {asset['ticker']}: ${price}")
        else:
            print(f"   ❌ Market Data API failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Market Data API error: {e}")
        return False
    
    # Test 3: Trades endpoint
    print("\n3. Testing Trades API...")
    try:
        response = requests.get(f"{base_url}/trades/", timeout=5)
        if response.status_code == 200:
            trades = response.json()
            print(f"   ✅ Trades API: {len(trades)} trades loaded")
            if trades:
                latest = trades[0]
                print(f"      - Latest: {latest['asset']} - ${latest['price']} x {latest['size']}")
                # Verify newest first ordering
                if len(trades) > 1:
                    first_time = datetime.fromisoformat(trades[0]['timestamp'].replace('Z', '+00:00'))
                    second_time = datetime.fromisoformat(trades[1]['timestamp'].replace('Z', '+00:00'))
                    if first_time >= second_time:
                        print("      ✅ Trades properly ordered (newest first)")
                    else:
                        print("      ⚠️  Trade ordering issue detected")
        else:
            print(f"   ❌ Trades API failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Trades API error: {e}")
        return False
    
    # Test 4: Order Books endpoint
    print("\n4. Testing Order Books API...")
    try:
        response = requests.get(f"{base_url}/orderbooks/", timeout=5)
        if response.status_code == 200:
            orderbooks = response.json()
            print(f"   ✅ Order Books API: {len(orderbooks)} order books available")
        else:
            print(f"   ❌ Order Books API failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Order Books API error: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All API endpoints are functioning correctly!")
    print(f"🕐 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    return True

def check_dependencies():
    """Check if all required dependencies are available"""
    print("\n📦 Checking Dependencies...")
    
    required_modules = [
        'django',
        'rest_framework', 
        'corsheaders',
        'channels',
        'redis',
        'alpaca_trade_api'
    ]
    
    missing = []
    for module in required_modules:
        try:
            __import__(module)
            print(f"   ✅ {module}")
        except ImportError:
            print(f"   ❌ {module} - MISSING")
            missing.append(module)
    
    if missing:
        print(f"\n⚠️  Missing dependencies: {', '.join(missing)}")
        return False
    else:
        print("\n✅ All dependencies are installed!")
        return True

if __name__ == "__main__":
    print("🧪 Order Book Trading Engine - System Test")
    print("=" * 60)
    
    # Check dependencies first
    deps_ok = check_dependencies()
    
    if not deps_ok:
        print("\n❌ Dependency check failed. Please install missing packages.")
        sys.exit(1)
    
    # Test API endpoints
    print("\n🌐 Starting API endpoint tests...")
    print("Note: Make sure Django server is running on localhost:8001")
    print("-" * 60)
    
    api_ok = test_api_endpoints()
    
    if api_ok:
        print("\n🎉 System test completed successfully!")
        print("📈 Your Order Book Trading Engine is ready to use!")
        sys.exit(0)
    else:
        print("\n❌ System test failed. Please check server status.")
        sys.exit(1)