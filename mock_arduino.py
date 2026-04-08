import requests
import time
import random

# CONFIGURATION
RENDER_URL = "https://aqipredector.onrender.com"
UPDATE_ENDPOINT = f"{RENDER_URL}/api/update"

print(f"=== Virtual Arduino Started ===")
print(f"Feeding data to: {UPDATE_ENDPOINT}\n")

try:
    while True:
        # 1. Generate Mock Sensor Data
        temp = round(random.uniform(22.0, 30.0), 1)
        humi = round(random.uniform(40.0, 60.0), 1)
        gas = round(random.uniform(100, 200), 1)
        
        # 2. Package data
        payload = {
            "temperature": temp,
            "humidity": humi,
            "gas_level": gas
        }
        
        # 3. Send to Render
        try:
            response = requests.post(UPDATE_ENDPOINT, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                aqi = data.get('data', {}).get('predicted_aqi', 'N/A')
                print(f"Sent: Temp={temp}C, Hum={humi}%, Gas={gas} -> SUCCESS (AQI: {aqi})")
            else:
                print(f"Backend Error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Connection Error: {e}")
            
        time.sleep(5) # Send every 2 seconds
except KeyboardInterrupt:
    print("\nVirtual Arduino Stopped.")
