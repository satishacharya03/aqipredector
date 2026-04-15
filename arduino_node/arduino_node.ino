/*
 * AI Air Quality Monitor - Arduino Sensor Node
 * 
 * Hardware Requirements:
 * 1. Arduino Uno / Nano / ESP32 / ESP8266
 * 2. DHT11 or DHT22 Temperature & Humidity Sensor (Data pin connected to D2)
 * 3. MQ-135 or MQ-2 Gas Sensor (Analog Out connected to A0)
 * 
 * Dependencies:
 * - "DHT sensor library" by Adafruit (Install via Arduino Library Manager)
 * - "Adafruit Unified Sensor" (Usually installed alongside the DHT library)
 */

#include "DHT.h"

// --- Hardware Pin Configurations ---
#define DHTPIN 8      // Digital pin connected to the DHT sensor (D8)
#define DHTTYPE DHT11  // Change to DHT22 if using a DHT22 sensor
#define MQ_PIN A0      // Analog pin connected to the MQ Gas Sensor (A0)
#define BUZZER_PIN 13   // Buzzer connected to pin 10
#define GAS_ALARM_THRESHOLD 200 // Trigger buzzer if gas level exceeds this

// Initialize DHT sensor instance
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  // MUST match the BAUD_RATE found in backend's serial_reader.py (115200)
  Serial.begin(115200);
  
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Wait for the serial port to connect (required for native USB boards like Leonardo/ESP32)
  while (!Serial) { 
    ; 
  }

  Serial.println("System Booting...");
  
  // Startup beep
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
  delay(100);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("Initializing DHT Sensor...");
  
  // Start the DHT sensor
  dht.begin();
  
  // Optional: Allow sensors to warm up slightly
  delay(2000); 
  Serial.println("Sensors Ready. Beginning data stream.");
}

void loop() {
  // 1. Read Temperature & Humidity from DHT sensor
  // Reading temperature or humidity takes about 250 milliseconds
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature(); // Read temperature as Celsius

  // Check if any DHT reads failed and exit early (to try again next loop).
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Error: Failed to read from DHT sensor! Check wiring.");
    delay(2000); // Wait 2 seconds before retrying
    return;
  }

  // 2. Read Gas level from MQ Sensor
  // Returns an analog value between 0-1023 (or 0-4095 on ESP32) representing gas concentration
  float gasLevel = analogRead(MQ_PIN);

  // 3. Trigger Gas Alarm if threshold is exceeded
  if (gasLevel > GAS_ALARM_THRESHOLD) {
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }

  // 4. Transmit data to the Python Backend
  // The Python backend uses forgiving smart-regex, meaning we can include debug text
  // as long as the numbers appear in exactly this order: Temperature, Humidity, Gas Level.
  
  Serial.print("Temp: ");
  Serial.print(temperature);
  Serial.print(" C | Humidity: ");
  Serial.print(humidity);
  Serial.print(" % | Gas: ");
  Serial.println(gasLevel);

  // 4. Delay between readings
  // DHT11 sensors generally only update their readings once every 2 seconds.
  delay(2000);
}
