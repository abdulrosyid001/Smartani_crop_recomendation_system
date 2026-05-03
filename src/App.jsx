import { useEffect, useState } from 'react'
import smartaniLogo from './assets/smartani.png'
import './App.css'

function App() {
  const [temperature, setTemperature] = useState('')
  const [rainfall, setRainfall] = useState('')
  const [prediction, setPrediction] = useState(null)
  const [predictStatus, setPredictStatus] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [diseaseFile, setDiseaseFile] = useState(null)
  const [diseasePreview, setDiseasePreview] = useState('')
  const [diseaseStatus, setDiseaseStatus] = useState('')
  const [diseaseResult, setDiseaseResult] = useState(null)
  const [fertilizerData, setFertilizerData] = useState({
    temperature: '',
    moisture: '',
    rainfall: '',
    ph: '',
    soil: '',
    crop: '',
    nitrogen: '',
    potassium: '',
    phosphorous: '',
    carbon: '',
  })
  const [fertilizerStatus, setFertilizerStatus] = useState('')
  const [fertilizerPrediction, setFertilizerPrediction] = useState(null)
  const [formData, setFormData] = useState({
    humidity: '',
    ph: '',
    nitrogen: '',
    phosphorous: '',
    potassium: '',
    carbon: '',
    soilType: '',
  })

  const handleTemperatureChange = (event) => {
    setTemperature(event.target.value)
  }

  const handleRainfallChange = (event) => {
    setRainfall(event.target.value)
  }

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (predictStatus) {
      setPredictStatus('')
    }
  }

  const handleDiseaseFileChange = (event) => {
    const file = event.target.files?.[0] || null
    if (diseasePreview) {
      URL.revokeObjectURL(diseasePreview)
    }
    setDiseaseFile(file)
    setDiseasePreview(file ? URL.createObjectURL(file) : '')
    setDiseaseStatus('')
    setDiseaseResult(null)
  }

  const handleDiseasePredict = async () => {
    if (!diseaseFile) {
      setDiseaseStatus('Pilih foto daun terlebih dahulu.')
      return
    }

    setDiseaseStatus('Memproses gambar...')
    setDiseaseResult(null)

    try {
      const form = new FormData()
      form.append('file', diseaseFile)

      const response = await fetch('http://localhost:8000/predict-disease', {
        method: 'POST',
        body: form,
      })

      if (!response.ok) {
        throw new Error('Prediction failed')
      }

      const data = await response.json()
      setDiseaseResult(data)
      setDiseaseStatus('')
    } catch (error) {
      setDiseaseStatus('Gagal mendeteksi penyakit. Pastikan API aktif.')
    }
  }

  const handleFertilizerChange = (event) => {
    const { name, value } = event.target
    setFertilizerData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (fertilizerStatus) {
      setFertilizerStatus('')
    }
  }

  const handleFertilizerPredict = async () => {
    const toNumber = (value) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    const payload = {
      temperature: toNumber(fertilizerData.temperature),
      moisture: toNumber(fertilizerData.moisture),
      rainfall: toNumber(fertilizerData.rainfall),
      ph: toNumber(fertilizerData.ph),
      soil: fertilizerData.soil.trim(),
      crop: fertilizerData.crop.trim(),
      nitrogen: toNumber(fertilizerData.nitrogen),
      potassium: toNumber(fertilizerData.potassium),
      phosphorous: toNumber(fertilizerData.phosphorous),
      carbon: toNumber(fertilizerData.carbon),
    }

    const missingFields = Object.entries(payload)
      .filter(([key, value]) => (key === 'soil' || key === 'crop') ? !value : value === null)
      .map(([key]) => key)

    if (missingFields.length > 0) {
      setFertilizerStatus('Lengkapi semua input untuk rekomendasi pupuk.')
      setFertilizerPrediction(null)
      return
    }

    setFertilizerStatus('Mengirim data ke model...')
    setFertilizerPrediction(null)

    try {
      const response = await fetch('http://localhost:8000/predict-fertilizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Prediction failed')
      }

      const data = await response.json()
      setFertilizerPrediction({
        label: data.fertilizer,
        confidence: typeof data.confidence === 'number' ? data.confidence : null,
      })
      setFertilizerStatus('')
    } catch (error) {
      setFertilizerStatus('Gagal memproses rekomendasi pupuk. Pastikan API aktif.')
    }
  }

  const handlePredict = async () => {
    const toNumber = (value) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    const payload = {
      temperature: toNumber(temperature),
      humidity: toNumber(formData.humidity),
      rainfall: toNumber(rainfall),
      ph: toNumber(formData.ph),
      nitrogen: toNumber(formData.nitrogen),
      phosphorous: toNumber(formData.phosphorous),
      potassium: toNumber(formData.potassium),
      carbon: toNumber(formData.carbon),
      soilType: formData.soilType,
    }

    const missingFields = Object.entries(payload)
      .filter(([key, value]) => key !== 'soilType' && value === null)
      .map(([key]) => key)

    if (!payload.soilType || missingFields.length > 0) {
      setPredictStatus('Lengkapi semua input, termasuk suhu dan curah hujan.')
      setPrediction(null)
      return
    }

    setPredictStatus('Mengirim data ke model...')
    setPrediction(null)

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Prediction failed')
      }

      const data = await response.json()
      setPrediction({
        label: data.crop,
        confidence: typeof data.confidence === 'number' ? data.confidence : null,
      })
      setPredictStatus('')
    } catch (error) {
      setPredictStatus('Gagal memproses prediksi. Pastikan API aktif.')
    }
  }

  const features = [
    {
      tag: 'Terpadu',
      title: 'Tiga layanan dalam satu platform',
      desc: 'Rekomendasi tanaman, pupuk, dan deteksi penyakit menyatu dalam satu alur kerja.',
    },
    {
      tag: 'Presisi',
      title: 'Berbasis data dan model terlatih',
      desc: 'Menggunakan model AI milik SMARTANI untuk hasil yang konsisten di lapangan.',
    },
    {
      tag: 'Efisien',
      title: 'Keputusan cepat untuk petani',
      desc: 'Cukup masukkan data, sistem memberikan hasil dan confidence score secara instan.',
    },
  ]

  const steps = [
    {
      title: 'Pilih fitur yang dibutuhkan',
      desc: 'Rekomendasi tanaman, pupuk, atau deteksi penyakit sesuai tujuan Anda.',
    },
    {
      title: 'Masukkan data atau foto',
      desc: 'Isi parameter tanah atau unggah foto daun sesuai fitur yang dipilih.',
    },
    {
      title: 'Terima hasil dan confidence',
      desc: 'Dapatkan hasil prediksi lengkap dengan tingkat keyakinan model.',
    },
  ]

  const featureTags = [
    'Rekomendasi tanaman',
    'Rekomendasi pupuk',
    'Deteksi penyakit tanaman',
  ]
  const fertilizerSoilOptions = [
    'Loamy Soil',
    'Peaty Soil',
    'Acidic Soil',
    'Neutral Soil',
    'Alkaline Soil',
  ]
  const fertilizerCropOptions = [
    'rice',
    'wheat',
    'Mung Bean',
    'Tea',
    'millet',
    'maize',
    'Lentil',
    'Jute',
    'Coffee',
    'Cotton',
    'Ground Nut',
    'Peas',
    'Rubber',
    'Sugarcane',
    'Tobacco',
    'Kidney Beans',
    'Moth Beans',
    'Coconut',
    'Black gram',
    'Adzuki Beans',
    'Pigeon Peas',
    'Chickpea',
    'banana',
    'grapes',
    'apple',
    'mango',
    'muskmelon',
    'orange',
    'papaya',
    'pomegranate',
    'watermelon',
  ]

  const getCropSuggestion = (label) => {
    if (!label) {
      return ''
    }
    return `Saran AI: Pastikan pH, kelembapan, dan NPK sesuai untuk ${label}.`
  }

  const getFertilizerSuggestion = (label) => {
    if (!label) {
      return ''
    }
    return `Saran AI: Gunakan ${label} sesuai dosis pada label dan fase pertumbuhan.`
  }

  const getDiseaseSuggestion = (label) => {
    if (!label) {
      return ''
    }
    return 'Saran AI: Isolasi tanaman, buang daun terinfeksi, dan pantau kelembapan lahan.'
  }

  return (
    <div className="page" id="top">
      <header className="site-header site-header-full">
        <div className="brand">
          <img src={smartaniLogo} className="brand-logo" alt="SMARTANI logo" />
          <div className="brand-text">
            <span className="brand-name">SMARTANI</span>
          </div>
        </div>
        <nav className="site-nav">
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#deteksi">Deteksi Tanaman</a>
          <a href="#pupuk">Rekomendasi Pupuk</a>
          <a href="#penyakit">Deteksi Penyakit</a>
          <a href="#fitur">Fitur</a>
        </nav>
      </header>

      <main>
        <section className="hero hero-full" id="home">
          <div className="hero-text">
            <p className="eyebrow reveal delay-1">
              Rekomendasi tanaman, deteksi pupuk, deteksi penyakit tanaman
            </p>
            <h1 className="reveal delay-2">Platform cerdas untuk keputusan pertanian yang lebih tepat.</h1>
            <p className="lead reveal delay-3">
              SMARTANI hadir untuk membantu petani dalam rekomendasi
              tanaman, pupuk, serta deteksi penyakit secara cepat dan konsisten guna mendukung <em>Nature-Based Solutions & Blue Economy</em>.
            </p>
            <p className="hero-note reveal delay-3">
              Dirancang untuk petani, penyuluh, dan tim agronomi dengan hasil yang mudah dibaca.
            </p>
            <div className="hero-actions reveal delay-4">
              <a href="#deteksi" className="cta primary">Mulai Deteksi</a>
              <a href="#cara-kerja" className="cta outline">Lihat Cara Kerja</a>
            </div>
            <div className="hero-stats reveal delay-5">
              {featureTags.map((item) => (
                <div key={item} className="stat-card">
                  <span className="stat-value">{item}</span>
                  <span className="stat-label">Fitur utama</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section steps" id="cara-kerja">
          <div className="section-header">
            <div>
              <h2>Alur kerja sederhana</h2>
              <p>Dari input data ke rekomendasi dan deteksi dalam beberapa langkah.</p>
            </div>
            <span className="section-tag">3 Langkah</span>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <div key={step.title} className="step-card">
                <span className="step-index">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="deteksi">
          <div className="section-header">
            <div>
              <h2>Masukkan data tanah</h2>
              <p>Isi parameter utama untuk menghitung kecocokan tanaman.</p>
            </div>
            <span className="section-tag">Form Deteksi</span>
          </div>
          <form className="soil-form">
            <div className="form-grid">
              <label className="field">
                <span>pH Tanah</span>
                <input
                  name="ph"
                  type="number"
                  step="0.1"
                  placeholder="5.5"
                  value={formData.ph}
                  onChange={handleFormChange}
                />
              </label>
              <label className="field">
                <span>Kelembapan (%)</span>
                <input
                  name="humidity"
                  type="number"
                  placeholder="60"
                  value={formData.humidity}
                  onChange={handleFormChange}
                />
              </label>
              <label className="field">
                <span>Suhu (C)</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="28.0"
                  value={temperature}
                  onChange={handleTemperatureChange}
                />
              </label>
              <label className="field">
                <span>Curah hujan (mm)</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={rainfall}
                  onChange={handleRainfallChange}
                />
              </label>
              <label className="field">
                <span>Nitrogen (N)</span>
                <input
                  name="nitrogen"
                  type="number"
                  placeholder="40"
                  value={formData.nitrogen}
                  onChange={handleFormChange}
                />
              </label>
              <label className="field">
                <span>Fosfor (P)</span>
                <input
                  name="phosphorous"
                  type="number"
                  placeholder="25"
                  value={formData.phosphorous}
                  onChange={handleFormChange}
                />
              </label>
              <label className="field">
                <span>Potasium (K)</span>
                <input
                  name="potassium"
                  type="number"
                  placeholder="35"
                  value={formData.potassium}
                  onChange={handleFormChange}
                />
              </label>
              <label className="field">
                <span>Jenis tanah</span>
                <select
                  name="soilType"
                  value={formData.soilType}
                  onChange={handleFormChange}
                >
                  <option value="" disabled>Pilih jenis tanah</option>
                  <option value="acidic">Asam (Acidic)</option>
                  <option value="alkaline">Basa (Alkaline)</option>
                  <option value="loamy">Lempung (Loamy)</option>
                  <option value="neutral">Netral (Neutral)</option>
                  <option value="peaty">Gambut (Peaty)</option>
                </select>
              </label>
              <label className="field">
                <span>Carbon</span>
                <input
                  name="carbon"
                  type="number"
                  placeholder="0.5"
                  value={formData.carbon}
                  onChange={handleFormChange}
                />
              </label>
            </div>
            <p className="form-tip">
              Gunakan satuan standar (C, mm, %) dan isi data rata-rata terbaru.
            </p>
            <div className="form-actions">
              <button type="button" className="cta primary" onClick={handlePredict}>
                Deteksi Tanaman
              </button>
            </div>
            {predictStatus ? <p className="form-note">{predictStatus}</p> : null}
            {prediction ? (
              <div className="prediction-card">
                <span className="prediction-label">Rekomendasi utama</span>
                <strong className="prediction-value">{prediction.label}</strong>
                {typeof prediction.confidence === 'number' ? (
                  <span className="field-note">
                    Keyakinan {Math.round(prediction.confidence * 100)}%
                  </span>
                ) : null}
                {getCropSuggestion(prediction.label) ? (
                  <p className="ai-suggestion">{getCropSuggestion(prediction.label)}</p>
                ) : null}
              </div>
            ) : null}
          </form>
        </section>

        <section className="section" id="pupuk">
          <div className="section-header">
            <div>
              <h2>Rekomendasi pupuk otomatis</h2>
              <p>Masukkan data lingkungan dan tanaman untuk mendapatkan pupuk terbaik.</p>
            </div>
            <span className="section-tag">Rekomendasi Pupuk</span>
          </div>
          <form className="soil-form">
            <div className="form-grid">
              <label className="field">
                <span>Temperature (C)</span>
                <input
                  name="temperature"
                  type="number"
                  step="0.1"
                  placeholder="28"
                  value={fertilizerData.temperature}
                  onChange={handleFertilizerChange}
                />
              </label>
              <label className="field">
                <span>Moisture (%)</span>
                <input
                  name="moisture"
                  type="number"
                  placeholder="60"
                  value={fertilizerData.moisture}
                  onChange={handleFertilizerChange}
                />
              </label>
              <label className="field">
                <span>Curah hujan (mm)</span>
                <input
                  name="rainfall"
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={fertilizerData.rainfall}
                  onChange={handleFertilizerChange}
                />
              </label>
              <label className="field">
                <span>pH Tanah</span>
                <input
                  name="ph"
                  type="number"
                  step="0.1"
                  placeholder="6.0"
                  value={fertilizerData.ph}
                  onChange={handleFertilizerChange}
                />
              </label>
              <label className="field">
                <span>Jenis tanah</span>
                <select
                  name="soil"
                  value={fertilizerData.soil}
                  onChange={handleFertilizerChange}
                >
                  <option value="" disabled>Pilih jenis tanah</option>
                  {fertilizerSoilOptions.map((soil) => (
                    <option key={soil} value={soil}>{soil}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Jenis tanaman</span>
                <select
                  name="crop"
                  value={fertilizerData.crop}
                  onChange={handleFertilizerChange}
                >
                  <option value="" disabled>Pilih jenis tanaman</option>
                  {fertilizerCropOptions.map((crop) => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Nitrogen (N)</span>
                <input
                  name="nitrogen"
                  type="number"
                  placeholder="40"
                  value={fertilizerData.nitrogen}
                  onChange={handleFertilizerChange}
                />
              </label>
              <label className="field">
                <span>Fosfor (P)</span>
                <input
                  name="phosphorous"
                  type="number"
                  placeholder="25"
                  value={fertilizerData.phosphorous}
                  onChange={handleFertilizerChange}
                />
              </label>
              <label className="field">
                <span>Potasium (K)</span>
                <input
                  name="potassium"
                  type="number"
                  placeholder="35"
                  value={fertilizerData.potassium}
                  onChange={handleFertilizerChange}
                />
              </label>
              <label className="field">
                <span>Carbon</span>
                <input
                  name="carbon"
                  type="number"
                  placeholder="0.5"
                  value={fertilizerData.carbon}
                  onChange={handleFertilizerChange}
                />
              </label>
            </div>
            <p className="form-tip">
              Pastikan jenis tanah dan tanaman sesuai daftar agar hasil lebih akurat.
            </p>
            <div className="form-actions">
              <button type="button" className="cta primary" onClick={handleFertilizerPredict}>
                Rekomendasi Pupuk
              </button>
            </div>
            {fertilizerStatus ? <p className="form-note">{fertilizerStatus}</p> : null}
            {fertilizerPrediction ? (
              <div className="prediction-card">
                <span className="prediction-label">Pupuk yang disarankan</span>
                <strong className="prediction-value">{fertilizerPrediction.label}</strong>
                {typeof fertilizerPrediction.confidence === 'number' ? (
                  <span className="field-note">
                    Keyakinan {Math.round(fertilizerPrediction.confidence * 100)}%
                  </span>
                ) : null}
                {getFertilizerSuggestion(fertilizerPrediction.label) ? (
                  <p className="ai-suggestion">
                    {getFertilizerSuggestion(fertilizerPrediction.label)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </form>
        </section>

        <section className="section" id="penyakit">
          <div className="section-header">
            <div>
              <h2>Deteksi penyakit tanaman</h2>
              <p>Unggah foto daun untuk mengetahui jenis penyakit.</p>
            </div>
            <span className="section-tag">Deteksi Penyakit</span>
          </div>
          <div className="upload-panel">
            <div className="upload-box">
              <div className="drop-area">
                <span className="drop-title">Upload atau ambil foto daun</span>
                <span className="drop-sub">Gunakan foto fokus pada daun (JPG/PNG).</span>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="file-input"
                onChange={handleDiseaseFileChange}
              />
              {diseasePreview ? (
                <img
                  src={diseasePreview}
                  alt="Preview daun"
                  className="preview-image"
                />
              ) : null}
              <p className="form-tip">
                Pastikan pencahayaan cukup dan daun tampak jelas untuk hasil terbaik.
              </p>
              <button
                type="button"
                className="cta primary"
                onClick={handleDiseasePredict}
                disabled={!diseaseFile}
              >
                Deteksi Penyakit
              </button>
              {diseaseStatus ? <p className="form-note">{diseaseStatus}</p> : null}
            </div>
            <div className="panel-card">
              <h3>Hasil deteksi</h3>
              {diseaseResult ? (
                <div className="prediction-card compact">
                  <span className="prediction-label">Penyakit terdeteksi</span>
                  <strong className="prediction-value">{diseaseResult.label}</strong>
                  {typeof diseaseResult.confidence === 'number' ? (
                    <span className="field-note">
                      Keyakinan {Math.round(diseaseResult.confidence * 100)}%
                    </span>
                  ) : null}
                  {getDiseaseSuggestion(diseaseResult.label) ? (
                    <p className="ai-suggestion">{getDiseaseSuggestion(diseaseResult.label)}</p>
                  ) : null}
                </div>
              ) : (
                <p className="field-note">Unggah foto untuk melihat hasil.</p>
              )}
            </div>
          </div>
        </section>

        <section className="section" id="fitur">
          <div className="section-header">
            <div>
              <h2>Kenapa SMARTANI?</h2>
              <p>Fokus pada kebutuhan petani dan peneliti tanah.</p>
            </div>
            <span className="section-tag">Highlight</span>
          </div>
          <div className="feature-grid">
            {features.map((item) => (
              <article key={item.title} className="feature-card">
                <span className="feature-tag">{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </section>


      </main>

      <footer className="site-footer">
        <div>
          <strong>SMARTANI</strong>
          <p>Rekomendasi tanaman, pupuk, dan deteksi penyakit berbasis AI.</p>
          <span className="small muted">Copyright 2026</span>
        </div>
        <div className="footer-links">
          <a href="#deteksi">Deteksi</a>
          <a href="#pupuk">Pupuk</a>
          <a href="#penyakit">Penyakit</a>
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara kerja</a>
        </div>
      </footer>
      {showBackToTop ? (
        <a href="#top" className="back-to-top" aria-label="Kembali ke atas">
          ^
        </a>
      ) : null}
    </div>
  )
}

export default App
