// src/components/MobileNavigation.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const MobileNavigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  
  const navigationItems = [
    { path: '/', label: 'Overview', icon: '📊' },
    { path: '/devices', label: 'Devices', icon: '🚗' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
    { path: '/reports', label: 'Reports', icon: '📋' }
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            V
          </div>
          <div>
            <h1 className="font-bold text-lg">Vehicle Monitor</h1>
            <p className="text-xs text-gray-500">Real-time tracking</p>
          </div>
        </div>
        
        <button
          onClick={toggleMenu}
          className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none"
        >
          <div className="w-6 h-6 flex flex-col justify-center items-center space-y-1">
            <div className={`w-5 h-0.5 bg-gray-600 transition-all duration-300 ${
              isMenuOpen ? 'rotate-45 translate-y-1.5' : ''
            }`}></div>
            <div className={`w-5 h-0.5 bg-gray-600 transition-all duration-300 ${
              isMenuOpen ? 'opacity-0' : ''
            }`}></div>
            <div className={`w-5 h-0.5 bg-gray-600 transition-all duration-300 ${
              isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
            }`}></div>
          </div>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={toggleMenu}
        >
          <div 
            className="bg-white w-64 h-full shadow-xl transform transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    V
                  </div>
                  <div>
                    <h2 className="font-bold">Vehicle Monitor</h2>
                    <p className="text-sm text-gray-500">Dashboard</p>
                  </div>
                </div>
                <button
                  onClick={toggleMenu}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-4">
              <div className="space-y-2">
                {navigationItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={toggleMenu}
                    className={`
                      flex items-center space-x-3 p-3 rounded-lg transition-colors
                      ${location.pathname === item.path 
                        ? 'bg-blue-100 text-blue-700 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            {/* User Profile Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                  A
                </div>
                <div>
                  <p className="font-medium">Alicia Koch</p>
                  <p className="text-sm text-gray-500">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation untuk Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="grid grid-cols-4 gap-1">
          {navigationItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center py-2 px-1 text-center
                ${location.pathname === item.path 
                  ? 'text-blue-600' 
                  : 'text-gray-500'
                }
              `}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;