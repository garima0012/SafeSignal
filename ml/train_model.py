"""
SafeSignal — ML Model
Trains a safety risk classifier using NCRB crime data.

Real dataset: https://ncrb.gov.in/en/crime-in-india-table-addtional-table-and-chapter-contents
Download: Crime in India > District-wise > CSV files

Features used:
- hour of day, day of week (time risk patterns)
- district crime rate (historical density)
- crime type weights (assault > theft for safety risk)
- population density of area
"""

import pandas as pd
import numpy as np
import joblib
import shap
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE


# ── Synthetic dataset generator (replace with real NCRB CSV) ──────────────────
def generate_ncrb_style_data(n=5000, seed=42):
    """
    Generates a realistic proxy dataset until you plug in real NCRB data.
    Real columns to expect in NCRB CSVs:
    state, district, year, crime_head, total_cases, victims_female
    """
    np.random.seed(seed)

    high_risk_districts = ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi']
    all_districts = high_risk_districts + [
        'Dwarka', 'Rohini', 'Saket', 'Janakpuri',
        'Vasant Kunj', 'Lajpat Nagar', 'Karol Bagh'
    ]

    hours = np.random.randint(0, 24, n)
    days  = np.random.randint(0, 7, n)   # 0=Mon ... 6=Sun
    districts = np.random.choice(all_districts, n)
    crime_rate = np.array([
        8.5 if d in high_risk_districts else np.random.uniform(2, 5)
        for d in districts
    ])
    pop_density = np.random.uniform(1000, 50000, n)  # per sq km
    lighting    = np.random.randint(0, 2, n)          # 0=dark, 1=lit
    crowd_level = np.random.randint(0, 3, n)          # 0=empty,1=moderate,2=crowded

    # Risk logic: late night + high crime area + dark = high risk
    night_factor  = ((hours >= 21) | (hours <= 5)).astype(float) * 0.35
    crime_factor  = (crime_rate / 10) * 0.30
    dark_factor   = (1 - lighting) * 0.20
    crowd_factor  = (crowd_level == 0).astype(float) * 0.15

    raw_risk = night_factor + crime_factor + dark_factor + crowd_factor
    raw_risk += np.random.normal(0, 0.05, n)
    risk_label = np.where(raw_risk > 0.5, 2,     # High
                 np.where(raw_risk > 0.3, 1, 0)) # Medium / Low

    le = LabelEncoder()
    district_enc = le.fit_transform(districts)

    df = pd.DataFrame({
        'hour':          hours,
        'day_of_week':   days,
        'district_enc':  district_enc,
        'crime_rate':    crime_rate,
        'pop_density':   pop_density,
        'lighting':      lighting,
        'crowd_level':   crowd_level,
        'risk_level':    risk_label        # 0=Low, 1=Medium, 2=High
    })
    return df, le


def train(df: pd.DataFrame):
    X = df.drop(columns=['risk_level'])
    y = df['risk_level']

    # SMOTE for class balance
    sm = SMOTE(random_state=42)
    X_res, y_res = sm.fit_resample(X, y)

    X_train, X_test, y_train, y_test = train_test_split(
        X_res, y_res, test_size=0.2, random_state=42, stratify=y_res
    )

    model = XGBClassifier(
        n_estimators=200, learning_rate=0.05,
        max_depth=6, eval_metric='mlogloss',
        random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred,
          target_names=['Low Risk', 'Medium Risk', 'High Risk']))

    return model, X_train, X_test, X.columns.tolist()


def generate_shap(model, X_test, feature_names):
    print("\nGenerating SHAP values...")
    explainer  = shap.TreeExplainer(model)
    shap_vals  = explainer.shap_values(X_test)

    plt.figure(figsize=(8, 5))
    shap.summary_plot(
        shap_vals, X_test,
        feature_names=feature_names,
        class_names=['Low', 'Medium', 'High'],
        show=False
    )
    plt.title("What Drives Safety Risk? (SHAP)")
    plt.tight_layout()
    plt.savefig('../ml/shap_summary.png', dpi=150, bbox_inches='tight')
    print("Saved: shap_summary.png")


if __name__ == '__main__':
    print("Generating dataset...")
    df, district_encoder = generate_ncrb_style_data(n=8000)

    print("Training model...")
    model, X_train, X_test, feat_names = train(df)

    generate_shap(model, X_test, feat_names)

    joblib.dump({'model': model, 'features': feat_names,
                 'district_encoder': district_encoder}, 'safesignal_model.pkl')
    print("\n✅ Model saved: safesignal_model.pkl")
    print("Next step: run the backend with 'uvicorn main:app --reload'")
