import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import DashboardHeader, { type DashboardNotification } from '../components/DashboardHeader';
import { API_BASE, SALON_ID } from '../config';

interface Appointment {
  id: number;
  start_time: string;
  created_at?: string;
  status: string;
  customer_name: string;
  service_name: string;
  service_price: number | string;
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

const READ_KEY = 'beautyflow_read_notifications';

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonth(date: Date, year: number, month: number) {
  return date.getFullYear() === year && date.getMonth() === month;
}

function getReadIds(): number[] {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveReadIds(ids: number[]) {
  localStorage.setItem(READ_KEY, JSON.stringify(ids));
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

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<number[]>(getReadIds);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const monthMenuRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/appointments?salon_id=${SALON_ID}`).then((r) => r.json()),
      fetch(`${API_BASE}/customers?salon_id=${SALON_ID}`).then((r) => r.json()),
    ])
      .then(([apptData, custData]) => {
        setAppointments(apptData);
        setCustomers(custData);
      })
      .catch((err) => console.error('Dashboard verileri yüklenemedi:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthMenuRef.current && !monthMenuRef.current.contains(e.target as Node)) {
        setMonthMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const now = new Date();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const activeAppointments = useMemo(
    () => appointments.filter((a) => a.status !== 'cancelled'),
    [appointments],
  );

  const todayAppointments = useMemo(
    () =>
      activeAppointments
        .filter((a) => isSameDay(new Date(a.start_time), today))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [activeAppointments, today],
  );

  const monthCustomersCount = useMemo(
    () =>
      customers.filter((c) => isSameMonth(new Date(c.created_at), now.getFullYear(), now.getMonth())).length,
    [customers, now],
  );

  const monthRevenue = useMemo(
    () =>
      activeAppointments
        .filter((a) => isSameMonth(new Date(a.start_time), now.getFullYear(), now.getMonth()))
        .reduce((sum, a) => sum + Number(a.service_price), 0),
    [activeAppointments, now],
  );

  const totalAppointments = appointments.length;

  const monthOptions: MonthOption[] = useMemo(() => {
    const map = new Map<string, MonthOption>();

    activeAppointments.forEach((a) => {
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
  }, [activeAppointments, now]);

  const selectedMonthLabel =
    monthOptions.find((m) => m.year === selectedMonth.year && m.month === selectedMonth.month)?.label ||
    new Date(selectedMonth.year, selectedMonth.month).toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
    });

  const chartData = useMemo(() => {
    const daysInMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();
    const daily = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, revenue: 0 }));

    activeAppointments.forEach((a) => {
      const d = new Date(a.start_time);
      if (isSameMonth(d, selectedMonth.year, selectedMonth.month)) {
        daily[d.getDate() - 1].revenue += Number(a.service_price);
      }
    });

    return daily;
  }, [activeAppointments, selectedMonth]);

  const chartMax = Math.max(...chartData.map((d) => d.revenue), 1);

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
        created_at: a.created_at!,
      }));
  }, [appointments]);

  const unreadCount = recentNotifications.filter((n) => !readIds.includes(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = recentNotifications.map((n) => n.id);
    const merged = [...new Set([...readIds, ...allIds])];
    setReadIds(merged);
    saveReadIds(merged);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const kpiCards = [
    { label: 'Bugünkü Randevular', value: todayAppointments.length, accent: '#e52d6e', icon: '📅' },
    { label: 'Bu Ayki Müşteri', value: monthCustomersCount, accent: '#805ad5', icon: '👥' },
    {
      label: 'Bu Ay Gelir',
      value: `${monthRevenue.toLocaleString('tr-TR')} TL`,
      accent: '#38a169',
      icon: '💰',
    },
    { label: 'Toplam Randevu', value: totalAppointments, accent: '#3182ce', icon: '📋' },
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
          onMarkAllRead={handleMarkAllRead}
        />
      </div>

      {/* KPI Kutuları */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {kpiCards.map((kpi) => (
          <div key={kpi.label} style={cardStyle(kpi.accent)}>
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1a202c' }}>Gelir Özeti</h2>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#718096' }}>{selectedMonthLabel}</p>
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
              marginBottom: '20px',
            }}
          >
            {chartData.reduce((s, d) => s + d.revenue, 0).toLocaleString('tr-TR')} TL
          </div>

          {/* Bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '140px' }}>
            {chartData.map((d) => {
              const heightPct = (d.revenue / chartMax) * 100;
              return (
                <div
                  key={d.day}
                  title={`${d.day}. gün: ${d.revenue.toLocaleString('tr-TR')} TL`}
                  style={{
                    flex: 1,
                    height: `${Math.max(heightPct, d.revenue > 0 ? 4 : 0)}%`,
                    backgroundColor: d.revenue > 0 ? '#e52d6e' : '#edf2f7',
                    borderRadius: '3px 3px 0 0',
                    minWidth: '4px',
                    transition: 'height 0.3s ease',
                    opacity: d.revenue > 0 ? 0.85 : 0.4,
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#a0aec0' }}>
            <span>1</span>
            <span>{chartData.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
