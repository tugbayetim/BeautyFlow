import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Modal from '../components/Modal';
import { API_BASE, SALON_ID } from '../config';

interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
  salon_id: number;
  created_at: string;
}

const primaryBtn = {
  backgroundColor: '#e52d6e',
  color: 'white',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '8px',
  fontWeight: 'bold' as const,
  cursor: 'pointer',
  fontSize: '16px',
  flexShrink: 0,
};

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');

  const fetchServices = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/services?salon_id=${SALON_ID}`)
      .then((response) => response.json())
      .then((data) => setServices(data))
      .catch((err) => console.error('Hizmetler çekilirken hata oluştu:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          duration_minutes: Number(duration),
          price: Number(price),
          salon_id: SALON_ID,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Hizmet eklenemedi');
      }

      setName('');
      setDuration('');
      setPrice('');
      setModalOpen(false);
      fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1a202c' }}>Hizmetler</h1>
          <p style={{ margin: 0, color: '#718096', fontSize: '16px' }}>Salonunuzda sunulan hizmetlerin listesi</p>
        </div>
        <button type="button" style={primaryBtn} onClick={() => setModalOpen(true)}>
          + Yeni Hizmet
        </button>
      </div>

      {loading ? (
        <p>Hizmetler yükleniyor...</p>
      ) : (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            border: '1px solid #edf2f7',
            width: '100%',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc' }}>
                <th style={thStyle}>Hizmet Adı</th>
                <th style={thStyle}>Süre</th>
                <th style={thStyle}>Fiyat</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#a0aec0', fontSize: '16px' }}>
                    Henüz hiçbir hizmet eklenmemiş. &quot;+ Yeni Hizmet&quot; ile ilk hizmetinizi ekleyin.
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: '18px 25px', fontWeight: '500', color: '#2d3748', fontSize: '16px' }}>
                      ✨ {service.name}
                    </td>
                    <td style={{ padding: '18px 25px', color: '#718096', fontSize: '16px' }}>
                      {service.duration_minutes} dk
                    </td>
                    <td style={{ padding: '18px 25px', fontWeight: 'bold', color: '#2d3748', fontSize: '16px' }}>
                      {Number(service.price).toLocaleString('tr-TR')} TL
                    </td>
                    <td style={{ padding: '18px 25px', textAlign: 'right', fontSize: '20px', cursor: 'pointer' }}>
                      📝 🗑️
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Hizmet Ekle">
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Hizmet Adı *
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Örn: Manikür, Saç Kesimi"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Süre (dakika) *
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              min={1}
              placeholder="60"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Fiyat (TL) *
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min={0}
              step="0.01"
              placeholder="500"
              style={inputStyle}
            />
          </label>
          {error && <p style={{ color: '#e53e3e', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                color: '#4a5568',
              }}
            >
              İptal
            </button>
            <button type="submit" disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '18px 25px',
  color: '#4a5568',
  fontWeight: '600',
  fontSize: '14px',
  textTransform: 'uppercase',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '16px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#4a5568',
};

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '16px',
  fontWeight: 'normal',
  color: '#2d3748',
};
