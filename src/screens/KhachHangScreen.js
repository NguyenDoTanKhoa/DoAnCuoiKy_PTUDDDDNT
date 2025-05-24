import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ImageBackground,
  StyleSheet,
  BackHandler
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

const KhachHangScreen = ({ navigation, route }) => {
  const { userData } = route.params || {};
  const maquyen = route?.params?.userData?.maquyen;
  const maUser = route?.params?.userData?.maUser;

  const handleLogout = async () => {
  try {
    // Đánh dấu là đăng xuất thủ công
    await AsyncStorage.setItem('isManualLogout', 'true');
    
    // Đăng xuất Firebase
    await auth().signOut();
    await AsyncStorage.removeItem('rememberedCredentials');
    navigation.navigate('Login');
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
  }
};

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.navigate('Login');
        return true;
      }
    );
  
    return () => backHandler.remove();
  }, [navigation]);

  return (
    <ImageBackground
      source={require('../assets/images/templatedangnhap.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Nút Thông tin cá nhân */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('ProfileScreen', { userData })}
            style={styles.buttonWrapper}
          >
            <LinearGradient
                                  colors={['#FF69B4', '#FFD700']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.gradientButton}
                                >
              <Text style={styles.buttonText}>Thông tin cá nhân</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Nút Danh sách bàn */}
          <TouchableOpacity
            onPress={() => navigation.navigate('TablesScreen', { maUser, maquyen })}
            style={styles.buttonWrapper}
          >
            <LinearGradient
                                  colors={['#FF69B4', '#FFD700']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.gradientButton}
                                >
              <Text style={styles.buttonText}>Đặt bàn</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Nút Đăng xuất */}
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.buttonWrapper}
          >
            <LinearGradient
                                  colors={['#FF69B4', '#FFD700']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.gradientButton}
                                >
              <Text style={styles.buttonText}>Đăng xuất</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    marginTop: 185,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  buttonWrapper: {
    width: '90%',
    marginBottom: 20,
    borderRadius: 10,
    paddingVertical: 12,
    overflow: 'hidden', // Quan trọng để gradient hiển thị đúng border radius
  },
  gradientButton: {
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default KhachHangScreen;