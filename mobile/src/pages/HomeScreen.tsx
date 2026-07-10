import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, Linking, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; 

export default function HomeScreen({ navigation }: any) {
  const [userInitial, setUserInitial] = useState('U');
  const [salons, setSalons] = useState<any[]>([]); 
  const [loading, setLoading] = useState<boolean>(true); // Yükleme durumu için eklendi

  // 1. Kullanıcı Bilgisini Çekme
  useEffect(() => {
    const getUser = async () => {
      const userRaw = await AsyncStorage.getItem('user');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user?.name) {
          setUserInitial(user.name.charAt(0).toUpperCase());
        }
      }
    };
    getUser();
  }, []);

// 2. BACKEND'DEN GERÇEK SALONLARI ÇEKME
  useEffect(() => {
    const fetchSalons = async () => {
      try {
        setLoading(true);
        
        // Axios yerine yerleşik fetch kullanarak yerel ağ engelini aşıyoruz
        const response = await fetch('http://192.168.1.104:8080/salons');
        
        if (!response.ok) {
          throw new Error(`Sunucu hatası: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log("Gelen Salon Verisi:", responseData);
        
        if (Array.isArray(responseData)) {
          setSalons(responseData);
        } else if (responseData && Array.isArray(responseData.data)) {
          setSalons(responseData.data);
        } else {
          setSalons([]);
        }
      } catch (error) {
        console.error("Salonlar backendden çekilemedi:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSalons();
  }, []);

  const openMap = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch((err) => console.error("Harita açılamadı:", err));
  };

  const renderSalonCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('SalonDetail', { salon: item })} 
    >
      <Image 
        source={{ uri: item.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=150' }} 
        style={styles.logo} 
      />

      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.salonName} numberOfLines={1}>{item.name || "İsimsiz Salon"}</Text>
          <Text style={styles.rating}>⭐ {item.rating || '5.0'}</Text>
        </View>
        
        {/* PostgreSQL JSONB alanından veriyi güvenli okumak için güncellendi */}
        <Text style={styles.hours}>🕒 {item.working_hours?.general || item.hours || '09:00 - 20:00'}</Text>
        
        {item.address && (
          <TouchableOpacity 
            onPress={() => openMap(item.address)}
            activeOpacity={0.7}
            style={styles.addressTouchable}
          >
            <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>BeautyFlow</Text>
          <Text style={styles.subtitle}>En iyi salonları keşfet</Text>
        </View>
        <TouchableOpacity style={styles.profileAvatar} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.avatarText}>{userInitial}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#e52d6e" style={{ flex: 1, justifyContent: 'center' }} />
      ) : (
        <FlatList
          data={salons} 
          keyExtractor={(item, index) => (item?.id ? item.id.toString() : index.toString())}
          renderItem={renderSalonCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 40, color: '#6c757d' }}>Aktif salon bulunamadı.</Text>
          }
        />
      )}
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
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    maxHeight: 60,
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
    elevation: 4,
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
  addressTouchable: {
    marginTop: 2,
    paddingVertical: 2,
  },
  address: {
    fontSize: 12,
    color: '#e52d6e', 
    textDecorationLine: 'underline', 
  },
});