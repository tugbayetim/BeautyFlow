-- 001_initial_schema.sql
-- Bu dosya, projenin başlangıç veritabanı şemasını oluşturur.

-- Salons Tablosu
CREATE TABLE IF NOT EXISTS salons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    logo_url TEXT,
    description TEXT,
    contact_email VARCHAR(255),
    address TEXT,
    social_media JSONB,
    working_hours JSONB,
    slot_duration_minutes INTEGER DEFAULT 30,
    cancellation_policy_hours INTEGER DEFAULT 2,
    billing_company_type VARCHAR(50),
    billing_tax_office VARCHAR(255),
    billing_tax_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers Tablosu
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL, -- Telefon hem benzersiz hem zorunlu yapıldı
    password_hash VARCHAR(255) NOT NULL, -- Güvenli giriş için şifre alanı zorunlu yapıldı
    last_visit DATE,
    total_spent NUMERIC(10, 2) DEFAULT 0.00,
    salon_id INTEGER NOT NULL REFERENCES salons(id) ON DELETE CASCADE, -- Hangi salona ait olduğu ilişkisi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Services Tablosu
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    duration_minutes INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    discounted_price NUMERIC(10, 2),
    image_url TEXT,
    gallery_images JSONB,
    description TEXT,
    online_booking_enabled BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    salon_id INTEGER NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments Tablosu
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    employee_id INTEGER,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    salon_id INTEGER NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Tablosu (Yönetici/Salon Sahibi)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    profile_image_url TEXT,
    salon_id INTEGER REFERENCES salons(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    
);

-- Subscriptions Tablosu
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id) ON DELETE CASCADE UNIQUE,
    plan_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- active, cancelled, expired
    renewal_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);