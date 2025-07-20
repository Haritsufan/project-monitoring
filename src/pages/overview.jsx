// src/pages/Overview.jsx - Complete dengan Simplified Alert Summary
import React, { useState, useEffect, useRef } from "react";
import MapComponent from "../components/MapComponent";
import AlertPanel from "../components/AlertPanel";

// API Base URL - sesuaikan dengan FastAPI backend
const API_BASE_URL = "http://localhost:8000";

// API Service Functions
const dashboardAPI = {
  // Get vehicle locations for map
  async getMapData() {
    try {
      console.log('🔄 Fetching map data from:', `${API_BASE_URL}/dashboard/map`);
      const response = await fetch(`${API_BASE_URL}/dashboard/map`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        console.error(`HTTP ${response.status}: Failed to fetch map data`);
        return [];
      }
      
      const data = await response.json();
      console.log('📥 Raw API Response:', JSON.stringify(data, null, 2));
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching map data:', error);
      return [];
    }
  },

  // Get active alerts
  async getActiveAlerts() {
    try {
      console.log('🚨 Fetching alerts from:', `${API_BASE_URL}/alerts?active_only=true`);
      const response = await fetch(`${API_BASE_URL}/alerts?active_only=true`);
      
      if (!response.ok) {
        console.error('Alerts API failed:', response.status);
        return [];
      }
      
      const data = await response.json();
      console.log('🚨 Alerts received:', data);
      return data;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  },

  // Resolve alert
  async resolveAlert(alertId) {
    try {
      console.log('✅ Resolving alert:', alertId);
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Failed to resolve alert:', response.status);
        return false;
      }
      
      console.log('✅ Alert resolved successfully');
      return true;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return false;
    }
  },

  // Get alert stats
  async getAlertStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/stats`);
      if (!response.ok) {
        console.error('Alert stats API failed:', response.status);
        return null;
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching alert stats:', error);
      return null;
    }
  }
};

const Overview = () => {
  // State untuk data dari API
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  
  // State untuk loading dan error
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(false);
  
  // Ref untuk komunikasi dengan MapComponent
  const mapRef = useRef();
  
  // State untuk polling
  const [isPolling, setIsPolling] = useState(true);

  // Load initial data
  useEffect(() => {
    console.log('🚀 Component mounted, loading initial data...');
    loadDashboardData();
  }, []);

  // Polling untuk update data secara berkala
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(() => {
      console.log('🔄 Auto-refresh triggered');
      loadDashboardData(true);
    }, 15000); // Refresh setiap 15 detik untuk alerts

    return () => clearInterval(pollInterval);
  }, [isPolling]);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      console.log('📊 Loading dashboard data...');

      // Load map data (prioritas utama)
      const mapData = await dashboardAPI.getMapData();
      console.log('🗺️ Map data received:', mapData);

      // Ambil vehicles langsung dari response FastAPI tanpa modifikasi
      let vehiclesData = [];
      if (Array.isArray(mapData)) {
        vehiclesData = mapData;
      } else if (mapData && Array.isArray(mapData.vehicles)) {
        vehiclesData = mapData.vehicles;
      } else if (mapData && mapData.response && Array.isArray(mapData.response)) {
        vehiclesData = mapData.response;
      }

      console.log('🚗 Raw vehicles from FastAPI:', vehiclesData);
      setVehicles(vehiclesData);

      // Load alerts
      if (!silent) setAlertsLoading(true);
      const alertsData = await dashboardAPI.getActiveAlerts();
      setAlerts(alertsData);
      
      // Load alert stats
      const statsData = await dashboardAPI.getAlertStats();
      if (statsData) {
        setAlertStats(statsData);
      }

      if (!silent) {
        console.log('✅ Dashboard data loaded');
        console.log('📊 Vehicle count:', vehiclesData.length);
        console.log('🚨 Active alerts:', alertsData.length);
      }

    } catch (err) {
      console.error('❌ Error loading dashboard data:', err);
      if (!silent) {
        setVehicles([]);
        setAlerts([]);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setAlertsLoading(false);
    }
  };

  // Helper function - hanya format untuk MapComponent, tidak ubah data
  const prepareVehiclesForMap = (vehicles) => {
    if (!Array.isArray(vehicles)) {
      console.log('Vehicles is not array:', vehicles);
      return [];
    }

    return vehicles.map(vehicle => {
      // Ambil koordinat ASLI dari FastAPI
      const lat = vehicle.lat;
      const lng = vehicle.lon;
      
      console.log(`Vehicle from API:`, {
        id: vehicle.id,
        name: vehicle.name,
        lat: lat,
        lon: lng,
        type_lat: typeof lat,
        type_lng: typeof lng
      });

      // Validasi basic - hanya cek apakah ada koordinat
      if (lat === undefined || lng === undefined || lat === null || lng === null) {
        console.warn(`⚠️ Missing coordinates for vehicle:`, vehicle);
        return null;
      }

      // Return vehicle ASLI dari FastAPI dengan format yang dibutuhkan MapComponent
      return {
        ...vehicle, // Semua data asli dari FastAPI
        location: {
          latitude: lat,
          longitude: lng,
        }
      };
    }).filter(vehicle => vehicle !== null);
  };

  // Fungsi untuk focus ke kendaraan di peta
  const handleVehicleClick = (vehicleId) => {
    console.log('🎯 Clicking vehicle:', vehicleId);
    if (mapRef.current && mapRef.current.focusOnVehicle) {
      mapRef.current.focusOnVehicle(vehicleId);
    }
  };

  // Handle alert actions
  const handleAlertAction = async (alert, action) => {
    switch(action) {
      case 'View Location':
        // Focus pada kendaraan di peta berdasarkan deviceId
        const vehicle = vehicles.find(v => v.deviceId === alert.deviceId);
        if (vehicle) {
          handleVehicleClick(vehicle.id);
        }
        break;
      
      case 'Resolve':
        const success = await dashboardAPI.resolveAlert(alert.id);
        if (success) {
          // Refresh alerts
          loadDashboardData(true);
        }
        break;
      
      case 'Call Emergency':
        // Simulasi panggilan darurat
        alert(`Emergency services contacted for ${alert.vehicleName}!`);
        break;
      
      default:
        break;
    }
  };

  // Prepare vehicles untuk map
  const mapVehicles = prepareVehiclesForMap(vehicles);
  console.log('🗺️ Vehicles prepared for map:', mapVehicles);

  return (
    <div className="space-y-6">
      {/* Alert Summary Bar - SIMPLIFIED & ALWAYS VISIBLE */}
      <div className={`px-4 py-3 rounded border ${
        alertStats && alertStats.activeAlerts > 0 
          ? 'bg-red-100 border-red-400 text-red-700' 
          : 'bg-green-100 border-green-400 text-green-700'
      }`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {alertStats && alertStats.activeAlerts > 0 ? (
              <>🚨 {alertStats.activeAlerts} Active Alert{alertStats.activeAlerts !== 1 ? 's' : ''} - Requires Immediate Attention</>
            ) : (
              <>🟢 All Systems Normal - No Active Alerts</>
            )}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {alertsLoading && '🔄 Checking...'}
            </span>
            <span className="text-xs text-gray-500">
              Last check: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        {/* System Status Only */}
        {alertStats && (
          <div className="mt-2 text-sm">
            <span>System Status: {alertStats.activeAlerts === 0 ? '✅ All Clear' : '⚠️ Alert Mode'}</span>
          </div>
        )}
      </div>

      {/* Maps Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Vehicle Tracking</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map component */}
          <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">Vehicle Overview</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {mapVehicles.length} vehicle{mapVehicles.length !== 1 ? 's' : ''}
                </span>
                {loading && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            </div>
            <div className="h-96">
              <MapComponent 
                ref={mapRef} 
                vehicles={mapVehicles} 
              />
            </div>
          </div>

          {/* Right Column: Speed Legend + Vehicles List */}
          <div className="flex flex-col space-y-4 h-full">
            {/* Speed Legend */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="font-semibold text-sm mb-3 text-gray-800">📊 Speed Legend</h4>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-500 border border-white shadow-sm"></div>
                  <span className="text-xs text-gray-700">0</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500 border border-white shadow-sm"></div>
                  <span className="text-xs text-gray-700">1-30</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border border-white shadow-sm"></div>
                  <span className="text-xs text-gray-700">31-60</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 border border-white shadow-sm"></div>
                  <span className="text-xs text-gray-700">61-80</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500 border border-white shadow-sm"></div>
                  <span className="text-xs text-gray-700">&gt;80</span>
                </div>
              </div>
            </div>

            {/* Active Cars List */}
            <div className="bg-white p-4 rounded-lg shadow flex-1 min-h-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Active Vehicles</h3>
                <span className="text-xs text-gray-500">
                  {mapVehicles.length} device{mapVehicles.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-4 h-full overflow-y-auto">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : mapVehicles.length > 0 ? (
                  mapVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      onClick={() => handleVehicleClick(vehicle.id)}
                      title={`Click to focus on ${vehicle.name} on map`}
                    >
                      <div className="text-2xl mr-3">
                        <span>🚗</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{vehicle.name || `Vehicle ${vehicle.id}`}</div>
                        <div className="text-xs text-gray-600">
                          Speed: {vehicle.speed || 0} km/h
                        </div>
                        <div className="text-xs text-gray-400">
                          📍 {vehicle.lat?.toFixed(4)}, {vehicle.lon?.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p className="text-sm">No vehicles available</p>
                      <p className="text-xs mt-1">Check your ESP32 devices</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Panel - ALWAYS VISIBLE */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          🚨 Alert Management ({alerts.length} active)
        </h2>
        <AlertPanel 
          alerts={alerts}
          vehicles={mapVehicles}
          loading={alertsLoading}
          onAlertAction={handleAlertAction}
        />
      </div>

      {/* System Info Footer */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            <span className="font-medium">IoT Vehicle Monitoring System</span>
            <span className="ml-2">Real-time ESP32 Tracking with ML Accident Detection</span>
          </div>
          <div className="text-xs">
            Auto-refresh: {isPolling ? '🔄 Every 15s' : '⏸️ Paused'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;