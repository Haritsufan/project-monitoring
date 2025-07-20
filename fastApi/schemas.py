# schemas.py - Updated dengan Alert schemas
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class VehicleBase(BaseModel):
    device_id: str
    vehicle_name: str
    number_plate: str
    driver_name: str
    contact_number: str

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: int

    class Config:
        from_attributes = True

class DeleteResponse(BaseModel):
    detail: str

# MotionPayload payload ESP32
class MotionPayload(BaseModel):
    device: str
    timestamp: int
    count: int
    lat: float
    lon: float
    speed: float
    ax: float
    ay: float
    az: float
    gx: float
    gy: float
    gz: float
    pitch: float
    roll: float
    moving: bool
    total_g: float

# Alert Schemas
class AlertBase(BaseModel):
    device_id: str
    alert_type: str
    severity: str
    message: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    sensor_data: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    is_active: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AlertWithVehicle(BaseModel):
    id: int
    deviceId: str
    vehicleName: str
    numberPlate: str
    alertType: str
    severity: str
    message: str
    lat: Optional[float]
    lon: Optional[float]
    isActive: bool
    createdAt: str
    sensorData: Optional[Dict[str, Any]]