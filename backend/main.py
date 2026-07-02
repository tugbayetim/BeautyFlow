from decimal import Decimal
from typing import Optional, List
import os
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import uuid
from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt




app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "services")
PROFILE_UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "profiles")
MIGRATION_FILES = sorted([os.path.join(BASE_DIR, "migrations", f) for f in os.listdir(os.path.join(BASE_DIR, "migrations")) if f.endswith('.sql')])
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROFILE_UPLOAD_DIR, exist_ok=True)

# --- GÜVENLİK AYARLARI ---
SECRET_KEY = "your-very-secret-key-that-is-long-and-secure" # GERÇEK UYGULAMADA BUNU .env DOSYASINA TAŞIYIN
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 gün

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
# --- GÜVENLİK AYARLARI SONU ---


SERVICE_CATEGORIES = [
    "Saç Bakımı",
    "Cilt Bakımı",
    "Manikür & Pedikür",
    "Makyaj",
    "Epilasyon",
    "Masaj & SPA",
    "Kaş & Kirpik",
    "Lazer",
    "Diğer",
]

# --- GÜVENLİK YARDIMCI FONKSİYONLARI ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Kimlik bilgileri doğrulanamadı",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    if user is None:
        raise credentials_exception
    return user
# --- GÜVENLİK YARDIMCI FONKSİYONLARI SONU ---

