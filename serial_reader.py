import threading
import time
import serial
import csv
import os
from datetime import datetime

# Import the ML integration model to calculate AQI instantly up receiving data
from ml_predictor import predict_aqi

# Default serial settings. Change 'COM3' to the appropriate port mapping.
SERIAL_PORT = 'COM3'
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

def initialize_csv():
    \"\"\"
    Initializes the historical CSV file with the proper headers if it does not
    already exist in the directory.
    \"\"\"
    file_exists = os.path.isfile(CSV_FILE)
    if not file_exists:
        with open(CSV_FILE, mode='w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['Timestamp', 'Temperature', 'Humidity', 'Gas_Level', 'Predicted_AQI'])


def log_to_csv(temp: float, humidity: float, gas_level: float, predicted_aqi: float):
    \"\"\"
    Appends a formatted new row to the historical CSV log containing the current timestamp 
    and the metrics captured from the ESP32 plus the calculated AQI.
    
    Args:
        temp: Temperature reading in Celsius.
        humidity: Humidity percentage.
        gas_level: Gas sensor concentration.
        predicted_aqi: The final predicted/mocked ML AQI score.
    \"\"\"
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
    \"\"\"
    The core loop running inside the daemon thread. It perpetually attempts to listen
    to the defined Serial comport and parses inbound data lines format: 
    "Temperature,Humidity,GasLevel\\n". Upon reading, it updates the global variable
    and logs the line.
    
    Args:
        port: The physical COM endpoint (e.g., 'COM3' or '/dev/ttyUSB0').
        baud_rate: Rate of transmission bits.
    \"\"\"
    # Ensure our log exists before writing indefinitely
    initialize_csv()
    
    # We use a while loop to continually attempt reconnection if the ESP32 unplugs
    while True:
        try:
            print(f"Attempting to connect to ESP32 on {port} at {baud_rate} baud...")
            # Set a 2-second timeout so readline doesn't block forever if no data
            ser = serial.Serial(port, baud_rate, timeout=2)
            
            print("Successfully connected to the serial port.")
            
            # Now loop internally parsing data continuously
            while True:
                # Read bytes and decode to UTF-8 ASCII string. Removes trailing \\r\\n spaces
                line = ser.readline().decode('utf-8').strip()
                
                # We expect the payload to be 3 comma-separated numbers: "25.5,60.2,450"
                if line:
                    parts = line.split(',')
                    if len(parts) == 3:
                        try:
                            t = float(parts[0])
                            h = float(parts[1])
                            g = float(parts[2])
                            
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
    \"\"\"
    Boots up the serial reading job inside of an isolated background thread.
    This ensures that the main Flask thread is 100% liberated to answer API fetching
    calls at max speed. Setting daemon=True enables Python to kill/shutdown the
    background thread gracefully when the main Flask process terminates.
    \"\"\"
    worker = threading.Thread(
        target=serial_read_loop, 
        args=(SERIAL_PORT, BAUD_RATE),
        daemon=True
    )
    worker.start()
    return worker
