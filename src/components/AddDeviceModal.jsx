// src/components/AddDeviceModal.jsx
import React, { useState } from 'react';

const AddDeviceModal = ({ isOpen, onClose, onAddDevice }) => {
  const [deviceData, setDeviceData] = useState({
    deviceId: '',
    name: '',
    model: '',
    numberPlate: '',
    year: '',
    color: ''
  });
  
  const [errors, setErrors] = useState({});
  
  // Jika modal tidak terbuka, jangan render apapun
  if (!isOpen) return null;
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setDeviceData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Hapus error untuk field ini saat diubah
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!deviceData.deviceId.trim()) {
      newErrors.deviceId = 'Device ID diperlukan';
    }
    
    if (!deviceData.name.trim()) {
      newErrors.name = 'Nama kendaraan diperlukan';
    }
    
    if (!deviceData.numberPlate.trim()) {
      newErrors.numberPlate = 'Plat nomor diperlukan';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Dalam aplikasi nyata, ini akan mengirim data ke API backend
      onAddDevice(deviceData);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-xl font-semibold">Tambah Perangkat Baru</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Device ID*
            </label>
            <input
              type="text"
              name="deviceId"
              value={deviceData.deviceId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.deviceId ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.deviceId && (
              <p className="text-red-500 text-xs mt-1">{errors.deviceId}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Nama Kendaraan*
            </label>
            <input
              type="text"
              name="name"
              value={deviceData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Model
            </label>
            <input
              type="text"
              name="model"
              value={deviceData.model}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Plat Nomor*
            </label>
            <input
              type="text"
              name="numberPlate"
              value={deviceData.numberPlate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.numberPlate ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.numberPlate && (
              <p className="text-red-500 text-xs mt-1">{errors.numberPlate}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Tahun
              </label>
              <input
                type="number"
                name="year"
                value={deviceData.year}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Warna
              </label>
              <input
                type="text"
                name="color"
                value={deviceData.color}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 text-white rounded-md"
            >
              Tambah Perangkat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDeviceModal;