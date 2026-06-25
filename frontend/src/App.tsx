// src/App.tsx dosyanın içeriğini bununla değiştir

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Customers from './pages/Customers';
import Services from './pages/Services';
import './App.css';

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', backgroundColor: '#fafafa', minHeight: '100vh', width: '100%' }}>
        <Sidebar />

        <main style={{
          flex: 1,
          padding: '40px',
          minWidth: 0,
          overflowY: 'auto',
          textAlign: 'left',
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/services" element={<Services />} />
          </Routes>
        </main>

      </div>
    </Router>
  );
}

export default App;