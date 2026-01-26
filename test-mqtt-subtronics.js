import mqtt from 'mqtt';

// MQTT Configuration
const MQTT_BROKER = 'mqtt://broker.zeptac.com:1883';
const MQTT_USERNAME = 'zeptac_iot';
const MQTT_PASSWORD = 'ZepIOT@123';
const MQTT_TOPIC = 'SubTronics/data';

// Connect to MQTT broker
const client = mqtt.connect(MQTT_BROKER, {
  clientId: `subtronics-test-${Date.now()}`,
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  keepalive: 60,
  clean: true
});

client.on('connect', () => {
  console.log('🔌 Connected to MQTT broker');
  console.log(`📡 Publishing test data to topic: ${MQTT_TOPIC}`);
  
  // Publish test data every 5 seconds
  setInterval(() => {
    const testPayload = {
      "Device Alise Name": "Gas Sensor Block1",
      "OTSM-2 Serial Number": "OTSM-0114",
      "Gas": "Carbon Monoxide (CO)",
      "timestamp": new Date().toISOString().replace('T', ' ').substring(0, 19),
      "Sender": "Device",
      "Message Type": "LOG DATA",
      "Unit of Measurement": "ppm",
      "Parameters": {
        "Offset": Math.floor(Math.random() * 200), // Use Offset as sensor reading
        "Span High": 2000,
        "Span Low": 0,
        "Alarm Level A1": 250,
        "Alarm Level A2": 500,
        "Alarm Level A3": 1000,
        "Decimal Point": 0,
        "A1Type": "High",
        "A1Hysterysis": 0,
        "A1Latching": 0,
        "A1Siren": 0,
        "A1Buzzer": 0,
        "Alarm 1 LED Status": Math.random() > 0.8 ? 1 : 0, // Random alarm
        "Alarm 2 LED Status": Math.random() > 0.9 ? 1 : 0,
        "Alarm 3 LED Status": Math.random() > 0.95 ? 1 : 0,
        "SensorFault": Math.random() > 0.98 ? 1 : 0,
        "lat": "00.00",
        "long": "00.00"
      }
    };
    
    client.publish(MQTT_TOPIC, JSON.stringify(testPayload), (err) => {
      if (err) {
        console.error('❌ Failed to publish:', err);
      } else {
        console.log(`📤 Published test data - Gas: ${testPayload.Parameters.Offset} ppm, Alarms: A1=${testPayload.Parameters["Alarm 1 LED Status"]}, A2=${testPayload.Parameters["Alarm 2 LED Status"]}, A3=${testPayload.Parameters["Alarm 3 LED Status"]}`);
      }
    });
  }, 5000);
});

client.on('error', (err) => {
  console.error('🚨 MQTT Error:', err);
});

client.on('offline', () => {
  console.log('📴 MQTT client offline');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test client...');
  client.end();
  process.exit(0);
});