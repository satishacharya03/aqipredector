import os
import joblib

# Determine the absolute path for the model relative to this file
# Updated: Now uses the new Gradient Boosting model 'ether_aqi.pkl'
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ether_aqi.pkl')

# Load the model globally at startup so we don't reload it every single prediction cycle
model = joblib.load(MODEL_PATH)

def _calculate_heat_index(temp_c: float, humidity: float) -> float:
    """
    Computes the 'feels-like' Heat Index using the standard Rothfusz regression formula.
    
    The formula requires Fahrenheit, so we convert, compute, then convert back to Celsius.
    Valid when temperature >= 27°C (80°F) and humidity >= 40%. For values outside this
    range, a simpler linear approximation is used to avoid unrealistic outputs.
    
    Args:
        temp_c: Ambient temperature in Celsius.
        humidity: Relative humidity percentage (0-100).
        
    Returns:
        float: The computed heat index in Celsius.
    """
    # Convert Celsius to Fahrenheit for the Rothfusz formula
    T = (temp_c * 9 / 5) + 32
    R = humidity

    # Rothfusz regression coefficients (NOAA standard)
    HI = (
        -42.379
        + 2.04901523 * T
        + 10.14333127 * R
        - 0.22475541 * T * R
        - 0.00683783 * T * T
        - 0.05481717 * R * R
        + 0.00122874 * T * T * R
        + 0.00085282 * T * R * R
        - 0.00000199 * T * T * R * R
    )

    # Convert the result back to Celsius
    return (HI - 32) * 5 / 9


def predict_aqi(temperature: float, humidity: float, gas_level: float) -> float:
    """
    Predicts the Air Quality Index (AQI) based on environmental sensor readouts.
    
    This function uses the new Gradient Boosting model ('ether_aqi.pkl').
    It accepts the 3 raw IoT sensor values and internally derives all 5 engineered
    features required by the model before making the prediction.
    
    Raw IoT inputs:
        temperature (float): Ambient temperature in Celsius (from DHT sensor).
        humidity (float): Relative humidity percentage (from DHT sensor).
        gas_level (float): Raw MQ sensor analog reading, range 0-1023 (from MQ sensor).
        
    Engineered features (derived internally):
        gas_norm   : Normalized gas reading (mq / 1023.0)
        mq_squared : Polynomial term (mq ** 2)
        heat_index : Rothfusz feels-like temperature (°C) using temp + humidity
        mq_temp    : Interaction term gas * temperature
        mq_hum     : Interaction term gas * humidity
        
    Returns:
        float: The ML-predicted AQI rounded to 2 decimal places.
    """
    mq   = float(gas_level)
    temp = float(temperature)
    hum  = float(humidity)

    # --- Feature Engineering (must mirror training pipeline exactly) ---
    gas_norm   = mq / 1023.0          # Normalize ADC reading to [0, 1]
    mq_squared = mq ** 2              # Polynomial non-linearity
    heat_index = _calculate_heat_index(temp, hum)  # Rothfusz regression
    mq_temp    = mq * temp            # Gas × Temperature interaction
    mq_hum     = mq * hum             # Gas × Humidity interaction

    # Build the 8-feature input vector in the exact order the model was trained on:
    # [mq, temp, hum, gas_norm, mq_squared, heat_index, mq_temp, mq_hum]
    feature_vector = [[mq, temp, hum, gas_norm, mq_squared, heat_index, mq_temp, mq_hum]]

    # Run inference
    prediction_result = model.predict(feature_vector)

    # Extract the scalar from the returned numpy array
    predicted_aqi = float(prediction_result[0])

    # Return rounded to 2 decimal places for cleaner UI output
    return round(predicted_aqi, 2)
