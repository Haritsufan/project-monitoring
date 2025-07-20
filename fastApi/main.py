# main.py - COMPLETE dengan Manual Cascade Delete Fixed
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, schemas
from fastapi.middleware.cors import CORSMiddleware

import json
import paho.mqtt.client as mqtt
import threading
from datetime import datetime, timedelta
from typing import List
import joblib
import numpy as np

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS - Allow all for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Allow ALL origins for development
    allow_credentials=True,
    allow_methods=["*"],        # Allow ALL methods
    allow_headers=["*"],        # Allow ALL headers
)

MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "esp32/tracker/data"

# ============================
# ML MODEL LOADING
# ============================

try:
    crash_model = joblib.load("crashmodel.pkl")
    print("[ML] ✅ Crash detection model loaded successfully")
    print(f"[ML] Model type: {type(crash_model)}")
    has_proba = hasattr(crash_model, 'predict_proba')
    print(f"[ML] Probability support: {has_proba}")
    
    if hasattr(crash_model, 'n_features_in_'):
        print(f"[ML] Expected features: {crash_model.n_features_in_}")
    
except Exception as e:
    print(f"[ML] ❌ Failed to load crash model: {e}")
    crash_model = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================
# ACCIDENT DETECTION FUNCTIONS
# ============================

def extract_features_for_crash_detection(payload_data):
    """Extract 6 features for KNN crash detection model"""
    try:
        features = [
            float(payload_data.ax),      # Ax
            float(payload_data.ay),      # Ay  
            float(payload_data.az),      # Az
            float(payload_data.gx),      # Gx
            float(payload_data.gy),      # Gy
            float(payload_data.gz)       # Gz
        ]
        
        print(f"[ML] Extracted 6 features for {payload_data.device}: {features}")
        return np.array(features).reshape(1, -1)
        
    except Exception as e:
        print(f"[ML] Error extracting features: {e}")
        return None

def detect_accident(payload_data):
    """Detect accident using KNN model with 6 features"""
    if crash_model is None:
        return False, 0.0, "Model not loaded"
    
    try:
        features = extract_features_for_crash_detection(payload_data)
        if features is None:
            return False, 0.0, "Feature extraction failed"
        
        print(f"[ML] Features shape: {features.shape} for {payload_data.device}")
        
        prediction = crash_model.predict(features)[0]
        is_accident = prediction == 1
        
        if hasattr(crash_model, 'predict_proba'):
            proba = crash_model.predict_proba(features)[0]
            confidence = proba[1]
        else:
            confidence = 1.0 if is_accident else 0.0
        
        if is_accident:
            print(f"[ML] 🚨 ACCIDENT DETECTED for {payload_data.device}!")
            print(f"[ML] Confidence: {confidence:.2%}")
        else:
            print(f"[ML] ✅ Normal driving for {payload_data.device} (confidence: {(1-confidence):.2%})")
        
        return is_accident, confidence, "Success"
        
    except Exception as e:
        print(f"[ML] ❌ Error in accident detection: {e}")
        return False, 0.0, f"Error: {str(e)}"

def create_accident_alert(db: Session, device_id: str, payload_data, confidence: float):
    """Create accident alert in database"""
    try:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.device_id == device_id).first()
        if not vehicle:
            return None
            
        if confidence >= 0.9:
            severity = "critical"
        elif confidence >= 0.8:
            severity = "high" 
        elif confidence >= 0.7:
            severity = "medium"
        else:
            severity = "low"
            
        alert = models.Alert(
            device_id=device_id,
            alert_type="accident",
            severity=severity,
            message=f"Accident detected for {vehicle.vehicle_name} with {confidence:.1%} confidence",
            lat=payload_data.lat,
            lon=payload_data.lon,
            sensor_data=json.dumps({
                'ax': payload_data.ax,
                'ay': payload_data.ay,
                'az': payload_data.az,
                'gx': payload_data.gx,
                'gy': payload_data.gy,
                'gz': payload_data.gz,
                'total_g': payload_data.total_g,
                'confidence': confidence
            }),
            is_active=True
        )
        
        db.add(alert)
        db.commit()
        db.refresh(alert)
        
        print(f"[ALERT] ✅ Accident alert created for {device_id} with {severity} severity")
        return alert
        
    except Exception as e:
        print(f"[ALERT] ❌ Error creating accident alert: {e}")
        db.rollback()
        return None

