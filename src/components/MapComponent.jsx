// src/components/MapComponent.jsx
import React, { useImperativeHandle, forwardRef, useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix ikon default Leaflet agar tidak hilang
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Komponen kontrol fokus kendaraan di peta
const MapController = ({ vehicles, focusVehicleId, onFocusComplete }) => {
  const map = useMap();

  useEffect(() => {
    if (focusVehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === focusVehicleId);
      if (vehicle) {
        // Ambil koordinat dengan berbagai format yang mungkin
        const lat = vehicle?.location?.latitude || vehicle?.lat;
        const lng = vehicle?.location?.longitude || vehicle?.lng || vehicle?.lon;

        if (typeof lat === 'number' && typeof lng === 'number') {
          console.log(`Focusing on vehicle ${focusVehicleId} at [${lat}, ${lng}]`);
          map.flyTo([lat, lng], 16, { duration: 1.5 });
          setTimeout(() => {
            if (onFocusComplete) onFocusComplete();
          }, 1500);
        } else {
          console.warn(`Invalid coordinates for vehicle ${focusVehicleId}:`, { lat, lng });
        }
      }
    }
  }, [focusVehicleId, vehicles, map, onFocusComplete]);

  return null;
};

const MapComponent = forwardRef(({ vehicles = [] }, ref) => {
  const mapRef = useRef();
  const [focusVehicleId, setFocusVehicleId] = useState(null);

  const defaultCenter = [-7.9666, 112.6326]; // Malang, fallback
  const defaultZoom = 13;

  // Debug log untuk melihat data vehicles yang diterima
  console.log('MapComponent received vehicles:', vehicles);

  // Expose function ke parent component
  useImperativeHandle(ref, () => ({
    focusOnVehicle: (vehicleId) => {
      console.log('Focus on vehicle called:', vehicleId);
      setFocusVehicleId(vehicleId);
    },
    getMap: () => mapRef.current
  }));

  // Ambil titik tengah peta berdasarkan kendaraan yang ada
  const getMapCenter = () => {
    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      console.log('No vehicles, using default center');
      return defaultCenter;
    }

    // Cari kendaraan pertama dengan koordinat yang valid
    for (let v of vehicles) {
      const lat = v?.location?.latitude || v?.lat;
      const lng = v?.location?.longitude || v?.lng || v?.lon;
      
      if (typeof lat === 'number' && typeof lng === 'number') {
        console.log(`Using center from vehicle ${v.id || v.name}: [${lat}, ${lng}]`);
        return [lat, lng];
      }
    }
    
    console.log('No valid coordinates found, using default center');
    return defaultCenter;
  };

  // Custom icon berdasarkan kecepatan kendaraan
  const getVehicleIcon = (speed, isHighlighted = false) => {
    // Tentukan warna berdasarkan kecepatan
    let color, emoji, description;
    
    if (speed === 0) {
      color = '#6c757d'; // Abu-abu untuk parkir
      emoji = '🅿️';
      description = 'Parkir';
    } else if (speed > 0 && speed <= 30) {
      color = '#28a745'; // Hijau untuk kecepatan rendah
      emoji = '🐌';
      description = 'Lambat';
    } else if (speed > 30 && speed <= 60) {
      color = '#007bff'; // Biru untuk kecepatan normal
      emoji = '🚗';
      description = 'Normal';
    } else if (speed > 60 && speed <= 80) {
      color = '#ffc107'; // Kuning untuk kecepatan tinggi
      emoji = '🏃';
      description = 'Cepat';
    } else {
      color = '#dc3545'; // Merah untuk kecepatan sangat tinggi
      emoji = '🚨';
      description = 'Overspeed';
    }

    const size = isHighlighted ? 32 : 24;

    return L.divIcon({
      className: 'custom-vehicle-marker',
      html: `
        <div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${isHighlighted ? '4px' : '2px'} solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isHighlighted ? '14px' : '10px'};
          ${isHighlighted ? 'animation: bounce 0.6s ease-in-out;' : ''}
        ">
          ${emoji}
        </div>
        <div style="
          position: absolute;
          top: ${size + 10}px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          ${isHighlighted ? '' : 'display: none;'}
        ">
          ${speed} km/h - ${description}
        </div>
      `,
      iconSize: [size + 8, size + 8],
      iconAnchor: [(size + 8) / 2, (size + 8) / 2],
      popupAnchor: [0, -(size + 8) / 2]
    });
  };

  // Validasi dan filter vehicles dengan koordinat yang valid
  const validVehicles = vehicles.filter(vehicle => {
    const lat = vehicle?.location?.latitude || vehicle?.lat;
    const lng = vehicle?.location?.longitude || vehicle?.lng || vehicle?.lon;
    
    const isValid = typeof lat === 'number' && typeof lng === 'number' && 
                   !isNaN(lat) && !isNaN(lng) && 
                   lat >= -90 && lat <= 90 && 
                   lng >= -180 && lng <= 180;
    
    if (!isValid) {
      console.warn('Invalid vehicle coordinates:', vehicle);
    }
    
    return isValid;
  });

  console.log(`Valid vehicles for map: ${validVehicles.length}/${vehicles.length}`);

  const mapCenter = getMapCenter();

  return (
    <div className="w-full h-full" style={{ minHeight: '400px' }}>
      <MapContainer
        center={mapCenter}
        zoom={defaultZoom}
        style={{ height: '98%', width: '100%' }}
        ref={mapRef}
        scrollWheelZoom={true}
      >
        <MapController
          vehicles={validVehicles}
          focusVehicleId={focusVehicleId}
          onFocusComplete={() => setFocusVehicleId(null)}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validVehicles.map((vehicle, index) => {
          // Ambil koordinat dengan berbagai format yang mungkin dari FastAPI
          const lat = vehicle?.location?.latitude || vehicle?.lat;
          const lng = vehicle?.location?.longitude || vehicle?.lng || vehicle?.lon;
          const speed = vehicle?.speed || 0;

          const isHighlighted = focusVehicleId === vehicle.id;

          // Pastikan unique key untuk multiple devices
          const uniqueKey = vehicle.id || vehicle.deviceId || `vehicle-${index}`;
          
          console.log(`Rendering marker ${index + 1} for device ${vehicle.deviceId || vehicle.device_id}: [${lat}, ${lng}], speed: ${speed}`);

          return (
            <Marker
              key={uniqueKey}
              position={[lat, lng]}
              icon={getVehicleIcon(speed, isHighlighted)}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                    {vehicle.name || vehicle.vehicle_name || `Device ${vehicle.deviceId || vehicle.device_id}`}
                  </h3>
                  <div style={{ fontSize: '14px' }}>
                    <p><strong>Device ID:</strong> {vehicle.deviceId || vehicle.device_id || '-'}</p>
                    <p><strong>Vehicle ID:</strong> {vehicle.id || '-'}</p>
                    <p><strong>Plat:</strong> {vehicle.numberPlate || vehicle.number_plate || '-'}</p>
                    <p><strong>Kecepatan:</strong> 
                      <span style={{
                        color: speed === 0 ? 'gray' :
                               speed <= 30 ? 'green' :
                               speed <= 60 ? 'blue' :
                               speed <= 80 ? 'orange' : 'red',
                        fontWeight: 'bold',
                        marginLeft: '5px'
                      }}>
                        {speed.toFixed(1)} km/h
                        {speed === 0 && ' (Parkir)'}
                        {speed > 0 && speed <= 30 && ' (Lambat)'}
                        {speed > 30 && speed <= 60 && ' (Normal)'}
                        {speed > 60 && speed <= 80 && ' (Cepat)'}
                        {speed > 80 && ' (Overspeed!)'}
                      </span>
                    </p>
                    <p><strong>Koordinat:</strong></p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      Lat: {lat.toFixed(6)}<br />
                      Long: {lng.toFixed(6)}
                    </p>
                    {vehicle.lastUpdate && (
                      <p style={{ fontSize: '12px', color: '#666' }}>
                        <strong>Last Update:</strong><br />
                        {new Date(vehicle.lastUpdate).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Info Panel */}
      <div className="absolute top-4 right-4 z-[1000]">
        {validVehicles.length === 0 && vehicles.length > 0 && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded text-sm mb-2">
            ⚠️ {vehicles.length} device(s) loaded but coordinates invalid
          </div>
        )}
        
        
        
        
      </div>

      {/* Gaya animasi bounce */}
      <style>
        {`
          @keyframes bounce {
            0%, 20%, 60%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-10px);
            }
            80% {
              transform: translateY(-5px);
            }
          }
          .custom-vehicle-marker {
            background: transparent !important;
            border: none !important;
          }
        `}
      </style>
    </div>
  );
});

export default MapComponent; 