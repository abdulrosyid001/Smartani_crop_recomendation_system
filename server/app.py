from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os
import io
import json
from typing import Optional
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))
MODEL_CANDIDATES = [
    "ensemble_model_optimized.joblib",
    "lgbm_model.joblib",
    "model.joblib",
    "model.pkl",
]
SCALER_CANDIDATES = [
    "scaler (1).pkl",
    "scaler.joblib",
    "scaler.pkl",
]
ENCODER_CANDIDATES = [
    "crop_encoder (1).pkl",
    "crop_encoder.joblib",
    "encoder.pkl",
]
DISEASE_MODEL_CANDIDATES = [
    "efficientnet_plantvillage_final.pth",
]
DISEASE_CLASSES_CANDIDATES = [
    "class_mapping.json",
    "plant_disease_classes.json",
    "plant_disease_classes.txt",
]
FERTILIZER_MODEL_CANDIDATES = [
    "random_forest_model.pkl",
]
FERTILIZER_SCALER_CANDIDATES = [
    "scaler_rf.pkl",
    "fertilizer_scaler.pkl",
    "scaler.pkl",
]
FERTILIZER_ENCODERS_CANDIDATES = [
    "encoders_rf.pkl",
    "encoders.pkl",
]
FERTILIZER_FEATURE_ORDER_CANDIDATES = [
    "feature_order_rf.pkl",
    "feature_order.pkl",
]

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
model_path = None
scaler_path = None
encoder_path = None
disease_model = None
disease_transform = None
disease_classes = None
disease_model_path = None
disease_classes_path = None
fertilizer_model = None
fertilizer_scaler = None
fertilizer_encoders = None
fertilizer_feature_order = None
fertilizer_model_path = None
fertilizer_scaler_path = None
fertilizer_encoders_path = None
fertilizer_feature_order_path = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def resolve_artifact_path(candidates: list[str], label: str) -> str:
    for name in candidates:
        path = os.path.join(MODEL_DIR, name)
        if os.path.exists(path):
            return path
    expected = ", ".join(candidates)
    raise RuntimeError(f"{label} not found in {MODEL_DIR}. Expected one of: {expected}")


def resolve_optional_artifact_path(candidates: list[str]) -> Optional[str]:
    for name in candidates:
        path = os.path.join(MODEL_DIR, name)
        if os.path.exists(path):
            return path
    return None


def load_class_names(path: str) -> Optional[list[str]]:
    if not path:
        return None
    if path.endswith(".json"):
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        if isinstance(data, list):
            return [str(item) for item in data]
        if isinstance(data, dict):
            try:
                sorted_items = sorted(data.items(), key=lambda item: int(item[0]))
            except ValueError:
                sorted_items = sorted(data.items(), key=lambda item: str(item[0]))
            return [str(value) for _, value in sorted_items]
        return None
    if path.endswith(".txt"):
        with open(path, "r", encoding="utf-8") as handle:
            return [line.strip() for line in handle.readlines() if line.strip()]
    return None


def extract_state_dict(checkpoint) -> dict:
    if isinstance(checkpoint, nn.Module):
        return checkpoint.state_dict()
    if isinstance(checkpoint, dict):
        for key in ("state_dict", "model_state_dict", "model", "net"):
            if key in checkpoint:
                value = checkpoint[key]
                return value.state_dict() if isinstance(value, nn.Module) else value
        return checkpoint
    raise RuntimeError("Unsupported disease model format.")


def normalize_state_dict_keys(state_dict: dict) -> dict:
    if not state_dict:
        return state_dict
    sample_key = next(iter(state_dict.keys()))
    if sample_key.startswith("module."):
        return {key.replace("module.", "", 1): value for key, value in state_dict.items()}
    return state_dict


def normalize_encoder_value(value: str, encoder, label: str) -> str:
    cleaned = value.strip()
    classes = [str(item) for item in encoder.classes_]
    if cleaned in classes:
        return cleaned
    lowered = {item.lower(): item for item in classes}
    key = cleaned.lower()
    if key in lowered:
        return lowered[key]
    expected = ", ".join(classes)
    raise HTTPException(
        status_code=400,
        detail=f"{label} value not recognized. Expected one of: {expected}",
    )


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


class FertilizerRequest(BaseModel):
    temperature: float
    moisture: float
    rainfall: float
    ph: float
    soil: str
    crop: str
    nitrogen: float
    potassium: float
    phosphorous: float
    carbon: float


