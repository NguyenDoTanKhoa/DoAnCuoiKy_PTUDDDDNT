import React from 'react';
import {
  View,
  Text,
  Image,
  Platform
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from '@react-navigation/drawer';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { DrawerActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

const CustomDrawer = ({ userData, ...props }) => {
  const handleLogout = async () => {
  try {
    // Đánh dấu là đăng xuất thủ công
    await AsyncStorage.setItem('isManualLogout', 'true');
    
    // Đăng xuất Firebase
    await auth().signOut();
    await AsyncStorage.removeItem('rememberedCredentials');
        // Đóng drawer và điều hướng
    props.navigation.dispatch(DrawerActions.closeDrawer());
    props.navigation.navigate('AuthStack');
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
  }
};

  return (
    <View style={{flex: 1}}>
      <DrawerContentScrollView 
        {...props}
        contentContainerStyle={{ padding: 0 }}
        style={{ padding: 0, margin: 0 }}
      >
        {/* Header */}
        <View>
          <Image
            source={require('../assets/images/logothemira.png')}
            style={{height: 175, width: 294, resizeMode: 'contain'}}
          />
          <Text style={{fontSize: 18, marginBottom: 5}}>
            Xin chào, {userData?.username || 'người dùng'}!
          </Text>
          <Text style={{
            fontSize: 30,
            color: '#FFA500',
            marginBottom: 9,
            fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
          }}>
            The Mira Restaurant
          </Text>
        </View>

        <DrawerItem
          label="Trang chính"
          icon={({ size }) => (
            <MaterialIcons
              name="home"
              size={size}
              color={
                props.state.index === props.state.routeNames.indexOf('MainTabs')
                ? 'red'
                : '#333'
              }
              style={{ marginLeft: 10 }}
            />
          )}
          focused={props.state.index === props.state.routeNames.indexOf('MainTabs')}
          onPress={() => {
            props.navigation.navigate('MainTabs');
          }}
          style={{
            marginHorizontal: -15,
            borderRadius: 0,
            backgroundColor:
              props.state.index === props.state.routeNames.indexOf('MainTabs')
              ? '#FFA500'
              : 'transparent',
          }}
          labelStyle={{
            marginLeft: 3,
            color:
              props.state.index === props.state.routeNames.indexOf('MainTabs')
              ? 'red'
              : '#333',
          }}
        />

        <Text style={{ marginLeft: 9, marginBottom: 10, fontWeight: 'bold', color: 'gray', marginTop: 10 }}>
          Quản lý
        </Text>
        
        <View style={{ paddingHorizontal: 0, marginHorizontal: -15 }}>
          <DrawerItemList 
            {...props}
            itemStyle={{
              marginVertical: 0,
              borderRadius: 0,
              marginHorizontal: 0,
            }}
            labelStyle={{
              marginLeft: -10,
              fontSize: 16,
            }}
          />
        </View>
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={{padding: 14.7, borderTopWidth: 1, borderTopColor: '#ccc'}}>
        <DrawerItem
          label="Đăng xuất"
          icon={({color, size}) => <MaterialIcons name="logout" size={size} color={color} />}
          onPress={handleLogout}
          style={{
            marginHorizontal: -5,
            borderRadius: 0,
          }}
        />
      </View>
    </View>
  );
};

export default CustomDrawer;