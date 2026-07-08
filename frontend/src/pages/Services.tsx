import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import Modal from '../components/Modal';
import { API_BASE, SALON_ID } from '../config';

interface Service {
  id: number;
  name: string;
  category: string;
  duration_minutes: number;
  price: number | string;
  discounted_price: number | string | null;
  image_url: string;
  gallery_images: string[] | null;
  description: string | null;
  online_booking_enabled: boolean;
  is_active: boolean;
  salon_id: number;
  created_at: string;
}

const primaryBtn: CSSProperties = {
  backgroundColor: '#e52d6e',
  color: 'white',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '16px',
  flexShrink: 0,
};

const emptyForm = {
  name: '',
  category: '',
  price: '',
  discountedPrice: '',
  duration: '',
  description: '',
  onlineBooking: true,
  isActive: true,
};

function imageUrl(path: string) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

const actionBtnStyle: CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#fce7f3',
  color: '#e52d6e',
  cursor: 'pointer',
  fontSize: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
};

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState('');
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

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
    fetch(`${API_BASE}/service-categories`)
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() =>
        setCategories([
          'Saç Bakımı',
          'Cilt Bakımı',
          'Manikür & Pedikür',
          'Makyaj',
          'Epilasyon',
          'Masaj & SPA',
          'Kaş & Kirpik',
          'Lazer',
          'Diğer',
        ]),
      );
  }, [fetchServices]);

  const resetForm = () => {
    setForm(emptyForm);
    setMainImage(null);
    setMainImagePreview('');
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setError('');
  };

  const openModal = () => {
    resetForm();
    setEditingService(null);
    setModalOpen(true);
  };

  const openEditModal = (_service: Service) => {
    alert('Hizmet düzenleme özelliği yakında eklenecektir.');
    setModalOpen(true);
  };

  const handleMainImage = (file: File | null) => {
    setMainImage(file);
    if (file) {
      setMainImagePreview(URL.createObjectURL(file));
    } else {
      setMainImagePreview('');
    }
  };

  const handleGallery = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files);
    setGalleryFiles(list);
    setGalleryPreviews(list.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Sadece YENİ hizmet eklerken ana görselin zorunlu olmasını kontrol et
    if (!editingService && !mainImage) {
      setError('Hizmet görseli zorunludur');
      return;
    }

    setSubmitting(true);

    try {
      const body = new FormData();
      body.append('name', form.name.trim());
      body.append('category', form.category);
      body.append('price', form.price);
      body.append('duration_minutes', form.duration);
      body.append('salon_id', String(SALON_ID));
      body.append('online_booking_enabled', form.onlineBooking ? 'true' : 'false');
      body.append('is_active', form.isActive ? 'true' : 'false');
      if (mainImage) {
        body.append('image', mainImage);
      }

      if (form.discountedPrice) body.append('discounted_price', form.discountedPrice);
      if (form.description.trim()) body.append('description', form.description.trim());
      galleryFiles.forEach((file) => body.append('gallery', file));

      const res = await fetch(`${API_BASE}/services`, {
        method: 'POST',
        body,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Hizmet eklenemedi');
      }

      setModalOpen(false);
      resetForm();
      fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (service: Service, field: 'is_active' | 'online_booking_enabled') => {
    const newValue = !service[field];
    const body = { [field]: newValue };

    // Optimistic UI update
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, [field]: newValue } : s)));

    try {
      const res = await fetch(`${API_BASE}/services/${service.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Durum güncellenemedi');
    } catch (err) {
      // Rollback on error
      alert('Hata: Durum güncellenemedi. Değişiklikler geri alınıyor.');
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, [field]: service[field] } : s)));
    }
  };

  const handleDelete = async (serviceId: number) => {
    if (!window.confirm('Bu hizmeti kalıcı olarak silmek istediğinizden emin misiniz?')) return;

    try {
      const res = await fetch(`${API_BASE}/services/${serviceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Hizmet silinemedi');
      }
      fetchServices(); // Listeyi yenile
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Hizmet silinirken bir hata oluştu.');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1a202c' }}>Hizmetler</h1>
          <p style={{ margin: 0, color: '#718096', fontSize: '16px' }}>Salon hizmetlerinizi yönetin</p>
        </div>
        <button type="button" style={primaryBtn} onClick={openModal}>
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
            overflowX: 'auto',
            border: '1px solid #edf2f7',
            width: '100%',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc' }}>
                <th style={thStyle}>Görsel</th>
                <th style={thStyle}>Hizmet Adı</th>
                <th style={thStyle}>Kategori</th>
                <th style={thStyle}>Fiyat</th>
                <th style={thStyle}>İndirimli</th>
                <th style={thStyle}>Süre</th>
                <th style={thStyle}>Online Rezervasyon</th>
                <th style={thStyle}>Durum</th>
                <th style={thStyle}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#a0aec0', fontSize: '16px' }}>
                    Henüz hizmet eklenmemiş. &quot;+ Yeni Hizmet&quot; ile ekleyin.
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={tdStyle}>
                      {service.image_url ? (
                        <img
                          src={imageUrl(service.image_url)}
                          alt={service.name}
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid #edf2f7' }}
                        />
                      ) : (
                        <span style={{ color: '#cbd5e0' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: '600', color: '#2d3748' }}>{service.name}</td>
                    <td style={{ ...tdStyle, color: '#718096' }}>{service.category || '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#2d3748' }}>
                      {Number(service.price).toLocaleString('tr-TR')} TL
                    </td>
                    <td style={tdStyle}>
                      {service.discounted_price != null
                        ? `${Number(service.discounted_price).toLocaleString('tr-TR')} TL`
                        : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: '#718096' }}>{service.duration_minutes} dk</td>
                    <td style={tdStyle}>
                      <ToggleSwitch checked={service.online_booking_enabled} onChange={() => handleStatusToggle(service, 'online_booking_enabled')} />
                    </td>
                    <td style={tdStyle}>
                      <ToggleSwitch checked={service.is_active} onChange={() => handleStatusToggle(service, 'is_active')} />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(service)}
                          title="Düzenle"
                          style={actionBtnStyle}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(service.id)}
                          title="Sil"
                          style={{
                            ...actionBtnStyle,
                            color: '#c53030',
                            backgroundColor: '#fecdd3',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fbb6b6')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fecdd3')}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'} maxWidth={760}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label style={labelStyle}>
              Hizmet Adı *
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Örn: Protez Tırnak"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Kategori *
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
                style={inputStyle}
              >
                <option value="">Kategori seçin</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Fiyat (TL) *
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                min={0}
                step="0.01"
                placeholder="500"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              İndirimli Fiyat (TL)
              <input
                type="number"
                value={form.discountedPrice}
                onChange={(e) => setForm({ ...form, discountedPrice: e.target.value })}
                min={0}
                step="0.01"
                placeholder="Opsiyonel"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Süre (dk) *
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                required
                min={1}
                placeholder="60"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Hizmet Görseli *
              <input
                type="file" 
                accept="image/*"
                required
                onChange={(e) => handleMainImage(e.target.files?.[0] || null)}
                style={{ ...inputStyle, padding: '10px' }}
              />
            </label>
          </div>

          {mainImagePreview && (
            <img
              src={mainImagePreview}
              alt="Önizleme"
              style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 16, border: '1px solid #edf2f7' }}
            />
          )}

          <label style={labelStyle}>
            Galeri Fotoğrafları
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleGallery(e.target.files)}
              style={{ ...inputStyle, padding: '10px' }}
            />
          </label>

          {galleryPreviews.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {galleryPreviews.map((src, i) => (
                <img key={src} src={src} alt={`Galeri ${i + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          )}

          <label style={labelStyle}>
            Açıklama
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Hizmet hakkında kısa açıklama..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 8 }}>
            <label style={toggleLabelStyle}>
              <input
                type="checkbox"
                checked={form.onlineBooking}
                onChange={(e) => setForm({ ...form, onlineBooking: e.target.checked })}
              />
              Online Rezervasyona Açık mı?
            </label>

            <label style={toggleLabelStyle}>
              <span style={{ marginRight: 8 }}>Aktif / Pasif:</span>
              <select
                value={form.isActive ? 'active' : 'passive'}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
                style={{ ...inputStyle, padding: '8px 12px', flex: 1 }}
              >
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </label>
          </div>

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

const thStyle: CSSProperties = {
  padding: '16px 20px',
  color: '#4a5568',
  fontWeight: '600',
  fontSize: '13px',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '16px 20px',
  fontSize: '15px',
};

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '16px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#4a5568',
};

const toggleLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#4a5568',
  marginBottom: '16px',
};

const inputStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '16px',
  fontWeight: 'normal',
  color: '#2d3748',
  width: '100%',
  boxSizing: 'border-box',
};

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  const switchStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
  };

  const sliderStyle: CSSProperties = {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: checked ? '#e52d6e' : '#ccc',
    transition: '.4s',
    borderRadius: '34px',
  };

  const knobStyle: CSSProperties = {
    position: 'absolute',
    content: '""',
    height: '18px',
    width: '18px',
    left: '3px',
    bottom: '3px',
    backgroundColor: 'white',
    transition: '.4s',
    borderRadius: '50%',
    transform: checked ? 'translateX(20px)' : 'translateX(0)',
  };

  return (
    <label style={switchStyle}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={sliderStyle}>
        <span style={knobStyle} />
      </span>
    </label>
  );
}
