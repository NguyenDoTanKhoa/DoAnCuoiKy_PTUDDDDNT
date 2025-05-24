import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Login from '../screens/Login';
import KhachHangScreen from '../screens/KhachHangScreen';
import TablesScreen from '../screens/TablesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoaiMonScreen from '../screens/LoaiMonScreen';
import MonScreen from '../screens/MonScreen';
import ThanhToanScreen from '../screens/ThanhToanScreen';

const Stack = createNativeStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="KhachHang" component={KhachHangScreen} />
      <Stack.Screen name="TablesScreen" component={TablesScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="LoaiMon" component={LoaiMonScreen} />
      <Stack.Screen name="Mon" component={MonScreen} />
      <Stack.Screen name="ThanhToan" component={ThanhToanScreen} />

    </Stack.Navigator>
  );
};

export default AuthStack;