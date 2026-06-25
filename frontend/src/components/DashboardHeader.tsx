import { useEffect, useRef, useState } from 'react';
import { SALON_NAME, SALON_OWNER } from '../config';

export interface DashboardNotification {
  id: number;
  customer_name: string;
  service_name: string;
  start_time: string;
  created_at: string;
}

interface DashboardHeaderProps {
  notifications: DashboardNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
}

export default function DashboardHeader({ notifications, unreadCount, onMarkAllRead }: DashboardHeaderProps) {
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleBell = () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next) onMarkAllRead();
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
      <div ref={bellRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={toggleBell}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            border: '1px solid #edf2f7',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                backgroundColor: '#e52d6e',
                color: 'white',
                fontSize: '11px',
                fontWeight: 'bold',
                minWidth: '18px',
                height: '18px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {bellOpen && (
          <div
            style={{
              position: 'absolute',
              top: '52px',
              right: 0,
              width: '320px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
              border: '1px solid #edf2f7',
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #edf2f7',
                fontWeight: 'bold',
                color: '#1a202c',
                fontSize: '15px',
              }}
            >
              Yeni Randevu Bildirimleri
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <p style={{ padding: '20px 16px', color: '#a0aec0', fontSize: '14px', margin: 0 }}>
                  Yeni bildirim yok
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f7fafc',
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px' }}>
                      {n.customer_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
                      {n.service_name} · {formatTime(n.start_time)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'white',
          border: '1px solid #edf2f7',
          borderRadius: '12px',
          padding: '8px 16px 8px 8px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#fce7f3',
            color: '#e52d6e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          {SALON_OWNER.charAt(0)}
        </div>
        <div>
          <div style={{ fontWeight: 'bold', color: '#1a202c', fontSize: '14px' }}>{SALON_OWNER}</div>
          <div style={{ fontSize: '12px', color: '#718096' }}>Salon Sahibi · {SALON_NAME}</div>
        </div>
      </div>
    </div>
  );
}
