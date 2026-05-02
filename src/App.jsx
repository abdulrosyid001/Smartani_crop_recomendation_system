import { useState } from 'react'
import heroImg from './assets/hero.png'
import smartaniLogo from './assets/smartani.png'
import './App.css'

function App() {
  const [locationQuery, setLocationQuery] = useState('')
  const [temperature, setTemperature] = useState('')
  const [rainfall, setRainfall] = useState('')
  const [tempStatus, setTempStatus] = useState('')
  const [prediction, setPrediction] = useState('')
  const [predictStatus, setPredictStatus] = useState('')
  const [formData, setFormData] = useState({
    humidity: '',
    ph: '',
    nitrogen: '',
    phosphorous: '',
    potassium: '',
    carbon: '',
    soilType: '',
  })

  const handleLocationChange = (event) => {
    setLocationQuery(event.target.value)
    if (tempStatus) {
      setTempStatus('')
    }
    setTemperature('')
    setRainfall('')
  }

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

  const handleFetchTemperature = async () => {
    const trimmedLocation = locationQuery.trim()
    if (!trimmedLocation) {
      setTempStatus('Masukkan lokasi terlebih dahulu.')
      setTemperature('')
      return
    }

    setTempStatus('Mengambil suhu...')
    try {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          trimmedLocation,
        )}&count=1&language=id&format=json`,
      )

      if (!geoResponse.ok) {
        throw new Error('Geocoding gagal')
      }

      const geoData = await geoResponse.json()
      const location = geoData?.results?.[0]

      if (!location) {
        setTempStatus('Lokasi tidak ditemukan. Coba nama kota atau kabupaten.')
        setTemperature('')
        return
      }

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,precipitation`,
      )

      if (!weatherResponse.ok) {
        throw new Error('Cuaca tidak tersedia')
      }

      const weatherData = await weatherResponse.json()
      const currentTemp = weatherData?.current?.temperature_2m
      const currentRainfall = weatherData?.current?.precipitation

      if (typeof currentTemp !== 'number') {
        setTempStatus('Suhu saat ini belum tersedia.')
        setTemperature('')
        setRainfall('')
        return
      }

      if (typeof currentRainfall === 'number') {
        setRainfall(currentRainfall.toFixed(1))
      } else {
        setRainfall('')
      }

      const locationLabel = [location.name, location.admin1, location.country]
        .filter(Boolean)
        .join(', ')

      setTemperature(currentTemp.toFixed(1))
      setTempStatus(`Suhu dan curah hujan saat ini di ${locationLabel}.`)
    } catch (error) {
      setTempStatus('Gagal mengambil suhu. Coba lagi sebentar.')
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
      setPredictStatus('Lengkapi semua input dan ambil suhu/curah hujan online.')
      setPrediction('')
      return
    }

    setPredictStatus('Mengirim data ke model...')
    setPrediction('')

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
      setPrediction(data.crop)
      setPredictStatus('')
    } catch (error) {
      setPredictStatus('Gagal memproses prediksi. Pastikan API aktif.')
    }
  }

  const features = [
    {
      tag: 'Presisi',
      title: 'Rekomendasi berbasis data tanah',
      desc: 'Sistem membaca pH, NPK, kelembapan, dan tekstur untuk memilih tanaman yang paling cocok.',
    },
    {
      tag: 'Cepat',
      title: 'Analisis instan di satu layar',
      desc: 'Input data, tekan deteksi, dan dapatkan daftar tanaman prioritas tanpa langkah rumit.',
    },
    {
      tag: 'Fleksibel',
      title: 'Siap dihubungkan dengan model Anda',
      desc: 'Upload model yang sudah di-train untuk menyesuaikan kebutuhan wilayah dan jenis tanah lokal.',
    },
  ]

  const steps = [
    {
      title: 'Masukkan data tanah',
      desc: 'Input parameter inti seperti pH, kelembapan, NPK, tekstur, dan ketinggian lahan.',
    },
    {
      title: 'Jalankan model AI',
      desc: 'Model akan menghitung skor kecocokan dan memberikan ranking tanaman terbaik.',
    },
    {
      title: 'Terima rekomendasi',
      desc: 'Lihat tanaman yang disarankan, plus catatan kondisi tanah untuk perbaikan lahan.',
    },
  ]

  const sampleCrops = ['Padi', 'Jagung', 'Cabai', 'Kedelai']

  return (
    <div className="page">
      <header className="site-header">
        <div className="brand">
          <img src={smartaniLogo} className="brand-logo" alt="SMARTANI logo" />
          <div className="brand-text">
            <span className="brand-name">SMARTANI</span>
            <span className="brand-sub">SoilMatch</span>
          </div>
        </div>
        <nav className="site-nav">
          <a href="#deteksi">Deteksi</a>
          <a href="#model">Model</a>
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara kerja</a>
        </nav>
        <button type="button" className="cta ghost">Minta Demo</button>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-text">
            <p className="eyebrow reveal delay-1">Deteksi tanaman berbasis kondisi tanah</p>
            <h1 className="reveal delay-2">Rekomendasi tanaman paling cocok dari data tanahmu.</h1>
            <p className="lead reveal delay-3">
              Integrasikan model AI yang sudah Anda latih. Masukkan parameter tanah untuk
              mendapatkan rekomendasi tanaman yang paling potensial dari data lapangan.
            </p>
            <div className="hero-actions reveal delay-4">
              <button type="button" className="cta primary">Mulai Deteksi</button>
              <button type="button" className="cta outline">Lihat Cara Kerja</button>
            </div>
            <div className="hero-stats reveal delay-5">
              <div className="stat-card">
                <span className="stat-value">6</span>
                <span className="stat-label">Parameter tanah</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">12+</span>
                <span className="stat-label">Tanaman populer</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">2026</span>
                <span className="stat-label">Rilis awal</span>
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="panel-card reveal delay-2">
              <div className="panel-header">
                <span>Status Analisis</span>
                <span className="pill">Demo</span>
              </div>
              <div className="panel-metric">
                <div className="metric-row">
                  <span>pH Tanah</span>
                  <span>5.8</span>
                </div>
                <div className="bar">
                  <span className="bar-fill ph"></span>
                </div>
              </div>
              <div className="panel-metric">
                <div className="metric-row">
                  <span>Kelembapan</span>
                  <span>62%</span>
                </div>
                <div className="bar">
                  <span className="bar-fill moisture"></span>
                </div>
              </div>
              <div className="panel-metric">
                <div className="metric-row">
                  <span>Kesuburan NPK</span>
                  <span>Medium</span>
                </div>
                <div className="bar">
                  <span className="bar-fill npk"></span>
                </div>
              </div>
              <div className="panel-recommendations">
                <p>Rekomendasi awal</p>
                <div className="chip-row">
                  {sampleCrops.map((crop) => (
                    <span key={crop} className="chip">{crop}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="panel-card mini reveal delay-3">
              <img src={heroImg} alt="Ilustrasi data tanah" />
              <div>
                <h3>Monitor lahan</h3>
                <p>Visualisasi status tanah dan indikator nutrisi.</p>
                <button type="button" className="cta outline">Siapkan Model</button>
              </div>
            </div>
          </div>
        </section>

        <section className="section steps" id="cara-kerja">
          <div className="section-header">
            <div>
              <h2>Alur kerja sederhana</h2>
              <p>Dari data tanah ke rekomendasi tanaman dalam beberapa langkah.</p>
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
                <span>Lokasi (kota/kabupaten)</span>
                <input
                  type="text"
                  placeholder="Contoh: Lembang, Bandung"
                  value={locationQuery}
                  onChange={handleLocationChange}
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
                <span>Kalium (K)</span>
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
                <span>Suhu saat ini (C)</span>
                <div className="input-with-button">
                  <input
                    type="text"
                    placeholder="Klik ambil suhu online"
                    value={temperature}
                    readOnly
                  />
                  <button
                    type="button"
                    className="cta outline small-button"
                    onClick={handleFetchTemperature}
                  >
                    Ambil
                  </button>
                </div>
                {tempStatus ? <span className="field-note">{tempStatus}</span> : null}
              </label>
              <label className="field">
                <span>Curah hujan (mm)</span>
                <input
                  type="text"
                  placeholder="Auto dari online"
                  value={rainfall}
                  readOnly
                />
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
            <div className="form-actions">
              <button type="button" className="cta primary" onClick={handlePredict}>
                Deteksi Tanaman
              </button>
              <button type="button" className="cta ghost">Simpan Profil Tanah</button>
            </div>
            {predictStatus ? <p className="form-note">{predictStatus}</p> : null}
            {prediction ? (
              <div className="prediction-card">
                <span className="prediction-label">Rekomendasi utama</span>
                <strong className="prediction-value">{prediction}</strong>
              </div>
            ) : null}
          </form>
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
          <strong>SMARTANI SoilMatch</strong>
          <p>Deteksi tanaman berbasis data tanah dan model AI.</p>
          <span className="small muted">Copyright 2026</span>
        </div>
        <div className="footer-links">
          <a href="#deteksi">Deteksi</a>
          <a href="#model">Model</a>
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara kerja</a>
        </div>
      </footer>
    </div>
  )
}

export default App
