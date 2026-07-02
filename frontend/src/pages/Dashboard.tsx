import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import DashboardHeader, { type DashboardNotification } from '../components/DashboardHeader';
import Modal from '../components/Modal';
import RevenueChart from '../components/RevenueChart';
import { API_BASE, SALON_ID } from '../config';

interface Appointment {
  id: number;
  start_time: string;
  created_at?: string;
  customer_name: string;
  service_name: string;
  service_price: number | string;
  status: string;
  duration_minutes: number;
}
interface Customer {
  id: number;
  created_at: string;
}

interface MonthOption {
  key: string;
  label: string;
  year: number;
  month: number;
  total: number;
}

interface Salon {
  id: number;
  name: string;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  contact_email: string | null;
  address: string | null;
  social_media: { instagram?: string; facebook?: string } | null;
  working_hours: { [key: string]: { open: string; close: string; enabled: boolean } } | null;
  slot_duration_minutes: number;
  cancellation_policy_hours: number;
  billing_company_type: string | null;
  billing_tax_office: string | null;
  billing_tax_number: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  renewal_date: string | null;
  [key: string]: any; // for dynamic access
}

interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: string;
  profile_image_url?: string;
}

function cardStyle(accent?: string): CSSProperties {
  return {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '22px 24px',
    border: '1px solid #edf2f7',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    flex: 1,
    minWidth: '180px',
    ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
  };
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonth(date: Date, year: number, month: number) {
  return date.getFullYear() === year && date.getMonth() === month;
}

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salonSettings, setSalonSettings] = useState<Salon | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const monthMenuRef = useRef<HTMLDivElement>(null);
  const [revenueModalOpen, setRevenueModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isNewNotification, setIsNewNotification] = useState(false);
  const [apiHeaders, setApiHeaders] = useState({});
  const audioContextRef = useRef<AudioContext | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const token = localStorage.getItem('beautyflow_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/appointments?salon_id=${SALON_ID}`, { headers }).then((r) => r.ok ? r.json() : Promise.reject(r)),
      fetch(`${API_BASE}/customers?salon_id=${SALON_ID}`, { headers }).then((r) => r.ok ? r.json() : Promise.reject(r)),
      fetch(`${API_BASE}/salons/${SALON_ID}`, { headers }).then((r) => r.ok ? r.json() : Promise.reject(r)),
      fetch(`${API_BASE}/users/me`, { headers }).then((r) => r.ok ? r.json() : Promise.reject(r)),
    ])
      .then(([apptData, custData, salonData, userData]) => {
        setAppointments(apptData);
        setCustomers(custData);
        setSalonSettings(salonData);
        setCurrentUser(userData);
      })
      .catch((err) => {
        console.error('Dashboard verileri yüklenemedi:', err);
        if (err.status === 401) { // Eğer token geçersizse
          localStorage.removeItem('beautyflow_token');
          window.location.href = '/login';
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    const token = localStorage.getItem('beautyflow_token');
    if (token) {
      setApiHeaders({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' });
    }
    return () => clearInterval(interval);
  }, [fetchData]);

  // Tarayıcının ses çalma politikasını aşmak için ilk kullanıcı etkileşimini yakala
  useEffect(() => {
    const unlockAudio = () => {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          console.log('AudioContext başarıyla başlatıldı.');
        } catch (e) {
          console.error('AudioContext başlatılamadı:', e);
        }
      }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthMenuRef.current && !monthMenuRef.current.contains(e.target as Node)) {
        setMonthMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusChange = async (appointmentId: number, newStatus: 'confirmed' | 'completed') => {
    const confirmationMessage = newStatus === 'completed'
      ? "Bu randevunun tamamlandığını onaylıyor musunuz? Listeden kaldırılacaktır."
      : "Bu randevu onaylanacak. Onaylıyor musunuz?";

    if (!window.confirm(confirmationMessage)) return;
    try {
      const res = await fetch(`${API_BASE}/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: apiHeaders as HeadersInit,
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Randevu durumu güncellenemedi');

      // Optimistic update
      setAppointments((prev) =>
        prev.map((app) => (app.id === appointmentId ? { ...app, status: newStatus } : app)),
      );
    } catch (err) {
      console.error(err);
      alert('Randevu onaylanırken bir hata oluştu.');
    }
  };

  const now = new Date();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const completedAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'completed'),
    [appointments],
  );

  // Bugünkü randevular artık sadece "Onaylandı" (confirmed) durumundakileri gösterecek.
  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => isSameDay(new Date(a.start_time), today) && a.status === 'confirmed')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [appointments, today],
  );

  const monthCustomersCount = useMemo(
    () =>
      customers.filter((c) => isSameMonth(new Date(c.created_at), now.getFullYear(), now.getMonth())).length,
    [customers, now],
  );

  const todayRevenue = useMemo(
    () =>
      completedAppointments
        .filter((a) => isSameDay(new Date(a.start_time), today))
        .reduce((sum, a) => sum + Number(a.service_price), 0),
    [completedAppointments, today],
  );
  const totalAppointments = appointments.length;

  const monthOptions: MonthOption[] = useMemo(() => {
    const map = new Map<string, MonthOption>();

    completedAppointments.forEach((a) => {
      const d = new Date(a.start_time);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${month}`;
      const existing = map.get(key);
      const price = Number(a.service_price);
      if (existing) {
        existing.total += price;
      } else {
        map.set(key, {
          key,
          year,
          month,
          label: d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
          total: price,
        });
      }
    });

    const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
    if (!map.has(currentKey)) {
      map.set(currentKey, {
        key: currentKey,
        year: now.getFullYear(),
        month: now.getMonth(),
        label: now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
        total: 0,
      });
    }

    return Array.from(map.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  }, [completedAppointments, now]);

  const selectedMonthLabel =
    monthOptions.find((m) => m.year === selectedMonth.year && m.month === selectedMonth.month)?.label ||
    new Date(selectedMonth.year, selectedMonth.month).toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
    });

  const chartData = useMemo(() => {
    const daysInMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();
    const daily = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, revenue: 0 }));

    completedAppointments.forEach((a) => {
      const d = new Date(a.start_time);
      if (isSameMonth(d, selectedMonth.year, selectedMonth.month)) {
        daily[d.getDate() - 1].revenue += Number(a.service_price);
      }
    });

    return daily;
  }, [completedAppointments, selectedMonth]);

  const selectedMonthTotal = chartData.reduce((s, d) => s + d.revenue, 0);

  // --- GELİR RAPORU İÇİN VERİ İŞLEME ---
  const revenueByDay = useMemo(() => {
    const map = new Map<string, { date: Date; total: number }>();
    completedAppointments.forEach((a) => {
      const d = new Date(a.start_time);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split('T')[0];
      const price = Number(a.service_price);
      const existing = map.get(key);
      if (existing) {
        existing.total += price;
      } else {
        map.set(key, { date: d, total: price });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [completedAppointments]);

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, { label: string; year: number; month: number; total: number }>();
    completedAppointments.forEach((a) => {
      const d = new Date(a.start_time);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${month}`;
      const price = Number(a.service_price);
      const existing = map.get(key);
      if (existing) {
        existing.total += price;
      } else {
        map.set(key, {
          label: d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
          year,
          month,
          total: price,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  }, [completedAppointments]);

  const revenueByYear = useMemo(() => {
    const map = new Map<number, number>();
    completedAppointments.forEach((a) => {
      const year = new Date(a.start_time).getFullYear();
      const price = Number(a.service_price);
      map.set(year, (map.get(year) || 0) + price);
    });
    return Array.from(map.entries())
      .map(([year, total]) => ({ year, total }))
      .sort((a, b) => b.year - a.year);
  }, [completedAppointments]);
  // --- GELİR RAPORU SONU ---

  const recentNotifications: DashboardNotification[] = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return appointments
      .filter((a) => {
        const created = a.created_at ? new Date(a.created_at).getTime() : 0;
        return created >= weekAgo;
      })
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        customer_name: a.customer_name,
        service_name: a.service_name,
        start_time: a.start_time,
        status: a.status,
        created_at: a.created_at!,
      }));
  }, [appointments]);

  const unreadCount = recentNotifications.filter((n) => n.status === 'pending').length;

  // --- YENİ BİLDİRİM SESİ VE ANİMASYONU ---
  const prevUnreadCount = useRef(unreadCount);
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current && !loading) {
      // Eğer AudioContext başlatıldıysa, sesi çal
      if (audioContextRef.current && audioContextRef.current.state !== 'suspended') {
        fetch('/notification.mp3')
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => audioContextRef.current!.decodeAudioData(arrayBuffer))
          .then(audioBuffer => {
            const source = audioContextRef.current!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current!.destination);
            source.start(0);
          })
          .catch(e => console.error("Ses dosyası işlenirken hata oluştu:", e));
      } else {
        // Fallback (nadiren gerekli)
        new Audio('/notification.mp3').play().catch(() => {});
      }

      setIsNewNotification(true);
      setTimeout(() => {
        setIsNewNotification(false);
      }, 3000); // Animasyon 3 saniye sürsün
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, loading]);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const kpiCards = [
    { id: 'today_appts', label: 'Bugünkü Randevular', value: todayAppointments.length, accent: '#e52d6e', icon: '📅' },
    { id: 'month_cust', label: 'Bu Ayki Yeni Müşteri', value: monthCustomersCount, accent: '#805ad5', icon: '👥' },
    {
      id: 'today_revenue',
      label: 'Bugünkü Gelir',
      value: `${todayRevenue.toLocaleString('tr-TR')} TL`,
      accent: '#38a169',
      icon: '💰',
      onClick: () => setRevenueModalOpen(true),
    },
    { id: 'total_appts', label: 'Toplam Randevu', value: totalAppointments, accent: '#3182ce', icon: '📋' },
  ];

  if (loading) {
    return <p style={{ color: '#718096' }}>Kontrol paneli yükleniyor...</p>;
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1a202c' }}>Kontrol Paneli</h1>
          <p style={{ margin: '6px 0 0', color: '#718096', fontSize: '16px' }}>
            {now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <DashboardHeader
          notifications={recentNotifications}
          unreadCount={unreadCount}
          onConfirm={(id) => handleStatusChange(id, 'confirmed')}
          isNewNotification={isNewNotification}
          onProfileClick={() => setProfileModalOpen(true)}
          user={currentUser}
        />
      </div>

      {/* KPI Kutuları */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {kpiCards.map(({ id, ...kpi }) => (
          <div
            key={id}
            style={{ ...cardStyle(kpi.accent), cursor: kpi.onClick ? 'pointer' : 'default' }}
            onClick={kpi.onClick}
            role={kpi.onClick ? 'button' : undefined}
            tabIndex={kpi.onClick ? 0 : undefined}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: '#718096', fontWeight: '600', textTransform: 'uppercase' }}>
                {kpi.label}
              </span>
              <span style={{ fontSize: '22px' }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a202c', marginTop: '12px' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Alt bölüm: Bugünkü randevular + Gelir grafiği */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* Sol: Bugünkü randevular */}
        <div
          style={{
            flex: '1 1 380px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #edf2f7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 'bold', color: '#1a202c' }}>
            Bugünkü Randevular
          </h2>

          {todayAppointments.length === 0 ? (
            <p style={{ color: '#a0aec0', fontSize: '15px', flex: 1 }}>Bugün için planlanmış randevu yok.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {todayAppointments.map((appt) => (
                <div
                  key={appt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    backgroundColor: '#f7fafc',
                    borderRadius: '10px',
                    border: '1px solid #edf2f7',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#fce7f3',
                      color: '#e52d6e',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      minWidth: '58px',
                      textAlign: 'center',
                    }}
                  >
                    {formatTime(appt.start_time)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '15px' }}>{appt.customer_name}</div>
                    <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
                      {appt.service_name} · {appt.duration_minutes} dk
                    </div>
                  </div>

                  {/* YENİ: ONAYLA VE TAMAMLA BUTONU */}
                  <div>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(appt.id, 'completed')}
                      style={{
                        backgroundColor: '#48bb78',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#38a169')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#48bb78')}
                      title="Randevuyu Tamamlandı Olarak İşaretle"
                    >
                      ✓ Tamamla
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

          <Link
            to="/appointments"
            style={{
              display: 'inline-block',
              marginTop: '20px',
              color: '#e52d6e',
              fontWeight: '600',
              fontSize: '15px',
              textDecoration: 'none',
            }}
          >
            Tüm randevuları gör →
          </Link>
        </div>

        {/* Sağ: Gelir özeti grafiği */}
        <div
          style={{
            flex: '1 1 340px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #edf2f7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: '24px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1a202c' }}>Aylık Gelir Dağılımı</h2>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#718096' }}>Seçili ayın günlük gelir dökümü</p>
            </div>

            <div ref={monthMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setMonthMenuOpen(!monthMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#4a5568',
                }}
              >
                {selectedMonthLabel}
                <span style={{ fontSize: '10px' }}>▼</span>
              </button>

              {monthMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    width: '220px',
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    border: '1px solid #edf2f7',
                    zIndex: 50,
                    maxHeight: '240px',
                    overflowY: 'auto',
                  }}
                >
                  {monthOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSelectedMonth({ year: opt.year, month: opt.month });
                        setMonthMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        border: 'none',
                        borderBottom: '1px solid #f7fafc',
                        background:
                          opt.year === selectedMonth.year && opt.month === selectedMonth.month
                            ? '#fdf2f8'
                            : 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ color: '#2d3748', fontWeight: '500', textTransform: 'capitalize' }}>
                        {opt.label}
                      </span>
                      <span style={{ color: '#e52d6e', fontWeight: 'bold', fontSize: '12px' }}>
                        {opt.total.toLocaleString('tr-TR')} TL
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1a202c',
              marginBottom: '8px',
            }}
          >
            {selectedMonthTotal.toLocaleString('tr-TR')} TL
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#a0aec0' }}>
            {selectedMonthLabel} ayındaki toplam gelir (tamamlananlardan)
          </p>

          <RevenueChart data={chartData} />
        </div>
      </div>

      <RevenueReportModal
        open={revenueModalOpen}
        onClose={() => setRevenueModalOpen(false)}
        daily={revenueByDay}
        monthly={revenueByMonth}
        yearly={revenueByYear}
      />

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        salon={salonSettings}
        user={currentUser}
        onUpdate={fetchData} />
    </div>
  );
}

function RevenueReportModal({ open, onClose, daily, monthly, yearly }: RevenueReportModalProps) {
  const [activeTab, setActiveTab] = useState<'day' | 'month' | 'year'>('day');

  const tabStyle = (isActive: boolean): CSSProperties => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: `3px solid ${isActive ? '#e52d6e' : 'transparent'}`,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: isActive ? 'bold' : '500',
    color: isActive ? '#e52d6e' : '#4a5568',
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'day':
        return (
          <>
            {daily.length === 0 ? <p style={reportEmptyStyle}>Veri yok.</p> : null}
            {daily.map(({ date, total }) => (
              <div key={date.toISOString()} style={reportRowStyle}>
                <span>{date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' })}</span>
                <span style={reportTotalStyle}>{total.toLocaleString('tr-TR')} TL</span>
              </div>
            ))}
          </>
        );
      case 'month':
        return (
          <>
            {monthly.length === 0 ? <p style={reportEmptyStyle}>Veri yok.</p> : null}
            {monthly.map(({ label, total }) => (
              <div key={label} style={reportRowStyle}>
                <span style={{ textTransform: 'capitalize' }}>{label}</span>
                <span style={reportTotalStyle}>{total.toLocaleString('tr-TR')} TL</span>
              </div>
            ))}
          </>
        );
      case 'year':
        return (
          <>
            {yearly.length === 0 ? <p style={reportEmptyStyle}>Veri yok.</p> : null}
            {yearly.map(({ year, total }) => (
              <div key={year} style={reportRowStyle}>
                <span>{year} Yılı</span>
                <span style={reportTotalStyle}>{total.toLocaleString('tr-TR')} TL</span>
              </div>
            ))}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Gelir Raporu" maxWidth={600}>
      <div>
        <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <button type="button" style={tabStyle(activeTab === 'day')} onClick={() => setActiveTab('day')}>
            Günlük
          </button>
          <button type="button" style={tabStyle(activeTab === 'month')} onClick={() => setActiveTab('month')}>
            Aylık
          </button>
          <button type="button" style={tabStyle(activeTab === 'year')} onClick={() => setActiveTab('year')}>
            Yıllık
          </button>
        </div>
        <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '10px' }}>
          {renderContent()}
        </div>
      </div>
    </Modal>
  );
}

const reportRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 8px',
  borderBottom: '1px solid #f7fafc',
  fontSize: '15px',
  color: '#4a5568',
};

const reportTotalStyle: CSSProperties = {
  fontWeight: 'bold',
  color: '#1a202c',
  backgroundColor: '#f0fff4',
  padding: '4px 8px',
  borderRadius: '6px',
};

const reportEmptyStyle: CSSProperties = {
  textAlign: 'center',
  padding: '30px',
  color: '#a0aec0',
};

interface RevenueReportModalProps {
  open: boolean;
  onClose: () => void;
  daily: { date: Date; total: number }[];
  monthly: { label: string; total: number }[];
  yearly: { year: number; total: number }[];
}

interface RevenueReportModalProps {
  open: boolean;
  onClose: () => void;
  daily: { date: Date; total: number }[];
  monthly: { label: string; total: number }[];
  yearly: { year: number; total: number }[];
}

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  salon: Salon | null;
  user: CurrentUser | null;
  onUpdate: () => void;
}

const WEEK_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function ProfileModal({ open, onClose, salon, user, onUpdate }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'salon' | 'rules' | 'subscription'>('profile');
  const [formState, setFormState] = useState<Partial<Salon>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (salon && open) {
      const initialWorkingHours = salon.working_hours || {};
      const workingHours: Salon['working_hours'] = {};
      DAY_KEYS.forEach((key) => {
        workingHours[key] = initialWorkingHours[key] || { open: '09:00', close: '20:00', enabled: key !== 'sunday' };
      });

      setFormState({
        ...salon,
        working_hours: workingHours,
        social_media: salon.social_media || { instagram: '', facebook: '' },
      });
    }
  }, [salon, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (parent: keyof Salon, child: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as object),
        [child]: value,
      },
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    if (formData.get('new_password') && formData.get('new_password') !== formData.get('new_password_confirm')) {
      alert("Yeni şifreler eşleşmiyor!");
      setSubmitting(false);
      return;
    }

    // Onaylama şifresini FormData'dan kaldır
    formData.delete('new_password_confirm');

    try {
      const token = localStorage.getItem('beautyflow_token');
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }, // Content-Type'ı tarayıcı FormData için kendi belirler
        body: formData,
      });
      if (!res.ok) throw new Error('Profil güncellenemedi.');
      alert('Profil bilgileri başarıyla güncellendi!');
      onUpdate();
      onClose();
    } catch (err) { alert(err instanceof Error ? err.message : 'Bir hata oluştu.'); } finally { setSubmitting(false); }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('beautyflow_token');
      const res = await fetch(`${API_BASE}/salons/${SALON_ID}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(formState) });
      if (!res.ok) throw new Error('Ayarlar güncellenemedi.');
      alert('Ayarlar başarıyla güncellendi!');
      onUpdate();
      onClose();
    } catch (err) { alert(err instanceof Error ? err.message : 'Bir hata oluştu.'); } finally { setSubmitting(false); }
  };

  const tabStyle = (isActive: boolean): CSSProperties => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: `3px solid ${isActive ? '#e52d6e' : 'transparent'}`,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: isActive ? 'bold' : '500',
    color: isActive ? '#e52d6e' : '#4a5568',
    marginBottom: '-1px',
  });

  return (
    <Modal open={open} onClose={onClose} title="Ayarlar" maxWidth={720}>
      <div>
        <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <button type="button" style={tabStyle(activeTab === 'profile')} onClick={() => setActiveTab('profile')}>
            Profil ve Güvenlik
          </button>
          <button type="button" style={tabStyle(activeTab === 'salon')} onClick={() => setActiveTab('salon')}>
            Salon Ayarları
          </button>
          <button type="button" style={tabStyle(activeTab === 'rules')} onClick={() => setActiveTab('rules')}>
            Çalışma & Rezervasyon
          </button>
          <button type="button" style={tabStyle(activeTab === 'subscription')} onClick={() => setActiveTab('subscription')}>
            Finans & Abonelik
          </button>
        </div>

        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit}>
            <h3 style={profileSectionTitleStyle}>Kişisel Bilgiler</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={profileLabelStyle}>
                Ad Soyadı
                <input type="text" name="name" style={profileInputStyle} defaultValue={user?.name} />
              </label>
              <label style={profileLabelStyle}>
                Telefon Numarası
                <input type="tel" name="phone" style={profileInputStyle} placeholder="05XX XXX XX XX" />
              </label>
            </div>
            <label style={profileLabelStyle}>
              E-posta Adresi
              <input type="email" name="email" style={profileInputStyle} defaultValue={user?.email} />
            </label>
            <label style={profileLabelStyle}>
              Profil Fotoğrafı
              <input type="file" name="profile_image" accept="image/*" style={{ ...profileInputStyle, padding: '10px' }} />
            </label>

            <hr style={{ border: 'none', borderTop: '1px solid #edf2f7', margin: '28px 0' }} />

            <h3 style={profileSectionTitleStyle}>Şifre Değiştir</h3>
            <label style={profileLabelStyle}>
              Mevcut Şifre
              <input type="password" name="current_password" style={profileInputStyle} placeholder="Değiştirmek için doldurun" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={profileLabelStyle}>
                Yeni Şifre
                <input type="password" name="new_password" style={profileInputStyle} placeholder="••••••••" />
              </label>
              <label style={profileLabelStyle}>
                Yeni Şifre (Tekrar)
                <input type="password" name="new_password_confirm" style={profileInputStyle} placeholder="••••••••" />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="submit" style={{...profileSubmitBtnStyle, opacity: submitting ? 0.7 : 1}} disabled={submitting}>
                {submitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'salon' && (
          <form onSubmit={handleSettingsSubmit}>
            <h3 style={profileSectionTitleStyle}>Salon / İşletme Bilgileri</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={profileLabelStyle}>
                Salon Adı
                <input type="text" name="name" value={formState.name || ''} onChange={handleInputChange} style={profileInputStyle} />
              </label>
              <label style={profileLabelStyle}>
                Salon Logosu
                <input type="file" accept="image/*" style={{ ...profileInputStyle, padding: '10px' }} />
              </label>
            </div>
            <label style={profileLabelStyle}>
              Salon Mottosu / Kısa Açıklama
              <textarea
                rows={2}
                name="description"
                value={formState.description || ''}
                onChange={handleInputChange}
                style={{ ...profileInputStyle, resize: 'vertical' }}
                placeholder="Müşteri rezervasyon sayfasında görünecek tanıtım yazısı"
              />
            </label>

            <hr style={{ border: 'none', borderTop: '1px solid #edf2f7', margin: '28px 0' }} />

            <h3 style={profileSectionTitleStyle}>İletişim ve Konum</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={profileLabelStyle}>
                İletişim Telefonu
                <input type="tel" name="phone" value={formState.phone || ''} onChange={handleInputChange} style={profileInputStyle} placeholder="0212 XXX XX XX" />
              </label>
              <label style={profileLabelStyle}>
                İletişim E-postası
                <input type="email" name="contact_email" value={formState.contact_email || ''} onChange={handleInputChange} style={profileInputStyle} placeholder="info@isletme.com" />
              </label>
            </div>
            <label style={profileLabelStyle}>
              Açık Adres
              <textarea rows={3} name="address" value={formState.address || ''} onChange={handleInputChange} style={{ ...profileInputStyle, resize: 'vertical' }} placeholder="Mahalle, Cadde, No, İlçe/İl" />
            </label>

            <hr style={{ border: 'none', borderTop: '1px solid #edf2f7', margin: '28px 0' }} />

            <h3 style={profileSectionTitleStyle}>Sosyal Medya</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={profileLabelStyle}>
                Instagram Linki
                <input type="url" value={formState.social_media?.instagram || ''} onChange={(e) => handleNestedChange('social_media', 'instagram', e.target.value)} style={profileInputStyle} placeholder="https://instagram.com/kullaniciadi" />
              </label>
              <label style={profileLabelStyle}>
                Facebook Linki
                <input type="url" value={formState.social_media?.facebook || ''} onChange={(e) => handleNestedChange('social_media', 'facebook', e.target.value)} style={profileInputStyle} placeholder="https://facebook.com/sayfaadi" />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="submit" style={{...profileSubmitBtnStyle, opacity: submitting ? 0.7 : 1}} disabled={submitting}>
                {submitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'rules' && (
          <form onSubmit={handleSettingsSubmit}>
            <h3 style={profileSectionTitleStyle}>Haftalık Çalışma Saatleri</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {WEEK_DAYS.map((day, i) => {
                const dayKey = DAY_KEYS[i];
                const dayData = formState.working_hours?.[dayKey];
                if (!dayData) return null;
                return (
                <div key={dayKey} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ flex: '0 0 120px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#4a5568', fontSize: '14px' }}>
                    <input type="checkbox" checked={dayData.enabled} onChange={(e) => handleNestedChange('working_hours', dayKey, { ...dayData, enabled: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                    {day}
                  </label>
                  <input type="time" value={dayData.open} disabled={!dayData.enabled} onChange={(e) => handleNestedChange('working_hours', dayKey, { ...dayData, open: e.target.value })} style={{ ...profileInputStyle, flex: 1 }} />
                  <span style={{ color: '#a0aec0' }}>-</span>
                  <input type="time" value={dayData.close} disabled={!dayData.enabled} onChange={(e) => handleNestedChange('working_hours', dayKey, { ...dayData, close: e.target.value })} style={{ ...profileInputStyle, flex: 1 }} />
                </div>
              )})}
            </div>

            <h3 style={profileSectionTitleStyle}>Rezervasyon Kuralları</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={profileLabelStyle}>
                Randevu Aralığı (Slot Süresi)
                <select name="slot_duration_minutes" value={formState.slot_duration_minutes || 30} onChange={handleInputChange} style={profileInputStyle}>
                  <option value="15">15 dakika</option>
                  <option value="30">30 dakika</option>
                  <option value="45">45 dakika</option>
                  <option value="60">60 dakika</option>
                </select>
              </label>
              <label style={profileLabelStyle}>
                İptal Politikası (Saat)
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#718096' }}>Son</span>
                  <input
                    type="number" name="cancellation_policy_hours"
                    value={formState.cancellation_policy_hours || 2}
                    onChange={handleInputChange}
                    min="0"
                    style={{ ...profileInputStyle, textAlign: 'center', width: '60px' }}
                  />
                  <span style={{ fontSize: '13px', color: '#718096' }}>saat kala iptal edilemez.</span>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="submit" style={{...profileSubmitBtnStyle, opacity: submitting ? 0.7 : 1}} disabled={submitting}>
                {submitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'subscription' && (
          <form onSubmit={handleSettingsSubmit}>
            <h3 style={profileSectionTitleStyle}>Abonelik Bilgileri</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f7fafc', padding: '16px', borderRadius: '8px', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#718096' }}>Mevcut Paket</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e52d6e', textTransform: 'capitalize' }}>
                  {formState.plan_name || 'Standart'} Plan 🌟
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#718096', textAlign: 'right' }}>Sonraki Yenilenme</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                  {formState.renewal_date ? new Date(formState.renewal_date).toLocaleDateString('tr-TR') : 'N/A'}
                </div>
              </div>
            </div>

            <h3 style={profileSectionTitleStyle}>Fatura Bilgileri</h3>
            <label style={profileLabelStyle}>
              Şirket Türü
              <select name="billing_company_type" value={formState.billing_company_type || ''} onChange={handleInputChange} style={profileInputStyle}>
                <option value="">Seçiniz...</option>
                <option value="individual">Şahıs Şirketi</option>
                <option value="limited">Limited Şirket (LTD)</option>
                <option value="corporate">Anonim Şirket (A.Ş.)</option>
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={profileLabelStyle}>
                Vergi Dairesi
                <input type="text" name="billing_tax_office" value={formState.billing_tax_office || ''} onChange={handleInputChange} style={profileInputStyle} placeholder="Örn: Beşiktaş V.D." />
              </label>
              <label style={profileLabelStyle}>
                Vergi Numarası / T.C. Kimlik No
                <input type="text" name="billing_tax_number" value={formState.billing_tax_number || ''} onChange={handleInputChange} style={profileInputStyle} placeholder="10 veya 11 haneli numara" />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="submit"
                style={{
                  ...profileSubmitBtnStyle, opacity: submitting ? 0.7 : 1
                }}
                disabled={submitting}
              >
                {submitting ? 'Kaydediliyor...' : 'Fatura Bilgilerini Güncelle'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

const profileLabelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '16px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#4a5568',
};

const profileInputStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '16px',
  color: '#2d3748',
  backgroundColor: 'white',
};

const profileSubmitBtnStyle: CSSProperties = {
  backgroundColor: '#e52d6e',
  color: 'white',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '15px',
};

const profileSectionTitleStyle: CSSProperties = {
  margin: '0 0 16px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1a202c',
  borderBottom: '1px solid #f0f2f5',
  paddingBottom: '8px',
};
