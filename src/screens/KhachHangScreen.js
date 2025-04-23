import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import ProfileScreen from './ProfileScreen';
import TablesScreen from './TablesScreen';

const KhachHangScreen = ({ navigation }) => {
  const [currentScreen, setCurrentScreen] = useState('main');

  if (currentScreen === 'profile') {
    return <ProfileScreen />;
  }

  if (currentScreen === 'tables') {
    return <TablesScreen />;
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
      }}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setCurrentScreen('profile')}>
        <Text style={styles.buttonText}>Thông tin cá nhân</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setCurrentScreen('tables')}>
        <Text style={styles.buttonText}>Danh sách bàn</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#E53935' }]}
        onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Đăng xuất</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = {
  button: {
    backgroundColor: '#AD40AF',
    padding: 20,
    width: '90%',
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto-MediumItalic',
  },
};

export default KhachHangScreen;
