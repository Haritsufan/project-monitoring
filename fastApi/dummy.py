import json
import time
import random
import paho.mqtt.client as mqtt

# Konfigurasi broker MQTT
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "esp32/tracker/data"

# Inisialisasi client MQTT
client = mqtt.Client()
client.connect(MQTT_BROKER, MQTT_PORT, 60)

# List ID perangkat dan posisi awal (lat, lon)
device_states = {
    "TRACKER_1F8A3C": {
        "lat": -7.941610,
        "lon": 112.61430,  # Fixed koordinat (sebelumnya 130.61430)
        "accident_mode": False,
        "accident_countdown": 0
    },
    "TRACKER_7B2D5E": {
        "lat": -7.941100,
        "lon": 112.61100,
        "accident_mode": False,
        "accident_countdown": 0
    }
}

# Counter untuk trigger accident secara otomatis
message_counter = 0

def generate_normal_data(device_id):
    """Generate data normal driving"""
    state = device_states[device_id]
    
    # Gerakkan posisi sedikit (±0.00001 ~ ±1 meter)
    delta_lat = random.uniform(-0.00001, 0.00001)
    delta_lon = random.uniform(-0.00001, 0.00001)
    
    state["lat"] += delta_lat
    state["lon"] += delta_lon
    
    return {
        "device": device_id,
        "timestamp": int(time.time()),
        "count": random.randint(0, 100),
        "lat": round(state["lat"], 6),
        "lon": round(state["lon"], 6),
        "speed": round(random.uniform(30, 80), 2),  # Normal speed
        
        # Normal accelerometer values (in g-force)
        "ax": round(random.uniform(-1.0, 1.0), 2),
        "ay": round(random.uniform(-1.0, 1.0), 2), 
        "az": round(random.uniform(8.8, 10.2), 2),  # ~9.8 + small variations
        
        # Normal gyroscope values (degrees/sec)
        "gx": round(random.uniform(-10, 10), 1),
        "gy": round(random.uniform(-10, 10), 1),
        "gz": round(random.uniform(-10, 10), 1),
        
        "pitch": round(random.uniform(-5, 5), 1),    # Small pitch changes
        "roll": round(random.uniform(-5, 5), 1),     # Small roll changes
        "moving": True,
        "total_g": round(random.uniform(9.5, 10.5), 2),  # Normal total G-force
    }

def generate_accident_data(device_id):
    """Generate data saat accident (high G-force impact)"""
    state = device_states[device_id]
    
    return {
        "device": device_id,
        "timestamp": int(time.time()),
        "count": random.randint(0, 100),
        "lat": round(state["lat"], 6),
        "lon": round(state["lon"], 6),
        "speed": round(random.uniform(0, 20), 2),  # Speed drops after accident
        
        # HIGH IMPACT VALUES for accident detection
        "ax": round(random.uniform(-25.0, 25.0), 2),  # High lateral acceleration
        "ay": round(random.uniform(-25.0, 25.0), 2),  # High longitudinal acceleration
        "az": round(random.uniform(15.0, 30.0), 2),   # High vertical acceleration
        
        # High gyroscope values (spinning/rotating)
        "gx": round(random.uniform(-500, 500), 1),
        "gy": round(random.uniform(-500, 500), 1),
        "gz": round(random.uniform(-500, 500), 1),
        
        "pitch": round(random.uniform(-45, 45), 1),   # Large pitch changes
        "roll": round(random.uniform(-45, 45), 1),    # Large roll changes
        "moving": False,  # Vehicle stops after accident
        "total_g": round(random.uniform(20.0, 35.0), 2),  # HIGH total G-force (accident indicator)
    }

def generate_post_accident_data(device_id):
    """Generate data setelah accident (vehicle stopped)"""
    state = device_states[device_id]
    
    return {
        "device": device_id,
        "timestamp": int(time.time()),
        "count": random.randint(0, 100),
        "lat": round(state["lat"], 6),  # Position doesn't change much
        "lon": round(state["lon"], 6),
        "speed": 0,  # Vehicle stopped
        
        # Low values after accident
        "ax": round(random.uniform(-0.5, 0.5), 2),
        "ay": round(random.uniform(-0.5, 0.5), 2),
        "az": round(random.uniform(9.0, 10.0), 2),  # Back to normal gravity
        
        "gx": round(random.uniform(-5, 5), 1),
        "gy": round(random.uniform(-5, 5), 1),
        "gz": round(random.uniform(-5, 5), 1),
        
        "pitch": round(random.uniform(-2, 2), 1),
        "roll": round(random.uniform(-2, 2), 1),
        "moving": False,
        "total_g": round(random.uniform(9.5, 10.2), 2),  # Back to normal
    }

def simulate_accident_scenario(device_id):
    """Simulate accident scenario untuk device tertentu"""
    state = device_states[device_id]
    
    if not state["accident_mode"]:
        # Start accident mode
        state["accident_mode"] = True
        state["accident_countdown"] = 3  # 3 messages of accident data
        print(f"🚨 SIMULATING ACCIDENT for {device_id}!")
        return generate_accident_data(device_id)
    
    elif state["accident_countdown"] > 0:
        # Continue accident data
        state["accident_countdown"] -= 1
        print(f"🚨 ACCIDENT DATA #{3 - state['accident_countdown']} for {device_id}")
        return generate_accident_data(device_id)
    
    else:
        # Post-accident phase (vehicle stopped)
        print(f"🛑 POST-ACCIDENT: {device_id} stopped")
        return generate_post_accident_data(device_id)

# Fungsi untuk membuat data dummy
def generate_dummy_data(device_id):
    global message_counter
    state = device_states[device_id]
    
    # Auto-trigger accident setiap 50 messages untuk testing
    if message_counter > 0 and message_counter % 50 == 0:
        if not any(s["accident_mode"] for s in device_states.values()):
            # Trigger accident pada device pertama yang tidak dalam accident mode
            print(f"\n{'='*50}")
            print(f"🚨 AUTO-TRIGGERING ACCIDENT TEST #{message_counter // 50}")
            print(f"{'='*50}\n")
            return simulate_accident_scenario(device_id)
    
    # Manual accident trigger - uncomment untuk test manual
    # if device_id == "TRACKER_1F8A3C" and message_counter == 10:
    #     return simulate_accident_scenario(device_id)
    
    # Check if device in accident mode
    if state["accident_mode"]:
        return simulate_accident_scenario(device_id)
    
    # Normal driving data
    return generate_normal_data(device_id)

# Kirim data secara bergantian untuk masing-masing device
try:
    print("🚗 Starting MQTT Vehicle Simulator...")
    print("📊 Normal driving data will be sent...")
    print("🚨 Accident will be auto-triggered every 50 messages for testing")
    print("⏹️  Press Ctrl+C to stop\n")
    
    while True:
        for device_id in device_states.keys():
            payload = generate_dummy_data(device_id)
            client.publish(MQTT_TOPIC, json.dumps(payload))
            
            # Color coding untuk output
            if payload["total_g"] > 15:
                status = "🚨 ACCIDENT"
            elif payload["moving"]:
                status = "🚗 DRIVING"
            else:
                status = "🛑 STOPPED"
            
            print(f"📡 {status} | {device_id} | Speed: {payload['speed']} km/h | G-Force: {payload['total_g']}g")
            
            message_counter += 1
            time.sleep(2)  # Slower untuk easier monitoring
            
except KeyboardInterrupt:
    print("\n🛑 Simulator stopped.")
    client.disconnect()