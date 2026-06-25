from decimal import Decimal
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime



app = FastAPI()

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
    except Exception as e:
        print(f"\n❌ Veritabanına BAĞLANILAMADI!: {e}\n")

# -------------------------------------------------------------
# 5️⃣ & 6️⃣ Pydantic Modeli (Request Body Doğrulama)
# -------------------------------------------------------------
class SalonCreate(BaseModel):
    name: str
    slug: str
    phone: str

# User için doğrulama modeli
class UserCreate(BaseModel):
    name: str
    email: str
    password: str  # Frontend'den ham şifre gelir, biz arkada hash'leriz
    salon_id: int

# Customer için doğrulama modeli
class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    salon_id: int

# Service için doğrulama modeli
class ServiceCreate(BaseModel):
    name: str
    duration_minutes: int
    price: Decimal
    salon_id: int

# Appointment için doğrulama modeli
class AppointmentCreate(BaseModel):
    customer_id: int
    service_id: int
    employee_id: Optional[int] = None
    start_time: datetime
    salon_id: int















# -------------------------------------------------------------
# 6️⃣ Endpointler
# -------------------------------------------------------------

# GET /
@app.get("/")
def read_root():
    return {"message": "BeautyFlow API"}

# POST /salons
@app.post("/salons")
def create_salon(salon: SalonCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Veritabanına ekleme sorgusu
        query = """
            INSERT INTO salons (name, slug, phone) 
            VALUES (%s, %s, %s) 
            RETURNING id, name, slug, phone, created_at;
        """
        cursor.execute(query, (salon.name, salon.slug, salon.phone))
        new_salon = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"status": "success", "data": new_salon}
        
    except psycopg2.errors.UniqueViolation:
        # Eğer aynı slug ile tekrar kayıt açılmaya çalışılırsa hata fırlatır
        raise HTTPException(status_code=400, detail="Bu slug zaten kullanımda!")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")
    

# GET /customers -> Tüm müşterileri listele
@app.get("/customers")
def get_customers(salon_id: Optional[int] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if salon_id:
            cursor.execute("SELECT * FROM customers WHERE salon_id = %s ORDER BY id DESC;", (salon_id,))
        else:
            cursor.execute("SELECT * FROM customers ORDER BY id DESC;")
            
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

# POST /services -> Yeni hizmet oluştur
@app.post("/services")
def create_service(service: ServiceCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO services (name, duration_minutes, price, salon_id) 
            VALUES (%s, %s, %s, %s) 
            RETURNING id, name, duration_minutes, price, salon_id, created_at;
        """
        cursor.execute(query, (service.name, service.duration_minutes, service.price, service.salon_id))
        new_service = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "data": new_service}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hizmet oluşturulamadı: {str(e)}")


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
            INSERT INTO appointments (customer_id, service_id, employee_id, start_time, salon_id) 
            VALUES (%s, %s, %s, %s, %s) 
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














    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8080, reload=True)