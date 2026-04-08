import serial
import serial.tools.list_ports
import requests
import time
import re

# ==========================================
# CONFIGURATION
# ==========================================
# REPLACE THIS with your actual Render URL (e.g., "https://your-app.onrender.com")
RENDER_URL = "https://aqipredector.onrender.com" 
UPDATE_ENDPOINT = f"{RENDER_URL}/api/update"

BAUD_RATE = 115200
SERIAL_PORT = 'COM3' # Set to 'COM3' etc. if auto-detect fails

def auto_detect_port():
    ports = serial.tools.list_ports.comports()
    for port in ports:
        desc = port.description.upper()
        if "ARDUINO" in desc or "CH340" in desc or "CP210" in desc or "UART" in desc:
            return port.device
    if len(ports) > 0:
        return ports[0].device
    return None

def main():
    print("=== AI Air Quality Monitor: Local Bridge ===")
    print(f"Targeting Backend: {UPDATE_ENDPOINT}")
    
    while True:
        try:
            port = SERIAL_PORT
            if port == 'AUTO':
                port = auto_detect_port()
                if not port:
                    print("No Arduino found. Retrying in 5s...")
                    time.sleep(5)
                    continue
            
            print(f"Connecting to {port}...")
            ser = serial.Serial(port, BAUD_RATE, timeout=2)
            print(f"Connected! Listening for sensor data...")

            while True:
                line = ser.readline().decode('utf-8').strip()
                if line:
                    print(f"Serial Input: {line}")
                    
                    # Extract 3 numbers (Temp, Hum, Gas)
                    numbers = re.findall(r"[-+]?\d*\.\d+|\d+", line)
                    if len(numbers) >= 3:
                        payload = {
                            "temperature": float(numbers[0]),
                            "humidity": float(numbers[1]),
                            "gas_level": float(numbers[2])
                        }
                        
                        # Send to Render
                        try:
                            response = requests.post(UPDATE_ENDPOINT, json=payload, timeout=5)
                            if response.status_code == 200:
                                result = response.json()
                                aqi = result.get('data', {}).get('predicted_aqi', 'N/A')
                                print(f" Successfully sent to Cloud! Predicted AQI: {aqi}")
                            else:
                                print(f" Error: Backend returned {response.status_code}")
                        except requests.exceptions.RequestException as e:
                            print(f" Connection Error to Render: {e}")
                
        except Exception as e:
            print(f"Serial Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
