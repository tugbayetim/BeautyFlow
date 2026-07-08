import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ImageBackground, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = "http://10.0.2.2:8000";

// BURASI DEĞİŞTİ: setIsLoggedIn parametresini içeriye prop olarak aldık!
export default function LoginScreen({ navigation, setIsLoggedIn }: { navigation: any, setIsLoggedIn: (value: boolean) => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Hata', 'Lütfen telefon numarası ve şifrenizi girin.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/mobile/login`, {
        phone: phone.trim(),
        password: password.trim()
      });

      if (response.data.status === 'success') {
        // Kullanıcı verisini telefona (AsyncStorage) kalıcı olarak kaydediyoruz
        await AsyncStorage.setItem('user', JSON.stringify(response.data.customer));
        
        Alert.alert('Başarılı', `Hoş geldiniz, ${response.data.customer.name}!`);
        
        // App.tsx bunu duyar duymaz Login ekranını kapatıp HomeScreen'i otomatik açacak!
        setIsLoggedIn(true); 
      } else {
        Alert.alert('Hata', 'Giriş bilgileri doğrulanamadı.');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Giriş yapılamadı. Bağlantıyı kontrol edin.';
      Alert.alert('Giriş Başarısız', errorMsg);
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

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Şifremi Unuttum?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionButtonText}>GİRİŞ YAP</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchLink} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.switchLinkText}>Hesabınız yok mu? <Text style={styles.switchLinkBold}>Kayıt Olun</Text></Text>
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
    borderRadius: 20,
    padding: 18,
    width: '90%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBFBFB', borderWidth: 1, borderColor: '#E5D6DC', borderRadius: 20, paddingHorizontal: 12, marginBottom: 10, width: '100%' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#333' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 15 },
  forgotPasswordText: { color: '#B56580', fontSize: 12, fontWeight: '500' },
  actionButton: { backgroundColor: '#E083A4', borderRadius: 20, paddingVertical: 10, width: '100%', alignItems: 'center', marginBottom: 15 },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  switchLink: { marginTop: 5 },
  switchLinkText: { color: '#555', fontSize: 12 },
  switchLinkBold: { fontWeight: '700', color: '#B56580' },
});