# ============================
# MQTT HANDLER
# ============================

def on_connect(client, userdata, flags, rc, properties=None):
    print("[MQTT] Connected with result code", rc)
    client.subscribe(MQTT_TOPIC)
    print(f"[MQTT] Subscribed to {MQTT_TOPIC}")

def on_message(client, userdata, msg):
    try:
        payload_raw = msg.payload.decode()
        data = json.loads(payload_raw)
        schema = schemas.MotionPayload(**data)
    except Exception as e:
        print("[MQTT] Invalid payload:", e, payload_raw)
        return

    db: Session = SessionLocal()
    try:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.device_id == schema.device).first()
        if not vehicle:
            print(f"[MQTT] Device {schema.device} not registered - ignored.")
            return

        now = datetime.utcnow()

        # Accident detection
        is_accident, confidence, status = detect_accident(schema)
        
        if is_accident:
            recent_alert = db.query(models.Alert).filter(
                models.Alert.device_id == schema.device,
                models.Alert.alert_type == "accident",
                models.Alert.is_active == True,
                models.Alert.created_at >= now - timedelta(minutes=2)
            ).first()
            
            if not recent_alert:
                create_accident_alert(db, schema.device, schema, confidence)

        # Update payload data
        existing = db.query(models.Payload).filter(models.Payload.device_id == schema.device).first()

        if existing:
            time_diff = now - existing.updated_at
            if time_diff.total_seconds() < 10:
                print(f"[MQTT] {schema.device} | Update skipped (<10s)")
                return

            existing.timestamp = schema.timestamp
            existing.count = schema.count
            existing.lat = schema.lat
            existing.lon = schema.lon
            existing.speed = schema.speed
            existing.ax = schema.ax
            existing.ay = schema.ay
            existing.az = schema.az
            existing.gx = schema.gx
            existing.gy = schema.gy
            existing.gz = schema.gz
            existing.pitch = schema.pitch
            existing.roll = schema.roll
            existing.moving = schema.moving
            existing.total_g = schema.total_g
            existing.updated_at = now
            db.commit()
        else:
            new_payload = models.Payload(
                device_id=schema.device,
                timestamp=schema.timestamp,
                count=schema.count,
                lat=schema.lat,
                lon=schema.lon,
                speed=schema.speed,
                ax=schema.ax,
                ay=schema.ay,
                az=schema.az,
                gx=schema.gx,
                gy=schema.gy,
                gz=schema.gz,
                pitch=schema.pitch,
                roll=schema.roll,
                moving=schema.moving,
                total_g=schema.total_g,
                updated_at=now
            )
            db.add(new_payload)
            db.commit()
        print(f"[MQTT] Data updated for {schema.device}")
    except Exception as e:
        print(f"[MQTT] Database error for {schema.device}: {e}")
    finally:
        db.close()

def mqtt_worker():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_forever()

@app.on_event("startup")
def start_mqtt():
    thread = threading.Thread(target=mqtt_worker, daemon=True)
    thread.start()
    print("[MQTT] Worker thread started")

# ============================
# VEHICLE ENDPOINTS
# ============================

@app.get("/vehicles", response_model=List[schemas.VehicleResponse])
def get_vehicles(db: Session = Depends(get_db)):
    return db.query(models.Vehicle).all()

@app.get("/vehicles/{vehicle_id}", response_model=schemas.VehicleResponse)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@app.post("/vehicles", response_model=schemas.VehicleResponse)
def create_vehicle(vehicle: schemas.VehicleCreate, db: Session = Depends(get_db)):
    new_vehicle = models.Vehicle(**vehicle.dict())
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    return new_vehicle

