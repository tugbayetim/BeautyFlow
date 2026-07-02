import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Modal from '../components/Modal';
import { API_BASE, SALON_ID } from '../config';

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  last_visit: string | null;
  last_service_name: string | null;
  last_service_price: number | string | null;
  total_spent: number | string | null;
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

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/customers?salon_id=${SALON_ID}`)
      .then((res) => res.json())
      .then((data) => setCustomers(data))
      .catch((err) => console.error('Müşteriler çekilirken hata:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          salon_id: SALON_ID,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Müşteri eklenemedi');
      }

      setName('');
      setPhone('');
      setModalOpen(false);
      fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1a202c' }}>Müşteriler</h1>
          <p style={{ margin: 0, color: '#718096', fontSize: '16px' }}>Salon müşterilerinizin listesi</p>
        </div>
        <button type="button" style={primaryBtn} onClick={() => setModalOpen(true)}>
          + Yeni Müşteri
        </button>
      </div>

      {loading ? (
        <p>Müşteriler yükleniyor...</p>
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
                <th style={thStyle}>Ad Soyad</th>
                <th style={thStyle}>Telefon</th>
                <th style={thStyle}>Son İşlem</th>
                <th style={thStyle}>Toplam Harcama</th>
                <th style={thStyle}>Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#a0aec0', fontSize: '16px' }}>
                    Henüz müşteri eklenmemiş. &quot;+ Yeni Müşteri&quot; ile ilk müşterinizi ekleyin.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: '500', color: '#2d3748' }}>👤 {customer.name}</span>
                    </td>
                    <td style={{ ...tdStyle, color: '#718096' }}>{customer.phone || '—'}</td>
                    <td style={{ ...tdStyle, color: '#718096' }}>{customer.last_service_name || '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#2d3748' }}>
                      {customer.last_service_price != null
                        ? `${Number(customer.last_service_price).toLocaleString('tr-TR')} TL`
                        : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: '#718096' }}>{formatDate(customer.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Müşteri Ekle">
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Ad Soyad *
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Örn: Ayşe Yılmaz"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Telefon
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
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

const tdStyle: React.CSSProperties = {
  padding: '18px 25px',
  fontSize: '16px',
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
