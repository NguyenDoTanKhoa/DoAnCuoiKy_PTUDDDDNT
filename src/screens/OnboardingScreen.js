import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const OnboardingScreen = ({ navigation }) => {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
      }}>
      
      {/* Họ tên và MSSV ở trên cùng */}
      <View style={{ position: 'absolute', top: 40 }}>
        <Text
          style={{
            color: 'black',
            fontSize: 16,
            fontWeight: 'bold',
            fontFamily: 'Roboto-MediumItalic',
            textAlign: 'center',
          }}>
          Họ tên: Nguyễn Đỗ Tấn Khoa{"\n"}MSSV: 2124802010733
        </Text>
      </View>

      {/* Nút Admin đăng nhập */}
      <TouchableOpacity
        style={{
          backgroundColor: '#AD40AF',
          padding: 20,
          width: '90%',
          borderRadius: 10,
          marginBottom: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
        onPress={() => navigation.navigate('AppStack')}>
        <Text
          style={{
            color: 'white',
            fontSize: 18,
            textAlign: 'center',
            fontWeight: 'bold',
            fontFamily: 'Roboto-MediumItalic',
          }}>
          Admin đăng nhập
        </Text>
        <MaterialIcons name="arrow-forward-ios" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Nút Khách hàng đăng nhập */}
      <TouchableOpacity
        style={{
          backgroundColor: '#AD40AF',
          padding: 20,
          width: '90%',
          borderRadius: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
        onPress={() => navigation.navigate('KhachHang')}>
        <Text
          style={{
            color: 'white',
            fontSize: 18,
            textAlign: 'center',
            fontWeight: 'bold',
            fontFamily: 'Roboto-MediumItalic',
          }}>
          Khách hàng đăng nhập
        </Text>
        <MaterialIcons name="arrow-forward-ios" size={22} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
