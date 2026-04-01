import threading
import time
import serial
import serial.tools.list_ports
import csv
import os
import re
from datetime import datetime

# Import the ML integration model to calculate AQI instantly up receiving data
from ml_predictor import predict_aqi

# Default serial settings. Set to 'AUTO' to automatically detect Arduino/ESP32, or specify e.g., 'COM3'
SERIAL_PORT = 'AUTO'
BAUD_RATE = 115200

# File path for the CSV data logs
CSV_FILE = 'history_log.csv'

# Thread-safe global dictionary storing the absolute latest sensor values
# and the prediction, so Flask can instantaneously serve it via the API.
# Lock is used to prevent the ESP serial writer and Flask reader from colliding.
latest_reading = {
    "temperature": 0.0,
    "humidity": 0.0,
    "gas_level": 0.0,
    "predicted_aqi": 0.0
}
data_lock = threading.Lock()

def auto_detect_port():
    """
    Scans available COM ports and attempts to find an Arduino/ESP32.
    Returns the port name if found, else None.
    """
    ports = serial.tools.list_ports.comports()
    for port in ports:
        # Common identifiers for Arduino/ESP32 USB-to-Serial chips
        desc = port.description.upper()
        if "ARDUINO" in desc or "CH340" in desc or "CP210" in desc or "UART" in desc:
            return port.device
    
    # Fallback to the first available port if nothing specific matches
    if len(ports) > 0:
        return ports[0].device
        
    return None


def initialize_csv():
    """
    Initializes the historical CSV file with the proper headers if it does not
    already exist in the directory.
    """
    file_exists = os.path.isfile(CSV_FILE)
    if not file_exists:
        with open(CSV_FILE, mode='w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['Timestamp', 'Temperature', 'Humidity', 'Gas_Level', 'Predicted_AQI'])


def log_to_csv(temp: float, humidity: float, gas_level: float, predicted_aqi: float):
    """
    Appends a formatted new row to the historical CSV log containing the current timestamp 
    and the metrics captured from the ESP32 plus the calculated AQI.
    
    Args:
        temp: Temperature reading in Celsius.
        humidity: Humidity percentage.
        gas_level: Gas sensor concentration.
        predicted_aqi: The final predicted/mocked ML AQI score.
    """
    # Generate ISO-8601 formatted timestamp string
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Append to the CSV file safely
    try:
        with open(CSV_FILE, mode='a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow([timestamp, temp, humidity, gas_level, predicted_aqi])
    except Exception as e:
        print(f"Error writing to {CSV_FILE}: {e}")


def serial_read_loop(port: str, baud_rate: int):
    """
    The core loop running inside the daemon thread. It perpetually attempts to listen
    to the defined Serial comport and parses inbound data lines format: 
    "Temperature,Humidity,GasLevel\\n". Upon reading, it updates the global variable
    and logs the line.
    
    Args:
        port: The physical COM endpoint (e.g., 'COM3' or '/dev/ttyUSB0').
        baud_rate: Rate of transmission bits.
    """
    # Ensure our log exists before writing indefinitely
    initialize_csv()
    
    # We use a while loop to continually attempt reconnection if the ESP32 unplugs
    while True:
        try:
            current_port = port
            if current_port == 'AUTO':
                detected = auto_detect_port()
                if detected:
                    current_port = detected
                else:
                    print("No serial devices found. Waiting for Arduino/ESP32 to be plugged in...")
                    time.sleep(5)
                    continue

            print(f"Attempting to connect to ESP32/Arduino on {current_port} at {baud_rate} baud...")
            # Set a 2-second timeout so readline doesn't block forever if no data
            ser = serial.Serial(current_port, baud_rate, timeout=2)
            
            print(f"Successfully connected to the serial port {current_port}.")
            
            # Now loop internally parsing data continuously
            while True:
                # Read bytes and decode to UTF-8 ASCII string. Removes trailing \\r\\n spaces
                line = ser.readline().decode('utf-8').strip()
                
                # We extract any 3 numbers from the line using regex. 
                # This makes it super forgiving if member1 sends "Temp: 25.5, Hum: 60.2, Gas: 450"
                if line:
                    # Find all integer or float numbers in the string
                    numbers = re.findall(r"[-+]?\d*\.\d+|\d+", line)
                    if len(numbers) >= 3:
                        try:
                            t = float(numbers[0])
                            h = float(numbers[1])
                            g = float(numbers[2])
                            
                            # Pipe parameters into the ML model to get our final result
                            aqi = predict_aqi(t, h, g)
                            
                            # Safely acquire lock and mutate our global dictionary payload
                            with data_lock:
                                latest_reading['temperature'] = t
                                latest_reading['humidity'] = h
                                latest_reading['gas_level'] = g
                                latest_reading['predicted_aqi'] = aqi
                                
                            # Save the row to non-volatile local storage
                            log_to_csv(t, h, g, aqi)
                            
                            # Used for testing/console watching
                            # print(f"Read: Temp={t}, Hum={h}, Gas={g} -> AQI={aqi}")
                            
                        except ValueError:
                            # Catch cases where the device sent gibberish or a non-number
                            print(f"Malformed data segment on serial line: '{line}'")
                            
        except serial.SerialException as e:
            # Handle situations where the COM port does not exist or device is missing
            print(f"Serial connection issue: {e}")
            print("Will sleep and retry connection in 5 seconds...")
            ser = None
            
        except Exception as e:
            # Catch all generic exceptions preventing a catastrophic crash
            print(f"Unexpected error in background thread: {e}")
            
        # If we broke out of the internal while loop (connection lost), sleep to prevent rapid bouncing
        time.sleep(5)


def start_serial_daemon():
    """
    Boots up the serial reading job inside of an isolated background thread.
    This ensures that the main Flask thread is 100% liberated to answer API fetching
    calls at max speed. Setting daemon=True enables Python to kill/shutdown the
    background thread gracefully when the main Flask process terminates.
    """
    worker = threading.Thread(
        target=serial_read_loop, 
        args=(SERIAL_PORT, BAUD_RATE),
        daemon=True
    )
    worker.start()
    return worker
