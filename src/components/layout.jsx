// src/components/Layout.jsx
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const Layout = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
            A
          </div>
          
        </div>
        
        <div className="flex space-x-6">
          <Link 
            to="/" 
            className={`px-2 py-1 ${currentPath === '/' ? 'font-medium border-b-2 border-gray-800' : ''}`}
          >
            Overview
          </Link>
          <Link 
            to="/devices" 
            className={`px-2 py-1 ${currentPath === '/devices' ? 'font-medium border-b-2 border-gray-800' : ''}`}
          >
            Device Management
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          
          <div className="w-8 h-8 rounded-full bg-gray-800"></div>
        </div>
      </header>
      
      {/* Dashboard Content */}
      <div className="p-6">
        
        
        {/* Sub Navigation */}
        
        
        {/* Main Content - Will be filled by child routes */}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;