import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, Alert, Linking, ActivityIndicator } from 'react-native'; 
import DateTimePicker from '@react-native-community/datetimepicker';

// Kendi backend URL'inizi buraya yazın. 
// Önemli: Android/iOS simülatörü veya gerçek cihaz için localhost yerine bilgisayarınızın yerel IP'sini yazın!
const API_URL = 'http://192.168.1.104:8080';

// Sahte Saat Slotları (İleride randevu doluluk endpoint'ine bağlanabilir)
const MOCK_TIME_SLOTS = [
  { time: '09:00', isAvailable: true },
  { time: '10:00', isAvailable: false }, 
  { time: '11:00', isAvailable: true },
  { time: '13:00', isAvailable: true },
  { time: '14:00', isAvailable: false }, 
  { time: '15:00', isAvailable: true },
  { time: '16:00', isAvailable: true },
];

export default function SalonDetailScreen({ route, navigation }: any) {
  const { salon } = route.params;

  // Aktif açılır menü takibi ('service', 'date', 'time')
  const [activeStep, setActiveStep] = useState<string>('service');

  // Backend'den gelecek dinamik hizmet listesi ve yüklenme durumu
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Kullanıcı Seçimleri State'leri
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [dateSelected, setDateSelected] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Sayfa yüklendiğinde hizmetleri getir
  useEffect(() => {
    fetchServices();
  }, [salon.id]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      // Backend'deki GET /services endpoint'ine salon_id query parametresini gönderiyoruz
      const response = await fetch(`${API_URL}/services?salon_id=${salon.id}`);
      
      if (!response.ok) {
        throw new Error('Hizmetler backendden çekilemedi.');
      }
      
      const data = await response.json();
      
      // GÜVENLİK ÖNLEMİ: Gelen ham verinin dizi (Array) olup olmadığını güvenli bir şekilde kontrol ediyoruz
      if (Array.isArray(data)) {
        setServices(data);
      } else if (data && Array.isArray(data.data)) {
        setServices(data.data);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error("Hizmet çekme hatası:", error);
      Alert.alert("Hata", "Salon hizmetleri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Tarih değiştiğinde tetiklenir
  const onDateChange = (event: any, selected: Date | undefined) => {
    setShowDatePicker(false);
    if (selected) {
      setSelectedDate(selected);
      setDateSelected(true);
      setSelectedTime(null); 
      setActiveStep('time'); 
    }
  };

  // Haritayı açma fonksiyonu
  const openMap = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch((err) => console.error("Harita açılamadı:", err));
  };

  // Randevu Gönderme Fonksiyonu
  const handleCreateAppointment = async () => {
    if (!selectedService || !dateSelected || !selectedTime) return;

    const appointmentData = {
      salonId: salon.id,
      serviceId: selectedService.id, // Backend için servis ID'si
      serviceName: selectedService.name,
      price: selectedService.price,
      date: selectedDate.toLocaleDateString('tr-TR'),
      time: selectedTime,
    };

    console.log("Randevu datası hazır:", appointmentData);

    Alert.alert(
      "Randevu Başarılı! 🎉",
      `${salon.name} salonundan ${appointmentData.date} günü saat ${appointmentData.time} için ${appointmentData.serviceName} randevunuz oluşturulmuştur.`,
      [{ text: "Tamam", onPress: () => navigation.navigate('Home') }]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Üst Kısım: Salon Künyesi */}
        <Image source={{ uri: salon.logo }} style={styles.coverImage} />
        <View style={styles.salonInfo}>
          <Text style={styles.salonName}>{salon.name}</Text>
          <Text style={styles.salonSub}>⭐ {salon.rating}  |  🕒 {salon.hours}</Text>
          
          {/* Tıklanabilir Adres Alanı */}
          {salon.address && (
            <TouchableOpacity 
              onPress={() => openMap(salon.address)}
              activeOpacity={0.7}
              style={styles.addressTouchable}
            >
              <Text style={styles.addressText}>📍 {salon.address}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 1. ADIM: HİZMET SEÇİM MENÜSÜ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity 
            style={styles.accordionHeader} 
            onPress={() => setActiveStep(activeStep === 'service' ? '' : 'service')}
          >
            <Text style={styles.stepTitle}>1. Hizmet Seçimi</Text>
            <Text style={styles.stepStatus}>
              {selectedService ? `✅ ${selectedService.name}` : 'Seçiniz 🔽'}
            </Text>
          </TouchableOpacity>

          {activeStep === 'service' && (
            <View style={styles.accordionContent}>
              {loading ? (
                // Yükleniyor halkası
                <ActivityIndicator size="small" color="#e52d6e" style={{ padding: 20 }} />
              ) : !services || services.length === 0 ? (
                <Text style={styles.infoText}>Bu salona ait aktif hizmet bulunamadı.</Text>
              ) : (
                // Backend'den gelen dinamik servislerin listelenmesi (Eksik veri / tanımsız eleman korumalı)
                services.map((service, index) => {
                  if (!service) return null;
                  return (
                    <TouchableOpacity 
                      key={service.id || index} 
                      style={[styles.itemCard, selectedService?.id === service.id && styles.itemCardSelected]}
                      onPress={() => {
                        setSelectedService(service);
                        setActiveStep('date'); 
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.itemName}>{service.name || "İsimsiz Hizmet"}</Text>
                        {service.description && (
                          <Text style={styles.itemDescription} numberOfLines={2}>
                            {service.description}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.itemPrice}>{service.price ? `${service.price} TL` : "0 TL"}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* 2. ADIM: TARİH SEÇİM MENÜSÜ */}
        <View style={[styles.accordionCard, !selectedService && styles.disabledCard]}>
          <TouchableOpacity 
            style={styles.accordionHeader}
            disabled={!selectedService}
            onPress={() => setActiveStep(activeStep === 'date' ? '' : 'date')}
          >
            <Text style={styles.stepTitle}>2. Tarih Seçimi</Text>
            <Text style={styles.stepStatus}>
              {dateSelected ? `✅ ${selectedDate.toLocaleDateString('tr-TR')}` : 'Seçiniz 🔽'}
            </Text>
          </TouchableOpacity>

          {activeStep === 'date' && (
            <View style={styles.accordionContent}>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.datePickerButtonText}>Takvimi Aç ve Gün Seç</Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()} 
                  onChange={onDateChange}
                />
              )}
            </View>
          )}
        </View>

        {/* 3. ADIM: SAAT SEÇİM MENÜSÜ */}
        <View style={[styles.accordionCard, !dateSelected && styles.disabledCard]}>
          <TouchableOpacity 
            style={styles.accordionHeader}
            disabled={!dateSelected}
            onPress={() => setActiveStep(activeStep === 'time' ? '' : 'time')}
          >
            <Text style={styles.stepTitle}>3. Saat Seçimi</Text>
            <Text style={styles.stepStatus}>
              {selectedTime ? `✅ ${selectedTime}` : 'Seçiniz 🔽'}
            </Text>
          </TouchableOpacity>

          {activeStep === 'time' && (
            <View style={styles.accordionContent}>
              <Text style={styles.infoText}>Gri saatler doludur, lütfen pembe olanlardan seçiniz:</Text>
              <View style={styles.timeGrid}>
                {MOCK_TIME_SLOTS.map((slot, index) => (
                  <TouchableOpacity
                    key={index}
                    disabled={!slot.isAvailable}
                    style={[
                      styles.timeSlot,
                      !slot.isAvailable && styles.timeSlotDisabled,
                      selectedTime === slot.time && styles.timeSlotSelected
                    ]}
                    onPress={() => setSelectedTime(slot.time)}
                  >
                    <Text style={[
                      styles.timeText,
                      !slot.isAvailable && styles.timeTextDisabled,
                      selectedTime === slot.time && styles.timeTextSelected
                    ]}>
                      {slot.time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* EN ALTTAKİ ONAY BUTONU */}
      {selectedService && dateSelected && selectedTime && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.submitButton} onPress={handleCreateAppointment}>
            <Text style={styles.submitButtonText}>Randevuyu Onayla ve Oluştur</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f3f5' },
  coverImage: { width: '100%', height: 160 },
  salonInfo: { padding: 15, backgroundColor: '#fff', marginBottom: 10 },
  salonName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  salonSub: { fontSize: 13, color: '#6c757d', marginTop: 4 },
  
  addressTouchable: {
    marginTop: 10,
    paddingVertical: 2,
  },
  addressText: {
    fontSize: 13,
    color: '#e52d6e', 
    textDecorationLine: 'underline', 
    fontWeight: '500',
  },

  accordionCard: { backgroundColor: '#fff', marginBottom: 10, borderRadius: 10, marginHorizontal: 15, overflow: 'hidden', elevation: 2 },
  disabledCard: { opacity: 0.5 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  stepTitle: { fontSize: 15, fontWeight: 'bold', color: '#495057' },
  stepStatus: { fontSize: 13, color: '#e52d6e', fontWeight: '600' },
  accordionContent: { padding: 16, borderTopWidth: 1, borderColor: '#f1f3f5', backgroundColor: '#fafbfc' },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: '#e9ecef', borderRadius: 8, marginBottom: 8, backgroundColor: '#fff' },
  itemCardSelected: { borderColor: '#e52d6e', backgroundColor: '#fff5f7' },
  itemName: { fontSize: 14, color: '#333', fontWeight: '500' },
  itemDescription: { fontSize: 12, color: '#868e96', marginTop: 3 },
  itemPrice: { fontSize: 14, color: '#e52d6e', fontWeight: 'bold' },
  datePickerButton: { backgroundColor: '#e52d6e', padding: 12, borderRadius: 8, alignItems: 'center' },
  datePickerButtonText: { color: '#fff', fontWeight: 'bold' },
  infoText: { fontSize: 12, color: '#6c757d', marginBottom: 12 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: { width: '22%', paddingVertical: 10, borderWidth: 1, borderColor: '#e52d6e', borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  timeSlotDisabled: { borderColor: '#dee2e6', backgroundColor: '#e9ecef' },
  timeSlotSelected: { backgroundColor: '#e52d6e', borderColor: '#e52d6e' },
  timeText: { color: '#e52d6e', fontWeight: 'bold', fontSize: 13 },
  timeTextDisabled: { color: '#adb5bd' },
  timeTextSelected: { color: '#fff' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e9ecef' },
  submitButton: { backgroundColor: '#2b8a3e', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});