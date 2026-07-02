import { useState, type FormEvent, type CSSProperties } from 'react';
import { API_BASE } from '../config';

export default function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('username', name);
      params.append('password', password);

      const res = await fetch(`${API_BASE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      if (!res.ok) {
        throw new Error('Ad soyad veya şifre hatalı.');
      }

      const data = await res.json();
      localStorage.setItem('beautyflow_token', data.access_token);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <style>
        {`
          .waves-container {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 15vh;
            min-height: 100px;
            max-height: 150px;
          }
          .wave {
            position: absolute;
            width: 200%;
            height: 100%;
            background-size: 1000px 100%;
            background-repeat: repeat-x;
          }
          .wave1 {
            animation: wave-move 20s linear infinite;
            opacity: 0.8;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 100' preserveAspectRatio='none'%3e%3cpath d='M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z' fill='%23FBCFE8'/%3e%3c/svg%3e");
          }
          .wave2 {
            animation: wave-move-rev 15s linear infinite;
            opacity: 0.5;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 100' preserveAspectRatio='none'%3e%3cpath d='M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z' fill='%23F9A8D4'/%3e%3c/svg%3e");
          }
          @keyframes wave-move { 0% { transform: translateX(0); } 100% { transform: translateX(-1000px); } }
          @keyframes wave-move-rev { 0% { transform: translateX(-1000px); } 100% { transform: translateX(0); }
          }

          .login-input:focus {
            border-color: #f9a8d4;
            animation: neon-glow 1.5s ease-in-out infinite alternate;
            outline: none;
          }

          @keyframes neon-glow {
            from { box-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #f472b6, 0 0 20px #f472b6, 0 0 25px #f472b6; }
            to { box-shadow: 0 0 2px #fff, 0 0 4px #fff, 0 0 6px #e879f9, 0 0 8px #e879f9, 0 0 10px #e879f9; }
          }

          @keyframes box-glow {
            0% { box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 15px rgba(229, 45, 110, 0.2); transform: translateY(0px); }
            50% { box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.2), 0 0 30px rgba(229, 45, 110, 0.5); transform: translateY(-15px); }
            100% { box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 15px rgba(229, 45, 110, 0.2); transform: translateY(0px); }
          }

          .login-form-container:hover {
            transform: scale(1.03);
          }

          .login-button {
            background: linear-gradient(-45deg, #e879f9, #f472b6, #e52d6e);
            background-size: 200% 200%;
            animation: move-gradient 5s ease infinite;
            transition: box-shadow 0.3s ease-in-out;
          }

          .login-button:hover {
            box-shadow: 0 0 20px rgba(229, 45, 110, 0.5);
          }
        `}
      </style>
      <div className="waves-container">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
      </div>
      <div style={formContainerStyle} className="login-form-container">
        <div style={brushIconStyle}>🖌️✨</div>
        <h1 style={titleStyle}>🌸 BeautyFlow</h1>
        <p style={subtitleStyle}>Günün güzelliğini tasarlamaya hazır mısınız?</p>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Ad Soyadı
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
              className="login-input"
              placeholder="Gülşah Yılmaz"
            />
          </label>
          <label style={labelStyle}>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              className="login-input"
              placeholder="••••••••"
            />
          </label>

          {error && <p style={{ color: '#c53030', fontSize: '14px', textAlign: 'center' }}>{error}</p>}

          <button type="submit" disabled={loading} style={buttonStyle} className="login-button">
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  position: 'relative',
  backgroundColor: '#fdf2f8',
  overflow: 'hidden',
};

const formContainerStyle: CSSProperties = {
  width: '100%',
  maxWidth: '400px',
  padding: '40px',
  backgroundColor: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: '16px',
  animation: 'box-glow 5s ease-in-out infinite',
  transition: 'transform 0.4s ease-in-out',
  position: 'relative',
  zIndex: 1,
};

const titleStyle: CSSProperties = {
  textAlign: 'center',
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#e52d6e',
  marginBottom: '8px',
  fontStyle: 'italic',
};

const subtitleStyle: CSSProperties = {
  textAlign: 'center',
  color: '#4a5568',
  marginBottom: '32px',
  fontStyle: 'italic',
};

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginBottom: '20px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#2d3748',
};

const inputStyle: CSSProperties = {
  padding: '14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '16px',
  backgroundColor: 'rgba(255, 255, 255, 0.6)',
  transition: 'all 0.2s ease-in-out',
};

const buttonStyle: CSSProperties = {
  width: '100%',
  padding: '16px',
  borderRadius: '8px',
  border: 'none',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '16px',
  cursor: 'pointer',
  marginTop: '16px',
};

const brushIconStyle: CSSProperties = {
  position: 'absolute',
  top: '25px',
  right: '25px',
  fontSize: '28px',
  transform: 'rotate(20deg)',
  opacity: 0.6,
  pointerEvents: 'none',
  textShadow: '0 2px 8px rgba(0,0,0,0.1)',
};