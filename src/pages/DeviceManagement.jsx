// src/pages/DeviceManagement.jsx - COMPLETE CORS FIXED
import React, { useState, useEffect } from "react";

// API Base URL - FIXED: Ganti ke localhost
const API_BASE_URL = "http://localhost:8000";

// API Service Functions
const deviceAPI = {
  // Get all devices
  async getDevices() {
    const response = await fetch(`${API_BASE_URL}/vehicles`);
    if (!response.ok) throw new Error("Failed to fetch devices");
    return response.json();
  },

  // Create new device
  async createDevice(deviceData) {
    const response = await fetch(`${API_BASE_URL}/vehicles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deviceData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create device");
    }
    return response.json();
  },

  // Update device
  async updateDevice(deviceId, updateData) {
    const response = await fetch(`${API_BASE_URL}/vehicles/${deviceId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error("Failed to update device");
    return response.json();
  },

  // Delete device - FIXED: Use vehicle.id (integer) + enhanced debug
  async deleteDevice(vehicleId) {
    try {
      console.log('🗑️ Starting delete process for vehicle ID:', vehicleId);
      console.log('🗑️ Vehicle ID type:', typeof vehicleId);
      console.log('🗑️ Delete URL:', `${API_BASE_URL}/vehicles/${vehicleId}`);
      
      const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      console.log('🗑️ Response status:', response.status);
      console.log('🗑️ Response ok:', response.ok);
  
      if (!response.ok) {
        let errorDetail;
        try {
          errorDetail = await response.json();
          console.error("❌ Delete failed (JSON):", errorDetail);
        } catch (e) {
          errorDetail = await response.text();
          console.error("❌ Delete failed (Text):", errorDetail);
        }
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorDetail)}`);
      }
  
      const data = await response.json();
      console.log("✅ Delete success:", data);
      return data;
    } catch (error) {
      console.error("❌ Complete error object:", error);
      console.error("❌ Error name:", error.name);
      console.error("❌ Error message:", error.message);
      throw error;
    }
  }
};

const DeviceManagement = () => {
  // State untuk devices dan loading
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk Add Device Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDeviceForm, setAddDeviceForm] = useState({
    device_id: "",
    vehicle_name: "",
    number_plate: "",
    driver_name: "",
    contact_number: "",
  });
  const [addDeviceLoading, setAddDeviceLoading] = useState(false);

  // State untuk filters dan pagination - FIXED: Use vehicle.id
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("vehicle_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Load devices saat component mount
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const devicesData = await deviceAPI.getDevices();
      setDevices(devicesData);
    } catch (err) {
      setError(err.message);
      console.error("Error loading devices:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Device Form
  const handleAddDeviceChange = (field, value) => {
    setAddDeviceForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddDeviceSubmit = async (e) => {
    e.preventDefault();

    try {
      setAddDeviceLoading(true);

      // Validate required fields
      if (
        !addDeviceForm.device_id.trim() ||
        !addDeviceForm.vehicle_name.trim()
      ) {
        alert("Device ID dan Vehicle Name wajib diisi!");
        return;
      }

      // Create device via API
      const newDevice = await deviceAPI.createDevice(addDeviceForm);

      // Add to local state
      setDevices((prev) => [...prev, newDevice]);

      // Reset form dan close modal
      setAddDeviceForm({
        device_id: "",
        vehicle_name: "",
        number_plate: "",
        driver_name: "",
        contact_number: "",
      });
      setShowAddModal(false);

      alert("Device berhasil ditambahkan!");
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error("Error adding device:", err);
    } finally {
      setAddDeviceLoading(false);
    }
  };

  // Filter dan sort devices
  const filteredDevices = React.useMemo(() => {
    if (!Array.isArray(devices)) return [];

    let filtered = devices.filter((device) => {
      if (!device) return false;

      const matchesSearch =
        searchTerm === "" ||
        (device.vehicle_name &&
          device.vehicle_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (device.device_id &&
          device.device_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (device.number_plate &&
          device.number_plate.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (!a || !b) return 0;

      let aValue = a[sortBy] || "";
      let bValue = b[sortBy] || "";

      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [devices, searchTerm, sortBy, sortOrder]);

  // Paginasi
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDevices = filteredDevices.slice(startIndex, endIndex);

  // Reset ke halaman 1 ketika filter berubah
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // FIXED: Select All using vehicle.id
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDevices(currentDevices.map((device) => device.id));
    } else {
      setSelectedDevices([]);
    }
  };

  // FIXED: Select Device using vehicle.id
  const handleSelectDevice = (vehicleId) => {
    if (selectedDevices.includes(vehicleId)) {
      setSelectedDevices(selectedDevices.filter((id) => id !== vehicleId));
    } else {
      setSelectedDevices([...selectedDevices, vehicleId]);
    }
  };

  // Bulk Delete - FIXED: Use vehicle.id
  const handleBulkDelete = async () => {
    if (selectedDevices.length === 0) return;

    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus ${selectedDevices.length} perangkat yang dipilih?`
    );

    if (confirmDelete) {
      try {
        console.log('🗑️ Starting bulk delete for vehicle IDs:', selectedDevices);
        
        // Delete each device via API using vehicle.id
        await Promise.all(
          selectedDevices.map((vehicleId) => deviceAPI.deleteDevice(vehicleId))
        );

        // Remove from local state using vehicle.id
        setDevices(
          devices.filter(
            (device) => !selectedDevices.includes(device.id)
          )
        );
        setSelectedDevices([]);

        alert("Devices berhasil dihapus!");
      } catch (err) {
        console.error('❌ Bulk delete failed:', err);
        alert(`Error deleting devices: ${err.message}`);
      }
    }
  };

  // Navigasi paginasi
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div>
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
          <button
            onClick={loadDevices}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search dan Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-64">
            <input
              type="text"
              placeholder="Search devices..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");
                setSortBy(field);
                setSortOrder(order);
              }}
            >
              <option value="vehicle_name-asc">Vehicle Name A-Z</option>
              <option value="vehicle_name-desc">Vehicle Name Z-A</option>
              <option value="device_id-asc">Device ID A-Z</option>
              <option value="device_id-desc">Device ID Z-A</option>
            </select>
          </div>

          <div>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
            </select>
          </div>
        </div>

        <button
          className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
          onClick={() => setShowAddModal(true)}
          disabled={loading}
        >
          Add Device
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedDevices.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-blue-800 font-medium">
            {selectedDevices.length} item(s) selected:
          </span>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedDevices([])}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading devices...</p>
        </div>
      )}

      {/* Info */}
      {!loading && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredDevices.length)}{" "}
          of {filteredDevices.length} devices
          {filteredDevices.length !== devices.length &&
            ` (filtered from ${devices.length} total)`}
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={handleSelectAll}
                    checked={
                      selectedDevices.length === currentDevices.length &&
                      currentDevices.length > 0
                    }
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Device ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vehicle Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Number Plate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Driver Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact Number
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentDevices.map((device) => (
                <tr key={device.device_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => handleSelectDevice(device.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {device.device_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {device.vehicle_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {device.number_plate || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {device.driver_name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {device.contact_number || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {currentDevices.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              {devices.length === 0
                ? "No devices registered yet"
                : "No devices found matching your criteria"}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500">
                {selectedDevices.length} of {currentDevices.length} row(s)
                selected on this page
              </div>

              <div className="flex items-center space-x-2">
                <button
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  disabled={currentPage === 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  Previous
                </button>

                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        className={`px-3 py-1 text-sm rounded-md ${
                          page === currentPage
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  disabled={currentPage === totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Add New Device
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={addDeviceLoading}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddDeviceSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device ID *{" "}
                    <span className="text-xs text-gray-500">(ESP32 ID)</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ESP32_001"
                    value={addDeviceForm.device_id}
                    onChange={(e) =>
                      handleAddDeviceChange("device_id", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Mobil Satu"
                    value={addDeviceForm.vehicle_name}
                    onChange={(e) =>
                      handleAddDeviceChange("vehicle_name", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number Plate
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., B 1234 ABC"
                    value={addDeviceForm.number_plate}
                    onChange={(e) =>
                      handleAddDeviceChange("number_plate", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Driver name"
                    value={addDeviceForm.driver_name}
                    onChange={(e) =>
                      handleAddDeviceChange("driver_name", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone number"
                    value={addDeviceForm.contact_number}
                    onChange={(e) =>
                      handleAddDeviceChange("contact_number", e.target.value)
                    }
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={addDeviceLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={addDeviceLoading}
                  >
                    {addDeviceLoading ? "Adding..." : "Add Device"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;