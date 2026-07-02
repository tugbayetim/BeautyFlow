import { useEffect, useRef, useState } from 'react';
import { API_BASE, SALON_NAME } from '../config';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  profile_image_url?: string;
}

export interface DashboardNotification {
  id: number;
  customer_name: string;
  service_name: string;
  start_time: string;
  status: string;
  created_at: string;
}

interface DashboardHeaderProps {
  notifications: DashboardNotification[];
  unreadCount: number;
  onConfirm: (id: number) => void;
  isNewNotification: boolean;
  onProfileClick: () => void;
  user: User | null;
}

export default function DashboardHeader({ notifications, unreadCount, onConfirm, isNewNotification, onProfileClick, user }: DashboardHeaderProps) {
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
    setBellOpen((prev) => !prev);
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
      <style>
        {`
          @keyframes bell-ring {
            0%, 100% { transform: rotate(0); }
            10%, 30%, 50%, 70%, 90% { transform: rotate(18deg); }
            20%, 40%, 60%, 80% { transform: rotate(-18deg); }
          }
          .bell-animation {
            animation: bell-ring 0.8s ease-in-out;
            transform-origin: top center;
          }
        `}
      </style>

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
          <span className={isNewNotification ? 'bell-animation' : ''}>🔔</span>
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
                      borderBottom: '1px solid #f0f3f7',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: n.status === 'pending' ? '#fce7f3' : 'transparent',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px' }}>
                        {n.customer_name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
                        {n.service_name} · {formatTime(n.start_time)}
                      </div>
                    </div>
                    {n.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => onConfirm(n.id)}
                        title="Randevuyu Onayla"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: '#d1fae5',
                          color: '#065f46',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✓
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onProfileClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'white',
          border: '1px solid #edf2f7',
          borderRadius: '12px',
          padding: '8px 16px 8px 8px',
          cursor: 'pointer',
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
          {user?.profile_image_url ? (
            <img
              src={`${API_BASE}${user.profile_image_url}`}
              alt={user.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
            />
          ) : (
            user?.name.charAt(0) || '?'
          )}
        </div>
        <div>
          <div style={{ fontWeight: 'bold', color: '#1a202c', fontSize: '14px' }}>{user?.name || 'Kullanıcı'}</div>
          <div style={{ fontSize: '12px', color: '#718096', textTransform: 'capitalize' }}>
            {user?.role === 'admin' ? 'Yönetici' : user?.role || 'Kullanıcı'} · {SALON_NAME}
          </div>
        </div>
      </button>
    </div>
  );
}
