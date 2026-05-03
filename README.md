# SMARTANI

SMARTANI adalah dashboard AI untuk rekomendasi tanaman, rekomendasi pupuk, dan deteksi penyakit tanaman. Website ini membantu petani dan peneliti mengambil keputusan cepat berbasis data.

## Fitur utama

- Rekomendasi tanaman berbasis data tanah dan cuaca.
- Rekomendasi pupuk berdasarkan kondisi lahan dan jenis tanaman.
- Deteksi penyakit tanaman dari foto daun.
- Confidence score untuk setiap prediksi.
- UI ringkas dengan alur kerja 3 langkah.

## Alur kerja singkat

1. Pilih fitur yang dibutuhkan.
2. Masukkan data tanah atau unggah foto daun.
3. Terima hasil dan confidence.

## Teknologi

- Frontend: React + Vite.
- Backend: FastAPI (Python).
- Model: scikit-learn untuk rekomendasi tanaman/pupuk, PyTorch untuk deteksi penyakit.

## Struktur proyek (ringkas)

- [src/](src/) - kode frontend.
- [server/](server/) - API FastAPI.
- [server/models/](server/models/) - file model dan encoder.
- [gambar/](gambar/) - aset gambar UI.

## Prasyarat

- Node.js 18+.
- Python 3.10+.

## Instalasi dan menjalankan

### 1) Backend (API)

```bash
cd server
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

API berjalan di `http://localhost:8000`.

### 2) Frontend (UI)

```bash
cd ..
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

## Model yang dibutuhkan

Letakkan file model di [server/models/](server/models/). Beberapa fitur tidak aktif jika file model tidak tersedia.

### Rekomendasi tanaman

- Model: `ensemble_model_optimized.joblib` (atau salah satu kandidat model lain).
- Scaler: `scaler (1).pkl`, `scaler.joblib`, atau `scaler.pkl`.
- Encoder: `crop_encoder (1).pkl`, `crop_encoder.joblib`, atau `encoder.pkl`.

### Deteksi penyakit

- Model: `efficientnet_plantvillage_final.pth`.
- Label kelas: `class_mapping.json` (opsional, untuk nama kelas).

### Rekomendasi pupuk

- Model: `random_forest_model.pkl`.
- Scaler: `scaler_rf.pkl` atau `fertilizer_scaler.pkl`.
- Encoder: `encoders_rf.pkl` atau `encoders.pkl`.
- Feature order: `feature_order_rf.pkl` atau `feature_order.pkl`.

## Endpoint API

- `GET /health` - status model yang terbaca.
- `POST /predict` - rekomendasi tanaman.
- `POST /predict-fertilizer` - rekomendasi pupuk.
- `POST /predict-disease` - deteksi penyakit dari gambar.

Contoh payload `POST /predict`:

```json
{
	"temperature": 28,
	"humidity": 60,
	"rainfall": 5,
	"ph": 6.2,
	"nitrogen": 40,
	"phosphorous": 25,
	"potassium": 35,
	"carbon": 0.5,
	"soilType": "loamy"
}
```

Contoh payload `POST /predict-fertilizer`:

```json
{
	"temperature": 28,
	"moisture": 60,
	"rainfall": 5,
	"ph": 6.2,
	"soil": "Loamy Soil",
	"crop": "rice",
	"nitrogen": 40,
	"potassium": 35,
	"phosphorous": 25,
	"carbon": 0.5
}
```

Untuk `POST /predict-disease`, kirim file gambar dengan form-data key `file`.

## Troubleshooting

- Jika API gagal start, pastikan semua file model ada di [server/models/](server/models/).
- Jika UI tidak bisa memanggil API, pastikan `uvicorn` berjalan di port 8000.
- CORS sudah diizinkan untuk `http://localhost:5173`.

## Lisensi

Project ini disiapkan untuk kebutuhan demo dan kompetisi.
