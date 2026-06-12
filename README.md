# 🛡️ SafeSignal — Women Safety Risk Predictor

> *"I'm from Delhi. I hear these news stories every day. I built something instead of just watching."*

SafeSignal predicts real-time safety risk for women in Delhi using NCRB crime data and machine learning — giving actionable warnings **before** danger, not police reports after.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Click%20Here-purple)](https://safesignal.netlify.app)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB)](https://react.dev)
[![Model](https://img.shields.io/badge/Model-XGBoost%20%2B%20SHAP-orange)](https://xgboost.readthedocs.io)

---

## 🎯 The Problem

India records **4 lakh+ crimes against women every year.** Most happen at predictable times and locations. Yet there is no tool that warns a woman *before* she walks into a dangerous situation.

SafeSignal changes that.

---

## ✨ Features

- **Real-time risk score** — Low / Medium / High based on location, time, lighting, crowd level
- **SHAP explainability** — tells you *exactly why* an area is flagged as risky
- **Nearest safe zones** — metro stations, hospitals, police stations
- **SOS alert** — one tap sends your location to an emergency contact via email
- **NCRB-backed data** — trained on National Crime Records Bureau government data

---

## 🏗️ Architecture

```
safesignal/
│
├── ml/
│   └── train_model.py      # XGBoost + SHAP, trained on NCRB data
│
├── backend/
│   ├── main.py             # FastAPI — serves predictions + SOS alerts
│   └── requirements.txt
│
└── frontend/
    └── src/
        └── App.jsx         # React — map, risk display, SOS button
```

**Full Stack Flow:**
```
User inputs location + conditions
        ↓
React frontend → POST /predict → FastAPI backend
        ↓
XGBoost model → risk score + SHAP factors
        ↓
React displays risk level + safe zones
        ↓
SOS button → POST /sos → Email alert to emergency contact
```

---

## 🤖 ML Model

| | |
|---|---|
| **Dataset** | NCRB Crime in India (district-wise, 2019–2022) |
| **Features** | Hour, day, district crime rate, lighting, crowd density |
| **Algorithm** | XGBoost (best AUC-ROC vs RF and Logistic Regression) |
| **Imbalance** | Handled with SMOTE |
| **Explainability** | SHAP — shows which features drove each prediction |
| **AUC-ROC** | 0.91 |

### Why SHAP?
A black-box risk score is useless. SHAP tells a user: *"Your area is flagged High because it's 11pm (biggest factor), the district has a high crime rate, and you reported poor lighting."* That's actionable.

---

## 🚀 Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
cd ../ml && python train_model.py   # Train model first
cd ../backend && uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start
# Opens at localhost:3000
```

### API Docs
Once backend is running: http://localhost:8000/docs

---

## 📊 Data Source

**National Crime Records Bureau (NCRB)**
- Website: https://ncrb.gov.in
- Report: Crime in India 2022 — Table 1A (State/District-wise crimes against women)
- This is government of India data, publicly available, used in policy research

---

## 🌍 Real-World Impact

This is not a hackathon toy. This is a proof-of-concept for what a city safety system could look like:

1. A woman opens SafeSignal before walking home at night
2. She inputs her area — the model flags High risk based on time + location history
3. She sees the nearest metro station and a safe walking route
4. If she feels unsafe, one tap sends her exact location to a trusted contact

With integration into Google Maps or phone OS, this could run passively in the background.

---

## 👩‍💻 Author

**Garima Pathania** — Data Science Enthusiast, Delhi  
garima.pathania12@gmail.com | [LinkedIn](#) | [LeetCode](https://leetcode.com/garima0012)

*Interning at KPMG · B.Tech CSE, Jaypee University of Information Technology*
