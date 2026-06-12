"""
SafeSignal — FastAPI Backend
Serves risk predictions + handles SOS alerts.

Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import joblib
import numpy as np
import smtplib
from email.mime.text import MIMEText
import os

app = FastAPI(title="SafeSignal API", version="1.0.0")

# Allow React frontend on localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-deployed-frontend.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model on startup ─────────────────────────────────────────────────────
try:
    bundle = joblib.load('../ml/safesignal_model.pkl')
    model  = bundle['model']
    district_encoder = bundle['district_encoder']
    print("✅ Model loaded")
except FileNotFoundError:
    print("⚠️  Model not found — run ml/train_model.py first")
    model = None


# ── Request / Response schemas ────────────────────────────────────────────────
class RiskRequest(BaseModel):
    latitude:    float
    longitude:   float
    district:    str
    hour:        int   # 0–23 (auto-filled from frontend)
    day_of_week: int   # 0=Mon, 6=Sun
    lighting:    int   # 0=dark, 1=lit (user reports)
    crowd_level: int   # 0=empty, 1=moderate, 2=crowded


class SOSRequest(BaseModel):
    name:          str
    location:      str
    latitude:      float
    longitude:     float
    contact_email: str


class RiskResponse(BaseModel):
    risk_level:   str    # "Low" | "Medium" | "High"
    risk_score:   float  # 0.0 – 1.0
    risk_label:   int    # 0 | 1 | 2
    top_factors:  list   # What's driving the risk
    safe_zones:   list   # Nearest suggested safe places


# ── Static crime rate map (replace with live NCRB data) ──────────────────────
DISTRICT_CRIME_RATES = {
    'New Delhi':    8.5, 'North Delhi': 7.9, 'South Delhi': 7.2,
    'East Delhi':   7.5, 'Dwarka':      4.1, 'Rohini':      4.8,
    'Saket':        3.9, 'Janakpuri':   4.2, 'Vasant Kunj': 3.5,
    'Lajpat Nagar': 5.1, 'Karol Bagh':  6.0,
}

SAFE_ZONES = {
    'New Delhi':    ['Connaught Place Metro', 'IGI Airport T3', 'Safdarjung Hospital'],
    'South Delhi':  ['Select City Walk Mall', 'AIIMS Metro', 'Saket Metro'],
    'North Delhi':  ['Civil Lines Metro', 'Tis Hazari Court', 'GTB Nagar Metro'],
    'default':      ['Nearest Metro Station', 'Nearest Police Station', 'Nearest Hospital']
}

FACTOR_LABELS = {
    'hour':         'Late night hours (high risk window)',
    'crime_rate':   'High historical crime rate in this area',
    'lighting':     'Poor lighting reported',
    'crowd_level':  'Low crowd density (isolated area)',
}


@app.get("/")
def root():
    return {"message": "SafeSignal API — Women Safety Risk Predictor", "status": "running"}


@app.post("/predict", response_model=RiskResponse)
def predict_risk(req: RiskRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded. Train model first.")

    crime_rate = DISTRICT_CRIME_RATES.get(req.district, 5.0)
    pop_density = 15000.0  # Default; can be enhanced with census API

    try:
        district_enc = district_encoder.transform([req.district])[0]
    except ValueError:
        district_enc = 0  # Unknown district fallback

    features = np.array([[
        req.hour, req.day_of_week, district_enc,
        crime_rate, pop_density, req.lighting, req.crowd_level
    ]])

    proba       = model.predict_proba(features)[0]
    risk_label  = int(np.argmax(proba))
    risk_score  = float(proba[2])  # Probability of High risk

    risk_map = {0: "Low", 1: "Medium", 2: "High"}

    # Identify top risk factors
    top_factors = []
    if req.hour >= 21 or req.hour <= 5:
        top_factors.append(FACTOR_LABELS['hour'])
    if crime_rate > 6:
        top_factors.append(FACTOR_LABELS['crime_rate'])
    if req.lighting == 0:
        top_factors.append(FACTOR_LABELS['lighting'])
    if req.crowd_level == 0:
        top_factors.append(FACTOR_LABELS['crowd_level'])
    if not top_factors:
        top_factors.append("No major risk factors detected at this time")

    safe_zones = SAFE_ZONES.get(req.district, SAFE_ZONES['default'])

    return RiskResponse(
        risk_level=risk_map[risk_label],
        risk_score=round(risk_score, 3),
        risk_label=risk_label,
        top_factors=top_factors,
        safe_zones=safe_zones
    )


@app.post("/sos")
def trigger_sos(req: SOSRequest):
    """
    SOS alert — sends email to emergency contact.
    For production: integrate Twilio SMS for instant alerts.
    """
    maps_link = f"https://maps.google.com/?q={req.latitude},{req.longitude}"
    message   = f"""
🚨 EMERGENCY SOS ALERT from SafeSignal

{req.name} has triggered an SOS alert.

📍 Location: {req.location}
🗺️  Live Map: {maps_link}
🕐 Time: {datetime.now().strftime('%d %b %Y, %I:%M %p')}

Please check on them immediately or call emergency services: 112
    """

    # Email sending (configure SMTP for production)
    try:
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_pass = os.getenv("SMTP_PASS", "")
        if smtp_user and smtp_pass:
            msg            = MIMEText(message)
            msg['Subject'] = f"🚨 SOS from {req.name} — SafeSignal"
            msg['From']    = smtp_user
            msg['To']      = req.contact_email
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            return {"status": "SOS sent", "recipient": req.contact_email}
        else:
            # Demo mode — log the alert
            print(f"[SOS DEMO] {message}")
            return {"status": "SOS logged (configure SMTP to enable real emails)",
                    "maps_link": maps_link}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SOS failed: {str(e)}")


@app.get("/crime-stats/{district}")
def get_crime_stats(district: str):
    """Returns historical crime stats for a district."""
    rate = DISTRICT_CRIME_RATES.get(district)
    if not rate:
        raise HTTPException(status_code=404, detail=f"District '{district}' not found")
    return {
        "district":   district,
        "crime_rate": rate,
        "risk_tier":  "High" if rate > 7 else "Medium" if rate > 4 else "Low",
        "data_source": "NCRB Crime in India Report 2022"
    }
