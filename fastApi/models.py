# models.py - Updated dengan Alert model
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from database import Base
from datetime import datetime

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, nullable=False)
    vehicle_name = Column(String(100), nullable=False)
    number_plate = Column(String(20), nullable=False)
    driver_name = Column(String(100), nullable=False)
    contact_number = Column(String(20), nullable=False)

    # Relasi ke Payload dan Alert
    payloads = relationship("Payload", back_populates="vehicle")
    alerts = relationship("Alert", back_populates="vehicle")


class Payload(Base):
    __tablename__ = "payload"

    id = Column(Integer, primary_key=True, index=True)
    
    # FK ke device_id di tabel vehicles
    device_id = Column(String(100), ForeignKey("vehicles.device_id"), nullable=False)

    timestamp = Column(Integer, nullable=False)
    count = Column(Integer)
    lat = Column(Float)
    lon = Column(Float)
    speed = Column(Float)
    ax = Column(Float)
    ay = Column(Float)
    az = Column(Float)
    gx = Column(Float)
    gy = Column(Float)
    gz = Column(Float)
    pitch = Column(Float)
    roll = Column(Float)
    moving = Column(Boolean)
    total_g = Column(Float)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relasi balik ke Vehicle
    vehicle = relationship("Vehicle", back_populates="payloads")


class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), ForeignKey("vehicles.device_id"), nullable=False)
    alert_type = Column(String(50), nullable=False)  # 'accident', 'speeding', 'harsh_braking'
    severity = Column(String(20), nullable=False)    # 'low', 'medium', 'high', 'critical'
    message = Column(String(500), nullable=False)
    lat = Column(Float)
    lon = Column(Float)
    sensor_data = Column(String(1000))  # JSON string untuk data sensor
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relasi ke Vehicle
    vehicle = relationship("Vehicle", back_populates="alerts")