@app.put("/vehicles/{vehicle_id}", response_model=schemas.VehicleResponse)
def update_vehicle(vehicle_id: int, updated: schemas.VehicleUpdate, db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    for field, value in updated.dict().items():
        setattr(vehicle, field, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle

@app.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """
    Delete vehicle with manual cascade delete for related data
    FIXED: Handle foreign key constraints by deleting related data first
    """
    print(f"[DELETE] 🗑️ Starting delete process for vehicle ID: {vehicle_id}")
    
    
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        print(f"[DELETE] ❌ Vehicle with ID {vehicle_id} not found")
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    print(f"[DELETE] ✅ Found vehicle: {vehicle.vehicle_name} ({vehicle.device_id})")
    
    try:
        
        payload_count = db.query(models.Payload).filter(models.Payload.device_id == vehicle.device_id).count()
        print(f"[DELETE] 📊 Found {payload_count} payload records to delete")
        
        if payload_count > 0:
            deleted_payload = db.query(models.Payload).filter(models.Payload.device_id == vehicle.device_id).delete(synchronize_session=False)
            print(f"[DELETE] ✅ Deleted {deleted_payload} payload records")
        
        # Step 3: Delete all alerts for this device_id
        alert_count = db.query(models.Alert).filter(models.Alert.device_id == vehicle.device_id).count()
        print(f"[DELETE] 🚨 Found {alert_count} alert records to delete")
        
        if alert_count > 0:
            deleted_alerts = db.query(models.Alert).filter(models.Alert.device_id == vehicle.device_id).delete(synchronize_session=False)
            print(f"[DELETE] ✅ Deleted {deleted_alerts} alert records")
        
        # Step 4: Now delete the vehicle (safe because no more related data)
        db.delete(vehicle)
        
        # Step 5: Commit all changes
        db.commit()
        
        print(f"[DELETE] ✅ Vehicle {vehicle_id} and all related data deleted successfully")
        print(f"[DELETE] 📊 Summary: Vehicle + {payload_count} payloads + {alert_count} alerts deleted")
        
        return {
            "detail": "Vehicle and all related data deleted successfully",
            "deleted_vehicle": vehicle.vehicle_name,
            "deleted_payload_count": payload_count,
            "deleted_alert_count": alert_count
        }
        
    except Exception as e:
        print(f"[DELETE] ❌ Error during delete process: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting vehicle: {str(e)}")

# ============================
# ALERT ENDPOINTS
# ============================

@app.get("/alerts")
def get_alerts(active_only: bool = False, db: Session = Depends(get_db)):
    """Get alerts, optionally filter active only"""
    query = db.query(models.Alert)
    
    if active_only:
        query = query.filter(models.Alert.is_active == True)
    
    alerts = query.order_by(models.Alert.created_at.desc()).all()
    
    result = []
    for alert in alerts:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.device_id == alert.device_id).first()
        result.append({
            "id": alert.id,
            "deviceId": alert.device_id,
            "vehicleName": vehicle.vehicle_name if vehicle else "Unknown",
            "numberPlate": vehicle.number_plate if vehicle else "Unknown",
            "alertType": alert.alert_type,
            "severity": alert.severity,
            "message": alert.message,
            "lat": alert.lat,
            "lon": alert.lon,
            "isActive": alert.is_active,
            "createdAt": alert.created_at.isoformat(),
            "sensorData": json.loads(alert.sensor_data) if alert.sensor_data else None
        })
    
    return result

@app.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    """Mark alert as resolved"""
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_active = False
    alert.resolved_at = datetime.utcnow()
    db.commit()
    
    return {"detail": "Alert resolved successfully"}

@app.get("/alerts/stats")
def get_alert_stats(db: Session = Depends(get_db)):
    """Get alert statistics"""
    total_alerts = db.query(models.Alert).count()
    active_alerts = db.query(models.Alert).filter(models.Alert.is_active == True).count()
    accident_alerts = db.query(models.Alert).filter(models.Alert.alert_type == "accident").count()
    
    return {
        "totalAlerts": total_alerts,
        "activeAlerts": active_alerts,
        "accidentAlerts": accident_alerts
    }

# ============================
# MAP / DASHBOARD ENDPOINT
# ============================

@app.get("/dashboard/map")
def get_vehicle_locations(db: Session = Depends(get_db)):
    vehicles = db.query(models.Vehicle).all()
    response = []

    for v in vehicles:
        latest_payload = (
            db.query(models.Payload)
            .filter(models.Payload.device_id == v.device_id)
            .order_by(models.Payload.updated_at.desc())
            .first()
        )

        if latest_payload and latest_payload.lat is not None and latest_payload.lon is not None:
            response.append({
                "id": v.id,
                "deviceId": v.device_id,
                "name": v.vehicle_name,
                "numberPlate": v.number_plate,
                "speed": round(latest_payload.speed, 1) if latest_payload.speed is not None else 0,
                "lat": latest_payload.lat,
                "lon": latest_payload.lon
            })

    return response