\"\"\"
How to run this code:
1. Ensure you have Python 3.x installed on your system.
2. Open a terminal/command prompt in this folder ('d:\\AI BCKND').
3. Install the required dependencies by running:
   pip install -r requirements.txt
4. Start the backend server by running:
   python app.py
   
Note: The server will run on http://127.0.0.1:5000/ by default.
It will also attempt to connect to the ESP32 on COM3.
\"\"\"

import os
import pandas as pd
from flask import Flask, jsonify
from flask_cors import cross_origin

from serial_reader import start_serial_daemon, latest_reading, data_lock, CSV_FILE

# Initialize the primary Flask application instance
app = Flask(__name__)

@app.route('/api/live', methods=['GET'])
@cross_origin(origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"])
def get_live_data():
    \"\"\"
    Endpoint for fetching the absolute latest hardware metrics and ML predictions.

    When the frontend queries this endpoint, it safely taps into the global dictionary 
    maintained by the daemon thread and returns its current state. If the ESP32 is 
    disconnected, it gracefully continues returning the default initialized structure (zeros).
    
    Returns:
        JSON response featuring 4 data points packaged inside a 'success' object.
    \"\"\"
    
    # We acquire the global lock defined in serial_reader to safely read the values
    # without risk of it mutating concurrently.
    with data_lock:
        data_snapshot = dict(latest_reading)
        
    return jsonify({
        "status": "success",
        "data": data_snapshot
    }), 200


@app.route('/api/history', methods=['GET'])
@cross_origin(origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"])
def get_history_data():
    \"\"\"
    Endpoint for fetching historical data to plot on the frontend dashboard chart.

    It seeks 'history_log.csv', loads it via Pandas to efficiently handle slicing, 
    and packages the tail 20 entries of real-world measurements and predicted AQI.
    
    Returns:
        JSON response with an array of the 20 most recent row objects containing 
        Timestamp, Temperature, Humidity, Gas_Level, and Predicted_AQI.
    \"\"\"
    
    # Check if the log file even exists yet. If not, fallback instantly and return an empty array
    if not os.path.exists(CSV_FILE):
        return jsonify({
            "status": "success",
            "data": []
        }), 200
        
    try:
        # Load the CSV utilizing Pandas because it flawlessly parses dates
        # and has convenient slicing functionality
        df = pd.read_csv(CSV_FILE)
        
        # Slices out only the most recent 20 entries
        last_20_rows = df.tail(20)
        
        # Convert the dataframe to a list of Python dictionaries to serialize as JSON
        # Output format: [{"Timestamp": "...", "Temperature": 25.5, ...}, {...}]
        historical_records = last_20_rows.to_dict(orient="records")
        
        return jsonify({
            "status": "success",
            "data": historical_records
        }), 200

    except Exception as e:
        # Catch errors if the CSV becomes briefly locked by the serial thread's open() write.
        # This is non-fatal; we just return an error so the frontend knows to retry later.
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


if __name__ == '__main__':
    # 1. Start the hardware background thread so it can begin listening for ESP32 bytes immediately.
    print("Booting up hardware daemon process...")
    start_serial_daemon()
    
    # 2. Start the HTTP API routing engine.
    # Set debug=False because the background serial thread can spawn multiple 
    # redundant ghosts if Flask's hot-reloader triggers constantly during dev.
    # Set host='0.0.0.0' so it is discoverable by other machines on the LAN if needed.
    print("Booting up Flask REST API server...")
    app.run(host='0.0.0.0', port=5000, debug=False)
