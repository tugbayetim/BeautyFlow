import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sahte (Mock) Kuaför Verileri
const MOCK_SALONS = [
  {
    id: '1',
    name: 'Elegance Bayan Kuaförü',
    logo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=150',
    rating: '4.8',
    hours: '09:00 - 20:00',
    address: 'Kanal Mah. Atatürk Cad. No:45',
  },
  {
    id: '2',
    name: 'Glow Beauty & Salon',
    logo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150',
    rating: '4.9',
    hours: '10:00 - 22:00',
    address: 'Fener Mah. Bülent Ecevit Bulv. No:12',
  },
  {
    id: '3',
    name: 'Asil Erkek Kuaförü',
    logo: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=150',
    rating: '4.6',
    hours: '08:30 - 21:00',
    address: 'Liman Mah. Gençlik Cad. No:8',
  },
];

export default function HomeScreen({ navigation }: any) {
  const [userInitial, setUserInitial] = useState('U');

  // Giriş yapan kullanıcının e-postasının baş harfini alıp avatara yazıyoruz
  useEffect(() => {
    const getUser = async () => {
      const userRaw = await AsyncStorage.getItem('user');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user?.email) {
          setUserInitial(user.email.charAt(0).toUpperCase());
        }
      }
    };
    getUser();
  }, []);

  // Her bir kuaför kartının tasarımı
  const renderSalonCard = ({ item }: { item: typeof MOCK_SALONS[0] }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('SalonDetail', { salon: item })}
    >
      {/* Sol Kısım: Kuaför Amblemi */}
      <Image source={{ uri: item.logo }} style={styles.logo} />

      {/* Sağ Kısım: Kuaför Bilgileri */}
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.salonName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rating}>⭐ {item.rating}</Text>
        </View>
        
        <Text style={styles.hours}>🕒 {item.hours}</Text>
        <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ÜST BAŞLIK ALANI (Yenilenen Kısım) */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>BeautyFlow</Text>
          <Text style={styles.subtitle}>En iyi salonları keşfet</Text>
        </View>
        
        {/* Yuvarlak Tıklanabilir Profil Avatarı */}
        <TouchableOpacity 
          style={styles.profileAvatar} 
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.avatarText}>{userInitial}</Text>
        </TouchableOpacity>
      </View>

      {/* Kuaförler Listesi */}
      <FlatList
        data={MOCK_SALONS}
        keyExtractor={(item) => item.id}
        renderItem={renderSalonCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e52d6e',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  // Yeni Eklenen Profil Avatarı Stili
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e52d6e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e52d6e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4, // Android gölge
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  salonName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  rating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffb100',
  },
  hours: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: '#868e96',
  },
});