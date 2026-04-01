"""
How to run this code:
1. Ensure you have Python 3.x installed on your system.
2. Open a terminal/command prompt in this folder ('d:\\AI BCKND').
3. Install the required dependencies by running:
   pip install -r requirements.txt
4. Start the backend server by running:
   python app.py
   
Note: The server will run on http://127.0.0.1:5000/ by default.
It will also attempt to connect to the ESP32 on COM3.
"""

import os
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from serial_reader import start_serial_daemon, latest_reading, data_lock, CSV_FILE

# Initialize the primary Flask application instance
app = Flask(__name__)
# Enable CORS globally for all domains during development (fixes OPTIONS preflight hanging)
CORS(app)

@app.route('/api/live', methods=['GET'])
def get_live_data():
    """
    Endpoint for fetching the absolute latest hardware metrics and ML predictions.

    When the frontend queries this endpoint, it safely taps into the global dictionary 
    maintained by the daemon thread and returns its current state. If the ESP32 is 
    disconnected, it gracefully continues returning the default initialized structure (zeros).
    
    Returns:
        JSON response featuring 4 data points packaged inside a 'success' object.
    """
    
    # We acquire the global lock defined in serial_reader to safely read the values
    # without risk of it mutating concurrently.
    with data_lock:
        data_snapshot = dict(latest_reading)
        
    return jsonify({
        "status": "success",
        "data": data_snapshot
    }), 200


@app.route('/api/history', methods=['GET'])
def get_history_data():
    """
    Endpoint for fetching historical data to plot on the frontend dashboard chart.

    It seeks 'history_log.csv', loads it via Pandas to efficiently handle slicing, 
    and packages the tail 20 entries of real-world measurements and predicted AQI.
    
    Returns:
        JSON response with an array of the 20 most recent row objects containing 
        Timestamp, Temperature, Humidity, Gas_Level, and Predicted_AQI.
    """
    
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



@app.route('/api/predict', methods=['POST'])
def manual_predict():
    """
    Endpoint for manually entering data and getting a prediction purely from the model 
    without relying on the ESP32 hardware loop. Expects JSON body.
    """
    try:
        data = request.get_json()
        if not data:
            raise ValueError("No JSON payload provided")
            
        t = float(data.get('temperature', 0))
        h = float(data.get('humidity', 0))
        g = float(data.get('gas_level', 0))
        
        # Import predictor locally to avoid circular dependencies if any, 
        # though it's already safely imported in serial_reader initially.
        from ml_predictor import predict_aqi
        aqi = predict_aqi(t, h, g)
        
        return jsonify({
            "status": "success",
            "data": {
                "temperature": t,
                "humidity": h,
                "gas_level": g,
                "predicted_aqi": aqi
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

@app.route('/api/update', methods=['POST'])
def update_sensor_data():
    """
    Endpoint for the local bridge script to sync real-time serial sensor data
    to the cloud backend.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
            
        t = float(data.get('temperature', 0))
        h = float(data.get('humidity', 0))
        g = float(data.get('gas_level', 0))
        
        # Calculate AQI using the ML model
        from ml_predictor import predict_aqi
        from serial_reader import log_to_csv
        aqi = predict_aqi(t, h, g)
        
        # Synchronize with the latest_reading bridge used by /api/live
        with data_lock:
            latest_reading['temperature'] = t
            latest_reading['humidity'] = h
            latest_reading['gas_level'] = g
            latest_reading['predicted_aqi'] = aqi
            
        # Log to the historical CSV
        log_to_csv(t, h, g, aqi)
        
        return jsonify({
            "status": "success",
            "data": {
                "temperature": t,
                "humidity": h,
                "gas_level": g,
                "predicted_aqi": aqi
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # 1. Start the hardware background thread ONLY IF we are running locally.
    # On Render, we rely on the /api/update endpoint instead.
    if os.environ.get('RENDER') is None:
        print("Running locally. Booting up hardware daemon process...")
        start_serial_daemon()
    else:
        print("Running on Render. Hardware daemon disabled. Please use /api/update.")
    
    # 2. Start the HTTP API routing engine.
    print("Booting up Flask REST API server...")
    app.run(host='0.0.0.0', port=5000, debug=False)
