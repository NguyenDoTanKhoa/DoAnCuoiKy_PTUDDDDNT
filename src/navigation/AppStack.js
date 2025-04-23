import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReservationsScreen from '../screens/ReservationsScreen';
import LoaiMonScreen from '../screens/LoaiMonScreen';
import MonScreen from '../screens/MonScreen';
import TablesScreen from '../screens/TablesScreen';
import UsersScreen from '../screens/UsersScreen';
import ThongKeScreen from '../screens/ThongKeScreen';
import HoaDonScreen from '../screens/HoaDonScreen';
import DanhGiaScreen from '../screens/DanhGiaScreen';

import CustomDrawer from '../components/CustomDrawer';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

const TabHome = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: 'orange',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ color, size }) => {
          let iconName = '';
          if (route.name === 'Trang chủ') iconName = 'home';
          else if (route.name === 'Thông tin cá nhân') iconName = 'person';
          else if (route.name === 'Thông báo đặt bàn') iconName = 'notifications-active';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Trang chủ" component={HomeScreen} />
      <Tab.Screen name="Thông tin cá nhân" component={ProfileScreen} />
      <Tab.Screen name="Thông báo đặt bàn" component={ReservationsScreen} />
    </Tab.Navigator>
  );
};

const AppStack = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        drawerActiveBackgroundColor: '#FFA500',
        drawerActiveTintColor: 'red',
        drawerInactiveTintColor: '#333',
        drawerItemStyle: {
          borderRadius: 0,
          marginHorizontal: 0,
        },
        drawerStyle: {
            borderRadius: 0,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          },
      }}
    >
      {/* Tab Home gồm: Trang chủ, Thông tin, Đặt bàn */}
      <Drawer.Screen
        name="MainTabs"
        component={TabHome}
        options={{
            drawerLabel: () => null, // Không hiển thị trong drawer
            title: 'Trang chính',
            drawerIcon: () => null,  // Không hiển thị icon
            drawerItemStyle: { height: 0 }, // Không chiếm không gian
        }}
        />


      {/* Các menu quản lý */}
      <Drawer.Screen
        name="LoaiMon"
        component={LoaiMonScreen}
        options={{
          drawerLabel: 'Loại món',
          title: 'Quản lý loại món',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="category" color={color} size={size} 
            style={{ marginLeft: 11 }}
            />
          ),
          drawerLabelStyle: {
            marginLeft: 4, // Tạo khoảng cách giữa icon và chữ trong Drawer
          },
        }}
      />
      <Drawer.Screen
        name="Mon"
        component={MonScreen}
        options={{
          drawerLabel: 'Món',
          title: 'Quản lý món',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="restaurant-menu" color={color} size={size} 
            style={{ marginLeft: 11 }}
            />
          ),
          drawerLabelStyle: {
            marginLeft: 4, // Tạo khoảng cách giữa icon và chữ trong Drawer
          },
        }}
      />
      <Drawer.Screen
        name="Tables"
        component={TablesScreen}
        options={{
          drawerLabel: 'Bàn ăn',
          title: 'Quản lý bàn',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="table-restaurant" color={color} size={size} 
            style={{ marginLeft: 11 }}
            />
          ),
          drawerLabelStyle: {
            marginLeft: 4, // Tạo khoảng cách giữa icon và chữ trong Drawer
          },
        }}
      />
      <Drawer.Screen
        name="Users"
        component={UsersScreen}
        options={{
          drawerLabel: 'Người dùng',
          title: 'Quản lý người dùng',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="people" color={color} size={size} 
            style={{ marginLeft: 11 }}
            />
          ),
          drawerLabelStyle: {
            marginLeft: 4, // Tạo khoảng cách giữa icon và chữ trong Drawer
          },
        }}
      />
      <Drawer.Screen
        name="ThongKe"
        component={ThongKeScreen}
        options={{
          drawerLabel: 'Thống kê',
          title: 'Quản lý thống kê',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="bar-chart" color={color} size={size} 
            style={{ marginLeft: 11 }}
            />
          ),
          drawerLabelStyle: {
            marginLeft: 4, // Tạo khoảng cách giữa icon và chữ trong Drawer
          },
        }}
      />
      <Drawer.Screen
        name="HoaDon"
        component={HoaDonScreen}
        options={{
          drawerLabel: 'Hoá đơn',
          title: 'Quản lý hoá đơn',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="receipt" color={color} size={size} 
            style={{ marginLeft: 11 }}
            />
          ),
          drawerLabelStyle: {
            marginLeft: 4, // Tạo khoảng cách giữa icon và chữ trong Drawer
          },
        }}
      />
      <Drawer.Screen
        name="DanhGia"
        component={DanhGiaScreen}
        options={{
          drawerLabel: 'Đánh giá',
          title: 'Quản lý đánh giá',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="rate-review" color={color} size={size} 
            style={{ marginLeft: 11 }}
            />
          ),
          drawerLabelStyle: {
            marginLeft: 4, // Tạo khoảng cách giữa icon và chữ trong Drawer
          },
        }}
      />
    </Drawer.Navigator>
  );
};

export default AppStack;
