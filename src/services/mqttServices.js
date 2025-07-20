
import mqtt from 'mqtt';

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscribers = new Map();
  }

  // Konfigurasi HiveMQ Cloud
  connect(brokerUrl = 'mqtt://broker.hivemq.com:1883') {
    const options = {
      clientId: `vehicle_monitor_${Math.random().toString(36).substr(2, 9)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
      // Jika menggunakan HiveMQ Cloud dengan auth:
      // username: 'your_username',
      // password: 'your_password'
    };

    try {
      this.client = mqtt.connect(brokerUrl, options);
      
      this.client.on('connect', () => {
        console.log('✅ Connected to MQTT Broker:', brokerUrl);
        this.isConnected = true;
        
        // Subscribe ke semua topik kendaraan
        this.client.subscribe('vehicles/+/gps', (err) => {
          if (!err) console.log('📍 Subscribed to GPS data');
        });
        
        this.client.subscribe('vehicles/+/gyroscope', (err) => {
          if (!err) console.log('🔄 Subscribed to Gyroscope data');
        });
        
        this.client.subscribe('vehicles/+/accelerometer', (err) => {
          if (!err) console.log('⚡ Subscribed to Accelerometer data');
        });
        
        this.client.subscribe('vehicles/+/status', (err) => {
          if (!err) console.log('📊 Subscribed to Status updates');
        });
      });

      this.client.on('message', (topic, message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`📨 Received data from ${topic}:`, data);
          
          // Parse topic untuk mendapatkan vehicle ID dan data type
          const topicParts = topic.split('/');
          const vehicleId = topicParts[1];
          const dataType = topicParts[2];
          
          // Notify all subscribers
          this.subscribers.forEach(callback => {
            callback({
              vehicleId,
              dataType,
              data,
              timestamp: new Date()
            });
          });
          
        } catch (error) {
          console.error('❌ Error parsing MQTT message:', error);
        }
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT Connection Error:', error);
        this.isConnected = false;
      });

      this.client.on('disconnect', () => {
        console.log('🔌 Disconnected from MQTT Broker');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Failed to connect to MQTT:', error);
    }
  }

  // Subscribe untuk menerima updates
  subscribe(callback) {
    const id = Math.random().toString(36).substr(2, 9);
    this.subscribers.set(id, callback);
    
    return () => {
      this.subscribers.delete(id);
    };
  }

  // Publish data (untuk testing atau command)
  publish(topic, data) {
    if (this.client && this.isConnected) {
      this.client.publish(topic, JSON.stringify(data));
      console.log(`📤 Published to ${topic}:`, data);
    } else {
      console.warn('⚠️ MQTT not connected, cannot publish');
    }
  }

  // Disconnect
  disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      console.log('🔌 MQTT Disconnected');
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

// Singleton instance
const mqttService = new MQTTService();
export default mqttService;