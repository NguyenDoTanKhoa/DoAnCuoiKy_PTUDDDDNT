import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  ImageBackground,
  Alert,
  ActivityIndicator
} from 'react-native';
import { 
  TextInput, 
  Provider as PaperProvider, 
  Menu, 
  Divider, 
  Portal,
  Dialog
} from 'react-native-paper';
import database from '@react-native-firebase/database';
import LinearGradient from 'react-native-linear-gradient';

const ReservationsScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [visibleMenuId, setVisibleMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null); // 'approve' hoặc 'reject'
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Load reservations from Firebase
  useEffect(() => {
  const reservationsRef = database().ref('thongbaodatban');
  
  const subscriber = reservationsRef.on('value', async (snapshot) => {
    try {
      const reservationsData = snapshot.val();
      if (reservationsData) {
        const reservationsArray = [];
        
        // Duyệt qua từng key và kiểm tra null
        for (const key of Object.keys(reservationsData)) {
          const item = reservationsData[key];
          
          // Bỏ qua nếu item là null hoặc không có trường bắt buộc
          if (!item || !item.maBan || !item.maUser || !item.ngayDat) {
            console.warn('Invalid reservation data:', key, item);
            continue;
          }

          try {
            // Lấy thông tin bàn
            const tableSnapshot = await database().ref(`ban/${item.maBan}`).once('value');
            const tableData = tableSnapshot.val();
            
            // Lấy thông tin user
            const userSnapshot = await database().ref(`Users/${item.maUser}`).once('value');
            const userData = userSnapshot.val();
            
            reservationsArray.push({
              id: key,
              id_notify: item.id_notify || key,
              maBan: item.maBan,
              tableName: tableData?.tenBan || `Bàn ${item.maBan}`,
              customerName: userData?.fullName || 'Khách vãng lai',
              date: item.ngayDat.split(' ')[0] || 'Không xác định',
              time: item.ngayDat.split(' ')[1] || '',
              maUser: item.maUser
            });
          } catch (error) {
            console.error(`Error processing reservation ${key}:`, error);
          }
        }
        
        setReservations(reservationsArray);
      } else {
        setReservations([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading reservations:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đặt bàn');
      setLoading(false);
    }
  });

  return () => reservationsRef.off('value', subscriber);
}, []);

  const openMenu = (id, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setVisibleMenuId(id);
  };

  const closeMenu = () => setVisibleMenuId(null);

  const filteredReservations = reservations.filter(reservation =>
    reservation.tableName.toLowerCase().includes(searchText.toLowerCase()) ||
    reservation.customerName.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleApprove = async (id) => {
    try {
      // Tìm reservation cần duyệt
      const reservation = reservations.find(item => item.id === id);
      
      if (reservation) {
        // Cập nhật trạng thái bàn thành 3 (đã đặt)
        await database().ref(`ban/${reservation.maBan}`).update({ tinhTrang: 3 });
        
        // Xóa thông báo
        await database().ref(`thongbaodatban/${id}`).remove();
        
        Alert.alert('Thành công', 'Đã duyệt đặt bàn thành công');
      }
    } catch (error) {
      console.error('Error approving reservation:', error);
      Alert.alert('Lỗi', 'Duyệt đặt bàn thất bại');
    }
    closeMenu();
  };

  const handleReject = async (id) => {
    try {
      // Tìm reservation cần từ chối
      const reservation = reservations.find(item => item.id === id);
      
      if (reservation) {
        // Cập nhật trạng thái bàn thành 1 (trống)
        await database().ref(`ban/${reservation.maBan}`).update({ tinhTrang: 1 });
        
        // Xóa thông báo
        await database().ref(`thongbaodatban/${id}`).remove();
        
        Alert.alert('Thành công', 'Đã từ chối đặt bàn');
      }
    } catch (error) {
      console.error('Error rejecting reservation:', error);
      Alert.alert('Lỗi', 'Từ chối đặt bàn thất bại');
    }
    closeMenu();
  };

   // Hàm mở dialog xác nhận
  const openConfirmDialog = (action, reservation) => {
    setSelectedAction(action);
    setSelectedReservation(reservation);
    setShowConfirmDialog(true);
    closeMenu(); // Đóng menu context nếu đang mở
  };

  // Hàm đóng dialog
  const closeConfirmDialog = () => {
    setShowConfirmDialog(false);
  };

  // Hàm xử lý khi xác nhận
  const handleConfirmAction = async () => {
    closeConfirmDialog();
    try {
      if (selectedAction === 'approve') {
        await handleApprove(selectedReservation.id);
      } else {
        await handleReject(selectedReservation.id);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Lỗi', 'Xử lý thất bại');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onLongPress={(e) => openMenu(item.id, e)}
      delayLongPress={300}
      style={styles.itemContainer}
    >
      <View style={styles.reservationInfo}>
        <Text style={styles.reservationText}>
          <Text style={styles.label}>Bàn: </Text>
          <Text style={styles.value}>{item.tableName}</Text>
        </Text>
        <Text style={styles.reservationText}>
          <Text style={styles.label}>Họ tên: </Text>
          <Text style={styles.value}>{item.customerName}</Text>
        </Text>
        <Text style={styles.reservationText}>
          <Text style={styles.label}>Ngày đặt: </Text>
          <Text style={styles.value}>{item.date} {item.time}</Text>
        </Text>
      </View>

      <Menu
        visible={visibleMenuId === item.id}
        onDismiss={closeMenu}
        anchor={{
          x: menuPosition.x,
          y: menuPosition.y
        }}
        contentStyle={styles.menuContent}
        style={styles.menuStyle}
      >
        <Menu.Item 
          onPress={() => openConfirmDialog('approve', item)}
          title="Duyệt"
          titleStyle={{ color: '#4CAF50' }}
        />
        <Divider />
        <Menu.Item
          onPress={() => openConfirmDialog('reject', item)}
          title="Không duyệt"
          titleStyle={{ color: '#F44336' }}
        />
      </Menu>
    </TouchableOpacity>
  );

  if (loading) {
      return (
        <ImageBackground
          source={require('../assets/images/templatechung.png')}
          style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}
          resizeMode="cover"
        >
          <ActivityIndicator size="large" color="#FFA500" />
          <Text style={{ marginTop: 10, color: '#FFA500' }}>Đang tải dữ liệu...</Text>
        </ImageBackground>
      );
    }

  return (
    <ImageBackground
      source={require('../assets/images/templatechung.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <PaperProvider>
        <View style={styles.container}>
          <TextInput
            mode="outlined"
            placeholder="Tìm thông báo..."
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={styles.searchInput}
            theme={{
              colors: {
                primary: '#FFA500',
                accent: '#FFA500',
                placeholder: '#888',
              },
              roundness: 18,
            }}
            left={
              <TextInput.Icon
                icon="magnify"
                color={isFocused ? '#FFA500' : 'grey'}
              />
            }
          />

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text>Đang tải dữ liệu...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredReservations}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Không có thông báo đặt bàn nào</Text>
              }
            />
          )}

           <Portal>
            <Dialog
              visible={showConfirmDialog}
              onDismiss={closeConfirmDialog}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle2}>Xác nhận</Dialog.Title>
              <Dialog.Content>
                <Text style={styles.notificationText}>
                  {selectedAction === 'approve' 
                    ? `Bạn có chắc muốn duyệt đặt bàn ${selectedReservation?.tableName}?`
                    : `Bạn có chắc muốn từ chối duyệt đặt bàn ${selectedReservation?.tableName}?`}
                </Text>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity onPress={handleConfirmAction}>
                    <LinearGradient
                                          colors={['#FF69B4', '#FFD700']}
                                          start={{ x: 0, y: 0 }}
                                          end={{ x: 1, y: 1 }}
                                          style={{
                                            padding: 16,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginTop: 13,
                                            borderRadius: 8,
                                            marginBottom: -5
                                          }}
                                        >
                      <Text style={styles.buttonText}>CÓ</Text>
                    </LinearGradient>
                  </TouchableOpacity>
          
                  <TouchableOpacity onPress={closeConfirmDialog}>
                    <LinearGradient
                                          colors={['#FF69B4', '#FFD700']}
                                          start={{ x: 0, y: 0 }}
                                          end={{ x: 1, y: 1 }}
                                          style={{
                                            padding: 16,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginTop: 13,
                                            borderRadius: 8,
                                            marginBottom: -5
                                          }}
                                        >
                      <Text style={styles.buttonText}>HUỶ</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Dialog.Content>
            </Dialog>
          </Portal>
        </View>
      </PaperProvider>
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
    padding: 8,
  },
  searchInput: {
    marginHorizontal: 10,
    marginVertical: 8,
    backgroundColor: '#fff',
    height: 49,
  },
  listContent: {
    paddingBottom: 8,
  },
  itemContainer: {
    marginBottom: 10,
    padding: 16,
    backgroundColor: '#FFDAB9',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    alignItems: 'center',
  },
  reservationInfo: {
    width: '100%',
  },
  reservationText: {
    fontSize: 16,
    marginBottom: 6,
    textAlign: 'center',
    paddingVertical: 2
  },
  label: {
    fontWeight: 'bold',
    color: '#555',
  },
  value: {
    color: '#000',
  },
  menuContent: {
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  dialog: {
    backgroundColor: 'white',
    borderColor: '#FFA500',
    borderWidth: 2,
    borderRadius: 20,
  },
  dialogContent: {
    paddingLeft: 5,
    paddingRight: 5
  },
  dialogTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 16,
    fontSize: 20,
    color: '#FFA500',
  },
  dialogTitle2: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 16,
    fontSize: 20,
    color: '#FFA500',
  },
  detailContainer: {
    paddingHorizontal: 8,
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailAvatar: {
    width: 90,
    height: 90,
  },
  detailInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  genderLabel: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  genderOptions: {
    flexDirection: 'row',
    flex: 0.96,
    justifyContent: 'space-between',
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleContainer: {
    marginTop: 5,
  },
  roleOptions: {
    flexDirection: 'row',
    marginTop: 3,
    marginLeft: -7.3
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quyenLabel: {
    fontWeight: 'bold',
  },
  gradientButton: {
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
    marginTop: 13
  },
  gradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#FFA500',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center'
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    marginBottom: -2
  },
  buttonGroupColumn: {
    marginTop: 16
  },
  reservationButton: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center'
  },
  reservationButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  notificationText: {
    textAlign: 'center',
    marginBottom: 5,
    fontSize: 16
  },
  menuStyle: {
    marginTop: -70, // Điều chỉnh vị trí menu nếu cần
  },
});

export default ReservationsScreen;