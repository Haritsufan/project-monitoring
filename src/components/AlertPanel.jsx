// src/components/AlertPanel.jsx - Simple Fix untuk "7 hours ago"
import React from 'react';

const AlertPanel = ({ alerts = [], vehicles = [], loading = false, onAlertAction }) => {

  const getAlertStyle = (severity) => {
    const styles = {
      critical: 'border-l-red-600 bg-red-50 border-red-200',
      high: 'border-l-red-500 bg-red-50 border-red-200',
      medium: 'border-l-yellow-500 bg-yellow-50 border-yellow-200',
      low: 'border-l-blue-500 bg-blue-50 border-blue-200'
    };
    return styles[severity] || styles.low;
  };

  const getAlertIcon = (alertType, severity) => {
    if (alertType === 'accident') {
      if (severity === 'critical' || severity === 'high') {
        return '🚨';
      }
      return '⚠️';
    }
    return 'ℹ';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-600 text-white',
      high: 'bg-red-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-blue-500 text-white'
    };
    return colors[severity] || colors.low;
  };

  const getActionButtons = (alert) => {
    const actions = ['View Location'];
    
    if (alert.alertType === 'accident') {
      actions.push('Call Emergency');
    }
    
    actions.push('Resolve');
    
    return actions;
  };

  // ========== SIMPLE FIX: Parse backend UTC timestamp ke WIB ==========
  const formatTime = (timestamp) => {
    try {
      // Backend kirim ISO string UTC, kita parse dan convert ke WIB
      const utcDate = new Date(timestamp);
      const wibDate = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000)); // +7 hours untuk WIB
      return wibDate.toLocaleTimeString('id-ID');
    } catch (e) {
      return 'Unknown time';
    }
  };

  const formatDate = (timestamp) => {
    try {
      // Backend kirim ISO string UTC, kita parse dan convert ke WIB
      const utcDate = new Date(timestamp);
      const wibDate = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000)); // +7 hours untuk WIB
      const now = new Date();
      
      const diffInMs = now - wibDate;
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      
      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      }
    } catch (e) {
      return 'Unknown time';
    }
  };

  const handleAction = (alert, action) => {
    if (onAlertAction) {
      onAlertAction(alert, action);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-medium mb-4">🔄 Loading Alerts...</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="border-l-4 border-gray-300 p-3 rounded bg-gray-50">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-gray-300 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-medium mb-4 text-green-600">🟢 All Systems Normal</h3>
        <p className="text-sm text-gray-500">No active alerts or warnings</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-medium mb-4">🔔 Active Alerts ({alerts.length})</h3>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`border-l-4 p-4 rounded border ${getAlertStyle(alert.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {/* Alert Icon */}
                <span className="text-2xl">{getAlertIcon(alert.alertType, alert.severity)}</span>
                
                <div className="flex-1">
                  {/* Header dengan severity badge */}
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-sm">
                      {alert.alertType === 'accident' ? 'Accident Detected' : 'Alert'}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Vehicle Info */}
                  <div className="mb-2">
                    <p className="font-medium text-sm text-gray-800">
                      {alert.vehicleName} ({alert.numberPlate})
                    </p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                  
                  {/* Location */}
                  {alert.lat && alert.lon && (
                    <p className="text-xs text-gray-500 mb-2">
                      📍 Location: {alert.lat.toFixed(4)}, {alert.lon.toFixed(4)}
                    </p>
                  )}
                  
                  {/* Sensor Data untuk Accident */}
                  {alert.alertType === 'accident' && alert.sensorData && (
                    <div className="bg-gray-100 p-2 rounded text-xs mb-2">
                      <p className="font-medium text-gray-700 mb-1">Sensor Data:</p>
                      <div className="grid grid-cols-2 gap-1 text-gray-600">
                        <span>Acceleration: {alert.sensorData.total_g?.toFixed(2)} g</span>
                        <span>Confidence: {(alert.sensorData.confidence * 100)?.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                  
                  {/* ========== FIXED TIMESTAMP - SIMPLE VERSION ========== */}
                  <p className="text-xs text-gray-500 mb-3">
                    {formatDate(alert.createdAt)} at {formatTime(alert.createdAt)} WIB
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {getActionButtons(alert).map(action => (
                      <button
                        key={action}
                        onClick={() => handleAction(alert, action)}
                        className={`
                          px-3 py-1 text-xs rounded font-medium transition-colors
                          ${action === 'Call Emergency' 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : action === 'Resolve'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                          }
                        `}
                      >
                        {action === 'View Location' && '📍 '}
                        {action === 'Call Emergency' && '📞 '}
                        {action === 'Resolve' && '✅ '}
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            {alerts.filter(a => a.alertType === 'accident').length} accident alerts, 
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length} high priority
          </span>
          <span>Auto-refresh active</span>
        </div>
      </div>
    </div>
  );
};

export default AlertPanel;