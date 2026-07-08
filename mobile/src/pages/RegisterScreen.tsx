import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ImageBackground, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.105:8080';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
  if (!name || !phone || !password) {
    Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
    return;
  }

  setLoading(true);
  try {
    // Verileri eksiksiz ve düzgün bir JSON formatında gönderiyoruz
    const response = await axios.post(`${API_URL}/mobile/register`, {
      name: name,
      phone: phone,
      password: password,
      salon_id: 1 // Eğer veritabanında salons tablosunda ID'si 1 olan bir salon varsa
    });

    if (response.data.status === 'success') {
      Alert.alert('Başarılı', 'Hesabınız oluşturuldu!', [
        { text: 'Giriş Yap', onPress: () => navigation.navigate('Login') }
      ]);
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.detail || 'Kayıt işlemi başarısız.';
    Alert.alert('Hata', errorMsg);
  } finally {
    setLoading(false);
  }
};

  return (
    <ImageBackground 
      source={require('../../assets/foto1.jpeg')}
      style={styles.backgroundImage}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.logoText}>BeautyFlow</Text>

          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color="#E083A4" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ad Soyad"
                placeholderTextColor="#A1A1A1"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={18} color="#E083A4" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Telefon Numarası"
                placeholderTextColor="#A1A1A1"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color="#E083A4" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor="#A1A1A1"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionButtonText}>KAYIT OL</Text>}
            </TouchableOpacity>

            

            <TouchableOpacity style={styles.switchLink} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.switchLinkText}>Zaten hesabınız var mı? <Text style={styles.switchLinkBold}>Giriş Yapın</Text></Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, resizeMode: 'cover' },
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 30, paddingBottom: 60 },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#B56580',
    marginBottom: 15,
    letterSpacing: 1,
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20, padding: 18, width: '90%', maxWidth: 320, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5
  },  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBFBFB', borderWidth: 1, borderColor: '#E5D6DC', borderRadius: 20, paddingHorizontal: 12, marginBottom: 10, width: '100%' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#333' },
  actionButton: { backgroundColor: '#E083A4', borderRadius: 20, paddingVertical: 10, width: '100%', alignItems: 'center', marginBottom: 15, marginTop: 5 },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  socialContainer: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  socialButton: { padding: 8, backgroundColor: '#fff', borderRadius: 50, borderWidth: 1, borderColor: '#EEE', width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  switchLink: { marginTop: 5 },
  switchLinkText: { color: '#555', fontSize: 12 },
  switchLinkBold: { fontWeight: '700', color: '#B56580' },
});