def run_migrations():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Migration'ları takip etmek için bir tablo oluşturalım
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(255) PRIMARY KEY
                );
            """)
            
            # Hangi migration'ların zaten uygulandığını kontrol edelim
            cursor.execute("SELECT version FROM schema_migrations;")
            applied_migrations = {row['version'] for row in cursor.fetchall()}

            print("Veritabanı migration'ları kontrol ediliyor...")
            for file_path in MIGRATION_FILES:
                migration_name = os.path.basename(file_path)
                if migration_name not in applied_migrations:
                    print(f"  -> Uygulanıyor: {migration_name}")
                    with open(file_path, "r", encoding="utf-8") as f:
                        cursor.execute(f.read())
                    
                    # Uygulanan migration'ı tabloya kaydet
                    cursor.execute("INSERT INTO schema_migrations (version) VALUES (%s);", (migration_name,))
                    print(f"  ✅ Tamamlandı: {migration_name}")
                
            conn.commit()
        print("Veritabanı migration'ları güncel.")
    except Exception as e:
        print(f"⚠️ Migration hatası: {e}")
    finally:
        if conn:
            conn.close()

async def save_profile_upload(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Desteklenmeyen görsel formatı")
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(PROFILE_UPLOAD_DIR, filename)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Boş dosya yüklenemez")
    with open(path, "wb") as f:
        f.write(content)
    return f"/uploads/profiles/{filename}"

async def save_upload(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Desteklenmeyen görsel formatı")
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Boş dosya yüklenemez")
    with open(path, "wb") as f:
        f.write(content)
    return f"/uploads/services/{filename}"

def parse_bool(value: str) -> bool:
    return str(value).lower() in {"true", "1", "yes", "on"}

# Frontend başladığında CORS hatası almamak için bu ayarı ekliyoruz
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Geliştirme aşamasında her şeye izin verelim
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PostgreSQL Bağlantı Bilgileri (Kendi şifreni ve kullanıcını yazabilirsin)
DB_CONFIG = {
    "dbname": "beautyflow_db",
    "user": "postgres",
    "password": "20924678390", # Burayı kendi şifrenle değiştir!
    "host": "localhost",
    "port": "5432"
}

def get_db_connection():
    # RealDictCursor sayesinde veritabanından gelen veriler direkt JSON/Dict formatında olur
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

# -------------------------------------------------------------
# 4️⃣ PostgreSQL Bağlantı Testi (Uygulama açılırken çalışır)
# -------------------------------------------------------------
@app.on_event("startup")
def test_db_connection():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1;")
        result = cursor.fetchone()
        print(f"\n🚀 Veritabanı Bağlantısı Başarılı! SELECT 1 Sonucu: {result}\n")
        cursor.close()
        conn.close()
        run_migrations()
    except Exception as e:
        print(f"\n❌ Veritabanına BAĞLANILAMADI!: {e}\n")

# -------------------------------------------------------------
# 5️⃣ & 6️⃣ Pydantic Modeli (Request Body Doğrulama)
# -------------------------------------------------------------
class SalonCreate(BaseModel):
    name: str
    slug: str
    phone: str
    owner_name: str
    owner_email: str
    owner_password: str

# User için doğrulama modeli
class UserCreate(BaseModel):
    name: str
    email: str
    password: str  # Frontend'den ham şifre gelir, biz arkada hash'leriz
    salon_id: int
    role: Optional[str] = "yönetici"
    profile_image_url: Optional[str] = None

# User güncelleme için doğrulama modeli 

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


    
# Token modeli
class Token(BaseModel):
    access_token: str
    token_type: str
# Customer için doğrulama modeli
class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    salon_id: int

# Service için doğrulama modeli (JSON endpoint uyumluluğu)
class ServiceCreate(BaseModel):
    name: str
    category: str
    duration_minutes: int
    price: Decimal
    salon_id: int
    discounted_price: Optional[Decimal] = None
    description: Optional[str] = None
    online_booking_enabled: bool = True
    is_active: bool = True
    image_url: Optional[str] = None
    gallery_images: Optional[List[str]] = []

# Appointment için doğrulama modeli
class AppointmentCreate(BaseModel):
    customer_id: int
    service_id: int
    employee_id: Optional[int] = None
    start_time: datetime
    salon_id: int

class AppointmentStatusUpdate(BaseModel):
    status: str

class ServiceStatusUpdate(BaseModel):
    is_active: Optional[bool] = None
    online_booking_enabled: Optional[bool] = None

class SalonSettingsUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    social_media: Optional[dict] = None
    working_hours: Optional[dict] = None
    slot_duration_minutes: Optional[int] = None
    cancellation_policy_hours: Optional[int] = None
    billing_company_type: Optional[str] = None
    billing_tax_office: Optional[str] = None
    billing_tax_number: Optional[str] = None
    # Logo ve diğer görseller ayrı endpoint'lerde ele alınacak



















# -------------------------------------------------------------
# 6️⃣ Endpointler
# -------------------------------------------------------------

# GET /
@app.get("/")
def read_root():
    return {"message": "BeautyFlow API"}

# POST /token -> Login endpoint'i
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE name = %s", (form_data.username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Geçersiz ad soyad veya şifre",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "salon_id": user["salon_id"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# GET /users/me -> Giriş yapmış kullanıcının bilgilerini getir
@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

# PUT /users/me -> Giriş yapmış kullanıcının bilgilerini güncelle
@app.put("/users/me")
async def update_user_me(
    current_user: dict = Depends(get_current_user),
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    current_password: Optional[str] = Form(None),
    new_password: Optional[str] = Form(None),
    profile_image: Optional[UploadFile] = File(None)
):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            update_fields = []
            params = []

            if name:
                update_fields.append("name = %s")
                params.append(name)
            if email:
                update_fields.append("email = %s")
                params.append(email)
            
            if new_password:
                if not current_password or not verify_password(current_password, current_user["hashed_password"]):
                    raise HTTPException(status_code=400, detail="Mevcut şifre hatalı.")
                hashed_password = get_password_hash(new_password)
                update_fields.append("hashed_password = %s")
                params.append(hashed_password)
            
            if profile_image:
                image_url = await save_profile_upload(profile_image)
                update_fields.append("profile_image_url = %s")
                params.append(image_url)

            if not update_fields:
                return {"message": "Güncellenecek bir bilgi yok."}

            params.append(current_user["id"])
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s RETURNING id, name, email, role, profile_image_url;"
            cursor.execute(query, tuple(params))
            updated_user = cursor.fetchone()
            conn.commit()
            return {"status": "success", "data": updated_user}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı güncellenemedi: {e}")

# POST /users -> Yeni kullanıcı (salon sahibi) oluştur
@app.post("/users")
def create_user(user: UserCreate):
    try:
        hashed_password = get_password_hash(user.password)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (name, email, hashed_password, salon_id) VALUES (%s, %s, %s, %s) RETURNING id, email, name", 
                       (user.name, user.email, hashed_password, user.salon_id))
        new_user = cursor.fetchone()
        conn.commit()
        return {"status": "success", "data": new_user}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı oluşturulamadı: {e}")

# POST /salons
@app.post("/salons")
def create_salon(salon: SalonCreate):
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                # 1. Salonu oluştur ve ID'sini al
                salon_query = """
                    INSERT INTO salons (name, slug, phone) 
                    VALUES (%s, %s, %s) 
                    RETURNING id, name, slug, phone, created_at;
                """
                cursor.execute(salon_query, (salon.name, salon.slug, salon.phone))
                new_salon = cursor.fetchone()
                
                # 2. Salon sahibini (kullanıcıyı) oluştur
                hashed_password = get_password_hash(salon.owner_password)
                user_query = """
                    INSERT INTO users (name, email, hashed_password, salon_id, role) 
                    VALUES (%s, %s, %s, %s, 'admin')
                """
                cursor.execute(user_query, (salon.owner_name, salon.owner_email, hashed_password, new_salon['id']))

        return {"status": "success", "data": new_salon}
        
    except psycopg2.errors.UniqueViolation as e:
        # Eğer aynı slug veya email ile tekrar kayıt açılmaya çalışılırsa hata fırlatır
        if 'users_email_key' in str(e):
            raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanımda!")
        if 'salons_slug_key' in str(e):
            raise HTTPException(status_code=400, detail="Bu salon slug'ı zaten kullanımda!")
        raise HTTPException(status_code=400, detail="Benzersiz alan hatası!")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")
    finally:
        if conn:
            conn.close()
    
# GET /salons/{id} -> Belirli bir salonun tüm detaylarını getir
@app.get("/salons/{salon_id}")
def get_salon_details(salon_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            SELECT s.*, sub.plan_name, sub.status as subscription_status, sub.renewal_date
            FROM salons s
            LEFT JOIN subscriptions sub ON s.id = sub.salon_id
            WHERE s.id = %s;
        """
        cursor.execute(query, (salon_id,))
        salon = cursor.fetchone()
        cursor.close()
        conn.close()
        if not salon:
            raise HTTPException(status_code=404, detail="Salon bulunamadı")
        return salon
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Salon detayları getirilemedi: {str(e)}")

