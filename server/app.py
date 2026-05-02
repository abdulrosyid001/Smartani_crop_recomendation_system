from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
MODEL_PATH = os.path.join(MODEL_DIR, "lgbm_model.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.joblib")
ENCODER_PATH = os.path.join(MODEL_DIR, "crop_encoder.joblib")

FEATURE_COLUMNS = [
    "Temperature",
    "Humidity",
    "Rainfall",
    "PH",
    "Nitrogen",
    "Phosphorous",
    "Potassium",
    "Carbon",
    "Acidic_Soil",
    "Alkaline_Soil",
    "Loamy_Soil",
    "Neutral_Soil",
    "Peaty_Soil",
]

SOIL_TYPE_MAP = {
    "acidic": "Acidic_Soil",
    "alkaline": "Alkaline_Soil",
    "loamy": "Loamy_Soil",
    "neutral": "Neutral_Soil",
    "peaty": "Peaty_Soil",
}

app = FastAPI(title="Smartani Crop Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
scaler = None
label_encoder = None


class PredictionRequest(BaseModel):
    temperature: float
    humidity: float
    rainfall: float
    ph: float
    nitrogen: float
    phosphorous: float
    potassium: float
    carbon: float
    soilType: str


@app.on_event("startup")
def load_artifacts() -> None:
    global model, scaler, label_encoder
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError("Model file not found. Run notebook to save model.")
    if not os.path.exists(SCALER_PATH):
        raise RuntimeError("Scaler file not found. Run notebook to save scaler.")
    if not os.path.exists(ENCODER_PATH):
        raise RuntimeError("Encoder file not found. Run notebook to save encoder.")

    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    label_encoder = joblib.load(ENCODER_PATH)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/predict")
def predict(payload: PredictionRequest) -> dict:
    if model is None or scaler is None or label_encoder is None:
        raise HTTPException(status_code=500, detail="Model is not loaded")

    soil_key = payload.soilType.strip().lower()
    if soil_key not in SOIL_TYPE_MAP:
        raise HTTPException(status_code=400, detail="Invalid soilType")

    one_hot = {key: 0 for key in SOIL_TYPE_MAP.values()}
    one_hot[SOIL_TYPE_MAP[soil_key]] = 1

    values = [
        payload.temperature,
        payload.humidity,
        payload.rainfall,
        payload.ph,
        payload.nitrogen,
        payload.phosphorous,
        payload.potassium,
        payload.carbon,
        one_hot["Acidic_Soil"],
        one_hot["Alkaline_Soil"],
        one_hot["Loamy_Soil"],
        one_hot["Neutral_Soil"],
        one_hot["Peaty_Soil"],
    ]

    data = np.array([values], dtype=float)
    data_scaled = scaler.transform(data)
    prediction = model.predict(data_scaled)
    crop_label = label_encoder.inverse_transform(prediction)[0]

    return {"crop": crop_label}
