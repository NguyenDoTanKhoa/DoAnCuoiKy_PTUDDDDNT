import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ImageBackground } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useOrder } from '../../orderContext';
import database from '@react-native-firebase/database';

const ThanhToanScreen = ({ route, navigation }) => {
  const { orderItems, updateItemQuantity, removeItemFromOrder, clearOrder } = useOrder();
  const { maBan, tableName, maUser } = route.params || {};
    const [orderDate] = useState(() => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0'); // Lấy giờ
  const minutes = String(now.getMinutes()).padStart(2, '0'); // Lấy phút
  const day = String(now.getDate()).padStart(2, '0'); // Lấy ngày
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Lấy tháng (tháng trong Date bắt đầu từ 0)
  const year = now.getFullYear(); // Lấy năm
  
  // Kết hợp lại theo định dạng "22/05/2025 12:48" (giờ phút sau ngày tháng năm)
  return `${day}/${month}/${year} ${hours}:${minutes}`;
});
const formattedDate = orderDate.split(' ')[0];
  const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCashPayment = async () => {
  if (orderItems.length === 0) {
    Alert.alert('Thông báo', 'Không có món nào để thanh toán');
    return;
  }

  try {
    // Lấy hóa đơn có mã lớn nhất để tạo mã mới
    const snapshot = await database().ref('HoaDon').once('value');
    const invoices = snapshot.val() || {};
    
    // Tìm mã hóa đơn lớn nhất
    let maxId = 0; // Khai báo và khởi tạo
    Object.values(invoices).forEach(invoice => {
      if (invoice && invoice.maHoaDon) {
        const id = parseInt(invoice.maHoaDon);
        if (!isNaN(id) && id > maxId) {
          maxId = id;
        }
      }
    });

    
    const newInvoiceId = maxId + 1;

    // Tạo hóa đơn mới
    const invoiceData = {
      maBan: maBan,
      maHoaDon: newInvoiceId,
      maUser: maUser,
      ngayDat: orderDate,
      tinhTrang: 1,
      tongTien: totalAmount
    };

    // Tạo chi tiết hóa đơn
    const invoiceItems = orderItems.map(item => ({
      maHoaDon: newInvoiceId,
      maMon: item.maMon,
      soluong: item.quantity
    }));

    // Lưu dữ liệu
    await database().ref(`HoaDon/${newInvoiceId}`).set(invoiceData);
    
    // Lưu chi tiết hóa đơn
    const batchUpdates = {};
    invoiceItems.forEach(item => {
      const itemKey = database().ref('Chitiethoadon').push().key;
      batchUpdates[`Chitiethoadon/${itemKey}`] = item;
    });
    await database().ref().update(batchUpdates);

    // Cập nhật trạng thái bàn về 1 (trống)
    await database().ref(`ban/${maBan}`).update({ tinhTrang: 1 });

    // Xóa giỏ hàng và quay về
    clearOrder();
    Alert.alert('Thành công', 'Thanh toán thành công');
    navigation.goBack();
    route.params?.onPaymentSuccess?.();
    
  } catch (error) {
    console.error('Lỗi thanh toán:', error);
    Alert.alert('Lỗi', 'Thanh toán thất bại: ' + error.message);
  }
};
    // Tăng số lượng
    const increaseQuantity = (id) => {
      const item = orderItems.find(item => item.id === id);
      if (item) {
        updateItemQuantity(id, item.quantity + 1);
      }
    };
  
    // Giảm số lượng
    const decreaseQuantity = (id) => {
      const item = orderItems.find(item => item.id === id);
      if (item && item.quantity > 1) {
        updateItemQuantity(id, item.quantity - 1);
      }
    };
  
    // Xóa món - giữ nguyên vì đã có removeItemFromOrder từ context
    const removeItem = (id) => {
      removeItemFromOrder(id);
    };

  return (
    <ImageBackground
              source={require('../assets/images/templatechung.png')} // ảnh trong thư mục dự án
              style={styles.background}
              resizeMode="cover"
            >
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.tableName}>{tableName}</Text>
        <Text style={styles.orderDate}>{formattedDate}</Text>
      </View>

      {/* Danh sách món */}
      <ScrollView style={styles.itemsContainer}>
  {orderItems.map((item) => (
    <View key={item.id} style={styles.itemContainer}>
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity onPress={() => decreaseQuantity(item.id)}>
            <Icon name="remove-circle" size={24} color="#FF9800" />
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => increaseQuantity(item.id)}>
            <Icon name="add-circle" size={24} color="#FF9800" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.itemRightContainer}>
        <Text style={styles.itemPrice}>{(item.price * item.quantity).toLocaleString()} VNĐ</Text>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => removeItem(item.id)}
        >
          <Icon name="delete" size={24} color="#FF9800" />
        </TouchableOpacity>
      </View>
    </View>
  ))}
</ScrollView>

      {/* Tổng tiền */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Tổng tiền:</Text>
        <Text style={styles.totalAmount}>{totalAmount.toLocaleString()} VNĐ</Text>
      </View>

      {/* Phương thức thanh toán */}
      <View style={styles.paymentMethods}>
        <TouchableOpacity 
        activeOpacity={0.75} // Điều chỉnh độ trong suốt khi nhấn
        onPress={handleCashPayment}>
        <LinearGradient
            colors={['#FF69B4', '#FFD700']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
            padding: 16, // Giảm padding ngang
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 13,
            borderRadius: 8,
            marginBottom: -4,
            // Shadow cho iOS
            shadowColor: "black",
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.5,
            shadowRadius: 6,
            // Shadow cho Android
            elevation: 4
            }}
        >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
            THANH TOÁN BẰNG TIỀN MẶT
            </Text>
        </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
            onPress={() => navigation.navigate('LoaiMon', { role: 'customer' })}
        >
        <LinearGradient
            colors={['#FF69B4', '#FFD700']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
            padding: 16, // Giảm padding ngang
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 13,
            borderRadius: 8,
            marginBottom: -4,
            // Shadow cho iOS
            shadowColor: "black",
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.5,
            shadowRadius: 6,
            // Shadow cho Android
            elevation: 4
            }}
        >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
            THANH TOÁN BẰNG ZALOPAY
            </Text>
        </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
            onPress={() => navigation.navigate('LoaiMon', { role: 'customer' })}
        >
        <LinearGradient
            colors={['#FF69B4', '#FFD700']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
            padding: 16, // Giảm padding ngang
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 13,
            borderRadius: 8,
            marginBottom: -4,
            // Shadow cho iOS
            shadowColor: "black",
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.5,
            shadowRadius: 6,
            // Shadow cho Android
            elevation: 4,
            }}
        >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
            THANH TOÁN BẰNG PAYPAL
            </Text>
        </LinearGradient>
        </TouchableOpacity>

      </View>
    </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
    background: {
    flex: 1,
    justifyContent: 'center',
    },
    container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
    },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tableName: {
    fontSize: 19.5,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  orderDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  itemsContainer: {
    flex: 1,
    marginBottom: -5,
    margin: -5
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 'auto', // Đẩy toàn bộ khối sang phải
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 2,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 9
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
    marginLeft: 2.5
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantity: {
    marginHorizontal: 10,
    fontSize: 16,
    color: '#FF9800',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 16, // Khoảng cách giữa giá và icon xóa
    textAlign: 'right',
    minWidth: 100, // Đảm bảo có đủ không gian cho giá
  },
  totalContainer: {
    paddingTop: 12,
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#E53935',
  },
  paymentMethods: {
    marginBottom: 20,
  },
  paymentButton: {
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ThanhToanScreen;