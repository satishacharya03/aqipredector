import os
import joblib

# Determine the absolute path for the model relative to this file
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'interlinked_aqi_model.pkl')

# Load the model globally at startup so we don't reload it every single prediction cycle
model = joblib.load(MODEL_PATH)

def predict_aqi(temperature: float, humidity: float, gas_level: float) -> float:
    \"\"\"
    Predicts the Air Quality Index (AQI) based on environmental sensor readouts.
    
    This function utilizes a pre-trained Scikit-Learn regression model pipeline
    loaded from 'interlinked_aqi_model.pkl'.
    
    Args:
        temperature (float): The current ambient temperature (e.g., Celsius).
        humidity (float): The current relative humidity percentage.
        gas_level (float): The current raw gas sensor reading (e.g., analog value or ppm).
        
    Returns:
        float: The calculated machine-learning-predicted AQI rounded to 2 decimal places.
    \"\"\"
    # We wrap the inputs in a 2D array (1 sample, 3 features) as required by Scikit-Learn predictors.
    prediction_result = model.predict([[temperature, humidity, gas_level]])
    
    # The model returns an array of predictions, we extract the first (and only) result.
    predicted_aqi = float(prediction_result[0])

    # Return the predicted value rounded to 2 decimal places for a cleaner UI output.
    return round(predicted_aqi, 2)
