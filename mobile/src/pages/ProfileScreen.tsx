import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

// Sahte (Mock) Randevu Geçmişi Verileri
const MOCK_HISTORY = [
  {
    id: 'h1',
    salonName: 'Elegance Bayan Kuaförü',
    serviceName: 'Saç Kesimi & Fön',
    price: 150,
    date: '05.07.2026',
    time: '14:00',
    status: 'Tamamlandı',
  },
  {
    id: 'h2',
    salonName: 'Glow Beauty & Salon',
    serviceName: 'Cilt Bakımı (Klasik)',
    price: 300,
    date: '28.06.2026',
    time: '11:30',
    status: 'Tamamlandı',
  },
  {
    id: 'h3',
    salonName: 'Elegance Bayan Kuaförü',
    serviceName: 'Manikür & Pedikür',
    price: 200,
    date: '15.06.2026',
    time: '16:00',
    status: 'Tamamlandı',
  },
];

export default function ProfileScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Sayfa açıldığında kullanıcı bilgilerini ve varsa kaydedilmiş profil resmini çekiyoruz
  useEffect(() => {
    const loadProfileData = async () => {
      // Kullanıcı verisi
      const userRaw = await AsyncStorage.getItem('user');
      if (userRaw) {
        setUserData(JSON.parse(userRaw));
      }
      // Kaydedilmiş profil resmi URI'si
      const savedImage = await AsyncStorage.getItem('profile_image_uri');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    };
    loadProfileData();
  }, []);

  // Galeriden Fotoğraf Seçme Fonksiyonu
  const pickImage = async () => {
    // Galeriden resim seçmek için izin iste
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("İzin Gerekli ⚠️", "Profil fotoğrafı değiştirmek için galeri izni vermeniz gerekmektedir.");
      return;
    }

    // Galeriyi Aç
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Kullanıcı resmi kırpabilsin (kare yapsın)
      aspect: [1, 1], // 1:1 kare oranına zorla (yuvarlak avatar için mükemmel olur)
      quality: 0.7, // Performans için kaliteyi biraz optimize et
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      const selectedUri = result.assets[0].uri;
      setProfileImage(selectedUri); // Ekranda göstermek için state'i güncelle
      await AsyncStorage.setItem('profile_image_uri', selectedUri); // Kalıcı olması için kaydet
    }
  };

  // Toplam harcanan tutarı hesapla
  const totalSpent = MOCK_HISTORY.reduce((sum, item) => sum + item.price, 0);

  // Randevu geçmişi kart tasarımı
  const renderHistoryItem = ({ item }: { item: typeof MOCK_HISTORY[0] }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.salonName}>{item.salonName}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardDivider} />
      
      <View style={styles.cardDetails}>
        <Text style={styles.serviceName}>💇‍♀️ {item.serviceName}</Text>
        <Text style={styles.priceText}>{item.price} TL</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>📅 {item.date} - {item.time}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ÜST KISIM: KİŞİSEL BİLGİLER VE FOTOĞRAF SEÇİCİ */}
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.8}>
          {profileImage ? (
            // Eğer resim seçildiyse onu göster
            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
          ) : (
            // Resim yoksa baş harfi göster
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {userData?.email ? userData.email.charAt(0).toUpperCase() : 'B'}
              </Text>
            </View>
          )}
          {/* Küçük Düzenle İkonu Görünümü */}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>📸</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={pickImage}>
          <Text style={styles.changePhotoText}>Fotoğrafı Değiştir</Text>
        </TouchableOpacity>

        <Text style={styles.userEmail}>{userData?.email || 'Kullanıcı Yükleniyor...'}</Text>
        <Text style={styles.userRole}>Müşteri Profili</Text>
      </View>

      {/* ÖZET İSTATİSTİK KARTLARI */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{MOCK_HISTORY.length}</Text>
          <Text style={styles.statLabel}>Toplam Randevu</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#2b8a3e' }]}>{totalSpent} TL</Text>
          <Text style={styles.statLabel}>Toplam Harcama</Text>
        </View>
      </View>

      {/* ALT KISIM: RANDEVU GEÇMİŞİ LİSTESİ */}
      <View style={styles.historyContainer}>
        <Text style={styles.sectionTitle}>Randevu Geçmişim</Text>
        
        <FlatList
          data={MOCK_HISTORY}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

      {/* GÜVENLİ ÇIKIŞ BUTONU */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={async () => {
            Alert.alert("Oturumu Kapat", "Çıkış yapmak istediğinize emin misiniz?", [
              { text: "İptal", style: "cancel" },
              { 
                text: "Evet, Çık", 
                onPress: async () => {
                  await AsyncStorage.removeItem('user');
                  // Giriş ekranına dönmek için sayfayı tetikle veya reload et
                  Alert.alert("Çıkış Yapıldı", "Lütfen uygulamayı yeniden başlatın veya login akışını tetikleyin.");
                } 
              }
            ]);
          }}
        >
          <Text style={styles.logoutText}>Güvenli Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  profileHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderColor: '#e9ecef',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#e52d6e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e52d6e',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#e52d6e',
  },
  avatarLetter: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  editBadgeText: { fontSize: 13 },
  changePhotoText: { fontSize: 13, color: '#e52d6e', fontWeight: '600', marginBottom: 12 },
  userEmail: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  userRole: { fontSize: 13, color: '#868e96', marginTop: 4 },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginVertical: 15,
    gap: 15,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#e52d6e' },
  statLabel: { fontSize: 12, color: '#6c757d', marginTop: 4 },
  historyContainer: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  salonName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  statusBadge: { backgroundColor: '#e6fcf5', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  statusText: { color: '#0ca678', fontSize: 11, fontWeight: 'bold' },
  cardDivider: { height: 1, backgroundColor: '#f1f3f5', marginVertical: 10 },
  cardDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: 14, color: '#495057', fontWeight: '500' },
  priceText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  cardFooter: { marginTop: 10, alignItems: 'flex-start' },
  dateText: { fontSize: 12, color: '#868e96' },
  footer: { padding: 15, backgroundColor: '#f8f9fa' },
  logoutButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e53e3e',
    marginBottom: 10,
  },
  logoutText: { color: '#e53e3e', fontWeight: 'bold', fontSize: 15 },
});