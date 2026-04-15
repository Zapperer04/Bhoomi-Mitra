import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Ensure environment variables are loaded relative to this file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

_weather_cache = {}
CACHE_TTL_WEATHER = 600 # 10 minutes

def get_weather(location):
    location = location.lower().strip()
    
    # Check cache
    if location in _weather_cache:
        cached_data, timestamp = _weather_cache[location]
        if (datetime.now() - timestamp).total_seconds() < CACHE_TTL_WEATHER:
            return cached_data

    try:
        api_key = os.getenv("OPENWEATHER_API_KEY") or os.getenv("WEATHER_API_KEY")
        if api_key:
            api_key = api_key.strip()
            
        if not api_key:
            print("❌ OPENWEATHER_API_KEY not found")
            return None

        query = f"{location},IN"
        # Reduce timeout to 5s for better responsiveness
        url = f"https://api.openweathermap.org/data/2.5/weather?q={query}&appid={api_key}&units=metric"
        
        resp = requests.get(url, timeout=5)
        data = resp.json()

        if resp.status_code != 200:
            print(f"❌ Weather API failed with status {resp.status_code}: {data}")
            return None

        result = {
            "location": data["name"],
            "temperature": data["main"]["temp"],
            "condition": data["weather"][0]["description"]
        }
        
        # Update cache
        _weather_cache[location] = (result, datetime.now())
        return result
    except Exception as e:
        print(f"❌ Weather error: {e}")
        return None

def get_weather_forecast(location):
    """
    Returns tomorrow's forecast. 
    Matches the name expected by app.py
    """
    try:
        api_key = os.getenv("OPENWEATHER_API_KEY") or os.getenv("WEATHER_API_KEY")
        if api_key:
            api_key = api_key.strip()
            
        if not api_key:
            return None

        query = f"{location},IN"
        url = f"https://api.openweathermap.org/data/2.5/forecast?q={query}&appid={api_key}&units=metric"

        resp = requests.get(url, timeout=10)
        data = resp.json()

        if resp.status_code != 200:
            return None

        # Logic to find tomorrow's data point
        tomorrow = (datetime.now() + timedelta(days=1)).date()
        for block in data.get("list", []):
            block_time = datetime.strptime(block["dt_txt"], "%Y-%m-%d %H:%M:%S")
            if block_time.date() == tomorrow:
                return {
                    "date": block_time.strftime("%Y-%m-%d"),
                    "temperature": block["main"]["temp"],
                    "condition": block["weather"][0]["description"]
                }
        return None
    except Exception as e:
        print(f"❌ Forecast error: {e}")
        return None