# GET /customers -> Tüm müşterileri listele
@app.get("/customers")
def get_customers(salon_id: Optional[int] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT 
                c.id, c.name, c.phone, c.total_spent, c.salon_id, c.created_at,
                la.last_visit_date as last_visit,
                la.last_service_name,
                la.last_service_price
            FROM customers c
            LEFT JOIN LATERAL (
                SELECT
                    a.start_time as last_visit_date,
                    s.name as last_service_name,
                    COALESCE(s.discounted_price, s.price) as last_service_price
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                WHERE a.customer_id = c.id AND a.status = 'completed'
                ORDER BY a.start_time DESC
                LIMIT 1
            ) la ON TRUE
        """

        if salon_id:
            query += " WHERE c.salon_id = %s ORDER BY c.id DESC;"
            cursor.execute(query, (salon_id,))
        else:
            query += " ORDER BY c.id DESC;"
            cursor.execute(query)
            
        customers = cursor.fetchall()
        cursor.close()
        conn.close()
        return customers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Müşteriler getirilemedi: {str(e)}")

# POST /customers -> Yeni müşteri oluştur
@app.post("/customers")
def create_customer(customer: CustomerCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO customers (name, phone, salon_id) 
            VALUES (%s, %s, %s) 
            RETURNING id, name, phone, last_visit, total_spent, salon_id, created_at;
        """
        cursor.execute(query, (customer.name, customer.phone, customer.salon_id))
        new_customer = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "data": new_customer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Müşteri oluşturulamadı: {str(e)}")
    
# PUT /salons/{id} -> Salon ayarlarını güncelle
@app.put("/salons/{salon_id}")
def update_salon_settings(salon_id: int, settings: SalonSettingsUpdate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Pydantic modelinden gelen ve None olmayan alanları alarak dinamik bir SET ifadesi oluştur
        update_fields = settings.dict(exclude_unset=True)
        if not update_fields:
            raise HTTPException(status_code=400, detail="Güncellenecek veri bulunamadı.")

        set_clause = ", ".join([f"{key} = %s" for key in update_fields.keys()])
        
        # JSONB alanları için psycopg2.extras.Json kullan
        params = []
        for key, value in update_fields.items():
            if isinstance(value, dict):
                params.append(Json(value))
            else:
                params.append(value)
        params.append(salon_id)

        query = f"UPDATE salons SET {set_clause} WHERE id = %s RETURNING *;"
        
        cursor.execute(query, tuple(params))
        updated_salon = cursor.fetchone()
        
        if not updated_salon:
            raise HTTPException(status_code=404, detail="Salon bulunamadı.")

        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "data": updated_salon}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Salon ayarları güncellenemedi: {str(e)}")


   # GET /service-categories -> Hizmet kategorileri
@app.get("/service-categories")
def get_service_categories():
    return SERVICE_CATEGORIES

   # GET /services -> Tüm hizmetleri listele
@app.get("/services")
def get_services(salon_id: Optional[int] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if salon_id:
            cursor.execute("SELECT * FROM services WHERE salon_id = %s ORDER BY id DESC;", (salon_id,))
        else:
            cursor.execute("SELECT * FROM services ORDER BY id DESC;")
            
        services = cursor.fetchall()
        cursor.close()
        conn.close()
        return services
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hizmetler getirilemedi: {str(e)}")

# POST /services -> Yeni hizmet oluştur (multipart + görsel yükleme)
@app.post("/services")
async def create_service(
    name: str = Form(...),
    category: str = Form(...),
    price: Decimal = Form(...),
    duration_minutes: int = Form(...),
    salon_id: int = Form(...),
    image: UploadFile = File(...),
    discounted_price: Optional[Decimal] = Form(None),
    description: Optional[str] = Form(None),
    online_booking_enabled: str = Form("true"),
    is_active: str = Form("true"),
    gallery: Optional[List[UploadFile]] = File(None),
):
    try:
        image_url = await save_upload(image)
        gallery_urls = []
        if gallery:
            for gfile in gallery:
                if gfile.filename:
                    gallery_urls.append(await save_upload(gfile))

        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO services (
                name, category, duration_minutes, price, discounted_price,
                image_url, gallery_images, description,
                online_booking_enabled, is_active, salon_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *;
        """
        cursor.execute(query, (
            name.strip(),
            category.strip(),
            duration_minutes,
            price,
            discounted_price,
            image_url,
            Json(gallery_urls),
            description.strip() if description else None,
            parse_bool(online_booking_enabled),
            parse_bool(is_active),
            salon_id,
        ))
        new_service = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "data": new_service}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hizmet oluşturulamadı: {str(e)}")

# GET /services/online -> Sadece online rezervasyona açık hizmetleri getir
@app.get("/services/online")
def get_online_services(salon_id: Optional[int] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM services WHERE online_booking_enabled = TRUE AND is_active = TRUE"
        
        if salon_id:
            query += " AND salon_id = %s ORDER BY name ASC;"
            cursor.execute(query, (salon_id,))
        else:
            query += " ORDER BY name ASC;"
            cursor.execute(query)
            
        services = cursor.fetchall()
        cursor.close()
        conn.close()
        return services
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Online hizmetler getirilemedi: {str(e)}")

# PATCH /services/{service_id}/status -> Hizmet durumunu güncelle
@app.patch("/services/{service_id}/status")
def update_service_status(service_id: int, body: ServiceStatusUpdate):
    if body.is_active is None and body.online_booking_enabled is None:
        raise HTTPException(status_code=400, detail="Güncellenecek bir durum belirtilmedi.")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        updates = []
        params = []
        if body.is_active is not None:
            updates.append("is_active = %s")
            params.append(body.is_active)
        if body.online_booking_enabled is not None:
            updates.append("online_booking_enabled = %s")
            params.append(body.online_booking_enabled)
        
        params.append(service_id)

        query = f"UPDATE services SET {', '.join(updates)} WHERE id = %s RETURNING *;"
        cursor.execute(query, tuple(params))
        
        updated = cursor.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Hizmet bulunamadı")

        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "data": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hizmet durumu güncellenemedi: {str(e)}")

# DELETE /services/{service_id} -> Hizmeti sil
@app.delete("/services/{service_id}")
def delete_service(service_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM services WHERE id = %s RETURNING id;", (service_id,))
        deleted = cursor.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "message": "Hizmet başarıyla silindi."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hizmet silinemedi: {str(e)}")

 # GET /appointments -> Tüm randevuları (Müşteri ve Hizmet detaylarıyla birlikte) getir
@app.get("/appointments")
def get_appointments(salon_id: Optional[int] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # SQL JOIN kullanarak randevu ile birlikte müşteri adını ve hizmet adını da tek seferde çekiyoruz
        query = """
            SELECT 
                a.id, a.start_time, a.status, a.employee_id, a.salon_id, a.created_at,
                c.name as customer_name, c.phone as customer_phone,
                s.name as service_name, s.price as service_price, s.duration_minutes
            FROM appointments a
            LEFT JOIN customers c ON a.customer_id = c.id
            LEFT JOIN services s ON a.service_id = s.id
        """
        
        if salon_id:
            query += " WHERE a.salon_id = %s ORDER BY a.start_time ASC;"
            cursor.execute(query, (salon_id,))
        else:
            query += " ORDER BY a.start_time ASC;"
            cursor.execute(query)
            
        appointments = cursor.fetchall()
        cursor.close()
        conn.close()
        return appointments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Randevular getirilemedi: {str(e)}")

# POST /appointments -> Yeni randevu oluştur
@app.post("/appointments")
def create_appointment(appointment: AppointmentCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO appointments (customer_id, service_id, employee_id, start_time, salon_id, status) 
            VALUES (%s, %s, %s, %s, %s, 'pending') 
            RETURNING id, customer_id, service_id, employee_id, start_time, status, salon_id, created_at;
        """
        cursor.execute(query, (
            appointment.customer_id, 
            appointment.service_id, 
            appointment.employee_id, 
            appointment.start_time,
            appointment.salon_id
        ))
        new_appointment = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "data": new_appointment}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Randevu oluşturulamadı: {str(e)}")

# PATCH /appointments/{appointment_id}/status -> Randevu durumunu güncelle
@app.patch("/appointments/{appointment_id}/status")
def update_appointment_status(appointment_id: int, body: AppointmentStatusUpdate):
    allowed_statuses = {"pending", "confirmed", "completed", "cancelled"}
    if body.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Geçersiz durum değeri")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            UPDATE appointments
            SET status = %s
            WHERE id = %s
            RETURNING id, customer_id, service_id, employee_id, start_time, status, salon_id, created_at;
        """
        cursor.execute(query, (body.status, appointment_id))
        updated = cursor.fetchone()

        if not updated:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Randevu bulunamadı")

        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "data": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Randevu durumu güncellenemedi: {str(e)}")














    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8080, reload=True)

app.mount("/uploads", StaticFiles(directory=os.path.join(BASE_DIR, "uploads")), name="uploads")
app.mount("/uploads/profiles", StaticFiles(directory=PROFILE_UPLOAD_DIR), name="profile_uploads")
