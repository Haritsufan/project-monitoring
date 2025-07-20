// src/hooks/useMQTTVehicles.js
import { useState, useEffect } from 'react';
import mqttServices from '../services/mqttServices';

const useMQTTVehicles = () => {
  const [vehicles, setVehicles] = useState([
    // Default vehicles yang akan di-update dengan data real
    {
      id: 'vehicle_001',
      name: 'Mobil Satu',
      numberPlate: 'N 2395 BC',
      status: 'unknown',
      speed: 0,
      unit: 'km/jam',
      icon: '🚗',
      location: { latitude: -7.9666, longitude: 112.6326 },
      gyroscope: { x: 0, y: 0, z: 0 },
      accelerometer: { x: 0, y: 0, z: 0 },
      lastUpdate: null
    },
    {
      id: 'vehicle_002', 
      name: 'Mobil Dua',
      numberPlate: 'N 1510 AB',
      status: 'unknown',
      speed: 0,
      unit: 'km/jam',
      icon: '🚗',
      location: { latitude: -7.9766, longitude: 112.6226 },
      gyroscope: { x: 0, y: 0, z: 0 },
      accelerometer: { x: 0, y: 0, z: 0 },
      lastUpdate: null
    }
  ]);
  
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [lastDataReceived, setLastDataReceived] = useState(null);

  useEffect(() => {
    // Connect to MQTT
    mqttServices.connect();
    
    // Subscribe to MQTT updates
    const unsubscribe = mqttServices.subscribe((mqttData) => {
      const { vehicleId, dataType, data, timestamp } = mqttData;
      
      setLastDataReceived({ vehicleId, dataType, timestamp });
      
      setVehicles(prevVehicles => 
        prevVehicles.map(vehicle => {
          if (vehicle.id === vehicleId) {
            const updatedVehicle = { ...vehicle, lastUpdate: timestamp };
            
            switch (dataType) {
              case 'gps':
                // Update GPS data
                if (data.latitude && data.longitude) {
                  updatedVehicle.location = {
                    latitude: parseFloat(data.latitude),
                    longitude: parseFloat(data.longitude)
                  };
                }
                // Calculate speed from GPS if available
                if (data.speed !== undefined) {
                  updatedVehicle.speed = parseFloat(data.speed);
                }
                break;
                
              case 'gyroscope':
                // Update gyroscope data
                updatedVehicle.gyroscope = {
                  x: parseFloat(data.x || 0),
                  y: parseFloat(data.y || 0),
                  z: parseFloat(data.z || 0)
                };
                
                // Detect accident based on gyroscope (simple threshold)
                const gyroMagnitude = Math.sqrt(
                  Math.pow(data.x || 0, 2) + 
                  Math.pow(data.y || 0, 2) + 
                  Math.pow(data.z || 0, 2)
                );
                
                // Threshold untuk deteksi kecelakaan (perlu kalibrasi)
                if (gyroMagnitude > 50) { // Adjust threshold sesuai hardware
                  updatedVehicle.status = 'accident';
                  updatedVehicle.icon = '🚨';
                } else if (updatedVehicle.status === 'accident' && gyroMagnitude < 10) {
                  // Recovery dari accident jika gyro sudah stabil
                  updatedVehicle.status = vehicle.speed > 5 ? 'driving' : 'parked';
                  updatedVehicle.icon = '🚗';
                }
                break;
                
              case 'accelerometer':
                // Update accelerometer data
                updatedVehicle.accelerometer = {
                  x: parseFloat(data.x || 0),
                  y: parseFloat(data.y || 0),
                  z: parseFloat(data.z || 0)
                };
                
                // Calculate speed from accelerometer if GPS speed not available
                if (!data.speed && updatedVehicle.speed === 0) {
                  const accelMagnitude = Math.sqrt(
                    Math.pow(data.x || 0, 2) + 
                    Math.pow(data.y || 0, 2)
                  );
                  // Simple speed estimation (perlu kalibrasi)
                  updatedVehicle.speed = Math.min(accelMagnitude * 5, 150); // Max 150 km/h
                }
                break;
                
              case 'status':
                // Direct status update from hardware
                if (data.status) {
                  updatedVehicle.status = data.status;
                  updatedVehicle.icon = data.status === 'accident' ? '🚨' : '🚗';
                }
                break;
                
              default:
                console.warn('Unknown data type:', dataType);
            }
            
            // Auto-determine driving status based on speed
            if (updatedVehicle.status !== 'accident') {
              if (updatedVehicle.speed > 5) {
                updatedVehicle.status = 'driving';
              } else if (updatedVehicle.speed <= 1) {
                updatedVehicle.status = 'parked';
              }
            }
            
            return updatedVehicle;
          }
          return vehicle;
        })
      );
    });

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setConnectionStatus(mqttServices.getConnectionStatus());
    }, 1000);

    // Cleanup
    return () => {
      unsubscribe();
      clearInterval(statusInterval);
      mqttServices.disconnect();
    };
  }, []);

  return {
    vehicles,
    connectionStatus,
    lastDataReceived,
    mqttServices
  };
};

export default useMQTTVehicles;