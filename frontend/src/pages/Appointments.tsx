import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Modal from '../components/Modal';
import { API_BASE, SALON_ID } from '../config';

interface Appointment {
  id: number;
  start_time: string;
  status: string;
  employee_id: number | null;
  salon_id: number;
  customer_name: string;
  customer_phone: string | null;
  service_name: string;
  service_price: number | string;
  duration_minutes: number;
}

interface CustomerOption {
  id: number;
  name: string;
}

interface ServiceOption {
  id: number;
  name: string;
  duration_minutes: number;
  price: number | string;
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

const statusLabels: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Bekliyor', bg: '#fef3c7', color: '#92400e' },
  confirmed: { label: 'Onaylandı', bg: '#d1fae5', color: '#065f46' },
  completed: { label: 'Tamamlandı', bg: '#dbeafe', color: '#1e40af' },
  cancelled: { label: 'İptal', bg: '#fee2e2', color: '#991b1b' },
};

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [startTime, setStartTime] = useState('');

  const fetchAppointments = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/appointments?salon_id=${SALON_ID}`)
      .then((res) => res.json())
      .then((data) => setAppointments(data))
      .catch((err) => console.error('Randevular çekilirken hata:', err))
      .finally(() => setLoading(false));
  }, []);

  const fetchOptions = useCallback(() => {
    Promise.all([
      fetch(`${API_BASE}/customers?salon_id=${SALON_ID}`).then((r) => r.json()),
      fetch(`${API_BASE}/services?salon_id=${SALON_ID}`).then((r) => r.json()),
    ]).then(([custData, svcData]) => {
      setCustomers(custData);
      setServices(svcData);
    });
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchOptions();
  }, [fetchAppointments, fetchOptions]);

  const openModal = () => {
    setError('');
    setCustomerId('');
    setServiceId('');
    setStartTime('');
    fetchOptions();
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: Number(customerId),
          service_id: Number(serviceId),
          start_time: new Date(startTime).toISOString(),
          salon_id: SALON_ID,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Randevu oluşturulamadı');
      }

      setModalOpen(false);
      fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const info = statusLabels[status] || { label: status, bg: '#f3f4f6', color: '#374151' };
    return (
      <span
        style={{
          backgroundColor: info.bg,
          color: info.color,
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '13px',
          fontWeight: '600',
        }}
      >
        {info.label}
      </span>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1a202c' }}>Randevular</h1>
          <p style={{ margin: 0, color: '#718096', fontSize: '16px' }}>Salon randevu takviminiz</p>
        </div>
        <button type="button" style={primaryBtn} onClick={openModal}>
          + Yeni Randevu
        </button>
      </div>

      {loading ? (
        <p>Randevular yükleniyor...</p>
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
                <th style={thStyle}>Tarih & Saat</th>
                <th style={thStyle}>Müşteri</th>
                <th style={thStyle}>Hizmet</th>
                <th style={thStyle}>Süre</th>
                <th style={thStyle}>Fiyat</th>
                <th style={thStyle}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#a0aec0', fontSize: '16px' }}>
                    Henüz randevu yok. &quot;+ Yeni Randevu&quot; ile ilk randevunuzu oluşturun.
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr key={appt.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ ...tdStyle, fontWeight: '500', color: '#2d3748' }}>
                      📅 {formatDateTime(appt.start_time)}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '500', color: '#2d3748' }}>{appt.customer_name || '—'}</div>
                      {appt.customer_phone && (
                        <div style={{ fontSize: '13px', color: '#718096' }}>{appt.customer_phone}</div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#2d3748' }}>✨ {appt.service_name || '—'}</td>
                    <td style={{ ...tdStyle, color: '#718096' }}>{appt.duration_minutes} dk</td>
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#2d3748' }}>
                      {Number(appt.service_price).toLocaleString('tr-TR')} TL
                    </td>
                    <td style={tdStyle}>{getStatusBadge(appt.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Randevu Oluştur">
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Müşteri *
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">Müşteri seçin</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {customers.length === 0 && (
            <p style={{ color: '#d69e2e', fontSize: '13px', marginTop: '-8px', marginBottom: '12px' }}>
              Önce Müşteriler sayfasından en az bir müşteri ekleyin.
            </p>
          )}

          <label style={labelStyle}>
            Hizmet *
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">Hizmet seçin</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.duration_minutes} dk — {Number(s.price).toLocaleString('tr-TR')} TL
                </option>
              ))}
            </select>
          </label>
          {services.length === 0 && (
            <p style={{ color: '#d69e2e', fontSize: '13px', marginTop: '-8px', marginBottom: '12px' }}>
              Önce Hizmetler sayfasından en az bir hizmet ekleyin.
            </p>
          )}

          <label style={labelStyle}>
            Tarih & Saat *
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
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
            <button
              type="submit"
              disabled={submitting || customers.length === 0 || services.length === 0}
              style={{
                ...primaryBtn,
                opacity: submitting || customers.length === 0 || services.length === 0 ? 0.7 : 1,
              }}
            >
              {submitting ? 'Kaydediliyor...' : 'Randevu Oluştur'}
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
  backgroundColor: 'white',
};
