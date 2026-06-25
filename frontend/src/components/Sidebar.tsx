import { Link } from 'react-router-dom';

export default function Sidebar() {
  const menuItems = [
    { name: 'Kontrol Paneli', path: '/' },
    { name: 'Randevular', path: '/appointments' },
    { name: 'Müşteriler', path: '/customers' },
    { name: 'Hizmetler', path: '/services' },
  ];

  return (
    <aside style={{
      width: '250px',
      flexShrink: 0,
      minHeight: '100vh',
      backgroundColor: '#fff',
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #edf2f7',
    }}>
      {/* Logo Alanı - Tasarımdaki pembe tonu */}
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#e52d6e', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🌸 BeautyFlow
      </div>

      {/* Menü Linkleri - Linkleri tam genişlik yapıyoruz */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path} 
            style={{
              textDecoration: 'none',
              color: '#4a5568',
              padding: '14px 15px',
              borderRadius: '8px',
              fontWeight: '600',
              width: '100%',
              display: 'block'
            }}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Profil/Salon Alt Alanı */}
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '15px', fontSize: '14px', color: '#718096' }}>
        <strong>Glow Beauty Studio</strong>
        <div style={{ fontSize: '12px' }}>Premium Plan 🌟</div>
      </div>
    </aside>
  );
}