@app.on_event("startup")
def load_artifacts() -> None:
    global model, scaler, label_encoder, model_path, scaler_path, encoder_path
    global disease_model, disease_transform, disease_classes, disease_model_path, disease_classes_path
    global fertilizer_model, fertilizer_scaler, fertilizer_encoders, fertilizer_feature_order
    global fertilizer_model_path, fertilizer_scaler_path, fertilizer_encoders_path, fertilizer_feature_order_path
    model_path = resolve_artifact_path(MODEL_CANDIDATES, "Model file")
    scaler_path = resolve_artifact_path(SCALER_CANDIDATES, "Scaler file")
    encoder_path = resolve_artifact_path(ENCODER_CANDIDATES, "Encoder file")

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    label_encoder = joblib.load(encoder_path)

    disease_model_path = resolve_optional_artifact_path(DISEASE_MODEL_CANDIDATES)
    disease_classes_path = resolve_optional_artifact_path(DISEASE_CLASSES_CANDIDATES)
    disease_classes = load_class_names(disease_classes_path) if disease_classes_path else None

    if disease_model_path:
        checkpoint = torch.load(disease_model_path, map_location=device)
        state_dict = normalize_state_dict_keys(extract_state_dict(checkpoint))
        classifier_weight = state_dict.get("classifier.1.weight")
        if classifier_weight is None:
            classifier_weight = state_dict.get("classifier.1.bias")
        if classifier_weight is None and disease_classes:
            num_classes = len(disease_classes)
        elif classifier_weight is None:
            raise RuntimeError("Invalid disease model state dict format.")
        else:
            num_classes = classifier_weight.shape[0]
        disease_model = models.efficientnet_b0(weights=None)
        num_features = disease_model.classifier[1].in_features
        disease_model.classifier[1] = nn.Linear(num_features, num_classes)
        disease_model.load_state_dict(state_dict, strict=False)
        disease_model = disease_model.to(device)
        disease_model.eval()
        disease_transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )

    fertilizer_model_path = resolve_optional_artifact_path(FERTILIZER_MODEL_CANDIDATES)
    fertilizer_scaler_path = resolve_optional_artifact_path(FERTILIZER_SCALER_CANDIDATES)
    fertilizer_encoders_path = resolve_optional_artifact_path(FERTILIZER_ENCODERS_CANDIDATES)
    fertilizer_feature_order_path = resolve_optional_artifact_path(
        FERTILIZER_FEATURE_ORDER_CANDIDATES
    )

    if (
        fertilizer_model_path
        and fertilizer_scaler_path
        and fertilizer_encoders_path
        and fertilizer_feature_order_path
    ):
        fertilizer_model = joblib.load(fertilizer_model_path)
        fertilizer_scaler = joblib.load(fertilizer_scaler_path)
        fertilizer_encoders = joblib.load(fertilizer_encoders_path)
        fertilizer_feature_order = joblib.load(fertilizer_feature_order_path)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model": os.path.basename(model_path) if model_path else None,
        "scaler": os.path.basename(scaler_path) if scaler_path else None,
        "encoder": os.path.basename(encoder_path) if encoder_path else None,
        "disease_model": os.path.basename(disease_model_path) if disease_model_path else None,
        "disease_classes": os.path.basename(disease_classes_path) if disease_classes_path else None,
        "fertilizer_model": (
            os.path.basename(fertilizer_model_path) if fertilizer_model_path else None
        ),
        "fertilizer_scaler": (
            os.path.basename(fertilizer_scaler_path) if fertilizer_scaler_path else None
        ),
        "fertilizer_encoders": (
            os.path.basename(fertilizer_encoders_path) if fertilizer_encoders_path else None
        ),
        "fertilizer_feature_order": (
            os.path.basename(fertilizer_feature_order_path)
            if fertilizer_feature_order_path
            else None
        ),
    }


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

    confidence = None
    if hasattr(model, "predict_proba"):
        try:
            probabilities = model.predict_proba(data_scaled)
            confidence = float(np.max(probabilities))
        except Exception:
            confidence = None

    return {"crop": crop_label, "confidence": confidence}


@app.post("/predict-disease")
async def predict_disease(file: UploadFile = File(...)) -> dict:
    if disease_model is None or disease_transform is None:
        raise HTTPException(status_code=503, detail="Disease model is not loaded")

    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image file") from exc

    tensor = disease_transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = disease_model(tensor)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, index = torch.max(probabilities, dim=1)

    index_value = int(index.item())
    confidence_value = float(confidence.item())
    if disease_classes and index_value < len(disease_classes):
        label = disease_classes[index_value]
    else:
        label = f"class_{index_value}"

    return {
        "label": label,
        "confidence": confidence_value,
        "index": index_value,
    }


@app.post("/predict-fertilizer")
def predict_fertilizer(payload: FertilizerRequest) -> dict:
    if (
        fertilizer_model is None
        or fertilizer_scaler is None
        or fertilizer_encoders is None
        or fertilizer_feature_order is None
    ):
        raise HTTPException(status_code=503, detail="Fertilizer model is not loaded")

    soil = payload.soil.strip()
    crop = payload.crop.strip()
    if not soil or not crop:
        raise HTTPException(status_code=400, detail="Soil and crop are required")

    soil_value = normalize_encoder_value(soil, fertilizer_encoders["Soil"], "Soil")
    crop_value = normalize_encoder_value(crop, fertilizer_encoders["Crop"], "Crop")
    soil_encoded = fertilizer_encoders["Soil"].transform([soil_value])[0]
    crop_encoded = fertilizer_encoders["Crop"].transform([crop_value])[0]

    feature_values = {
        "Temperature": payload.temperature,
        "Moisture": payload.moisture,
        "Rainfall": payload.rainfall,
        "PH": payload.ph,
        "Soil": soil_encoded,
        "Crop": crop_encoded,
        "Nitrogen": payload.nitrogen,
        "Potassium": payload.potassium,
        "Phosphorous": payload.phosphorous,
        "Carbon": payload.carbon,
    }

    ordered_values = [feature_values[name] for name in fertilizer_feature_order]
    data_scaled = fertilizer_scaler.transform([ordered_values])
    prediction = fertilizer_model.predict(data_scaled)
    fertilizer_label = fertilizer_encoders["target"].inverse_transform(prediction)[0]

    confidence = None
    if hasattr(fertilizer_model, "predict_proba"):
        try:
            probabilities = fertilizer_model.predict_proba(data_scaled)
            confidence = float(np.max(probabilities))
        except Exception:
            confidence = None

    return {"fertilizer": fertilizer_label, "confidence": confidence}
