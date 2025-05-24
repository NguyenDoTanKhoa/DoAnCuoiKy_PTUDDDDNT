import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  Dimensions,
  Text,
  TouchableOpacity,
  BackHandler,
  Alert,
  ImageBackground,
  ActivityIndicator
} from 'react-native';
import {
  TextInput,
  Provider as PaperProvider,
  Menu,
  Divider,
  Portal,
  Dialog,
  IconButton
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import database from '@react-native-firebase/database';
import { Rating, AirbnbRating } from 'react-native-ratings';

const { width } = Dimensions.get('window');

const TablesScreen = ({route}) => {
  // State
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maquyen, setMaquyen] = useState(3); // Default to customer role

  // Admin states
  const [visibleMenuId, setVisibleMenuId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [showConfirmStatusDialog, setShowConfirmStatusDialog] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [editTableName, setEditTableName] = useState('');
  const [currentTableId, setCurrentTableId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedDeleteTableId, setSelectedDeleteTableId] = useState(null);
  const [selectedStatusTable, setSelectedStatusTable] = useState(null);

  // Customer states
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [showReservedDialog, setShowReservedDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showConfirmCancelDialog, setShowConfirmCancelDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const navigation = useNavigation();
  const maUser = route.params?.maUser;

  // Load tables from Firebase
  useEffect(() => {
    const tablesRef = database().ref('ban');
    
    const subscriber = tablesRef.on('value', snapshot => {
      try {
        const tablesData = snapshot.val();
        if (tablesData) {
          const tablesArray = Object.keys(tablesData)
            .map(key => {
              const item = tablesData[key];
              if (item && item.maBan && item.tenBan && item.tinhTrang) {
                return {
                  id: key,
                  maBan: item.maBan,
                  name: item.tenBan,
                  status: item.tinhTrang, // 1: Available, 2: Pending, 3: Reserved
                  maUser: item.maUser || 0
                };
              }
              return null;
            })
            .filter(item => item !== null);

          setTables(tablesArray);
        } else {
          setTables([]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading tables:', error);
        setLoading(false);
      }
    });

    return () => tablesRef.off('value', subscriber);
  }, []);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.goBack();
        return true;
      }
    );
  
    return () => backHandler.remove();
  }, [navigation]);
  
  useEffect(() => {
    if (route.params?.openAddDialog) {
      setShowAddDialog(true);
      navigation.setParams({ openAddDialog: false });
    }
  }, [route.params?.openAddDialog]);

  useEffect(() => {
    if (route.params?.maquyen) {
      setMaquyen(route.params.maquyen);
    }
  }, [route.params]);

  // Helper functions
  const [reservationDateTime, setReservationDateTime] = useState({
    date: null,
    time: null
  });
  
  const getDisplayDate = () => {
    return reservationDateTime.date 
      ? reservationDateTime.date.toLocaleDateString('vi-VN') 
      : 'CHỌN NGÀY';
  };
  
  const getDisplayTime = () => {
    return reservationDateTime.time 
      ? reservationDateTime.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : 'CHỌN GIỜ';
  };

  const handleDateChange = (event, selectedDate) => {
    // This will hide the picker regardless of OK or Cancel
    setShowDatePicker(false);
    
    // Only update date if user pressed OK
    if (event.type === 'set' && selectedDate) {
      setReservationDateTime(prev => ({
        ...prev,
        date: selectedDate
      }));
    }
  };
  
  const handleTimeChange = (event, selectedTime) => {
    // This will hide the picker regardless of OK or Cancel
    setShowTimePicker(false);
    
    // Only update time if user pressed OK
    if (event.type === 'set' && selectedTime) {
      setReservationDateTime(prev => ({
        ...prev,
        time: selectedTime
      }));
    }
  };

  const getStatusImage = (status) => {
    switch(status) {
      case 3: // RESERVED
        return require('../assets/images/dadat.png');
      case 2: // PENDING
        return require('../assets/images/pending.png');
      case 1: // AVAILABLE
      default:
        return require('../assets/images/controng.png');
    }
  };

  const getStatusName = (status) => {
    switch(status) {
      case 3: return 'Đã đặt';
      case 2: return 'Đang chờ';
      case 1: return 'Trống';
      default: return 'Không xác định';
    }
  };

  const handleSubmitFeedback = async () => {
  try {
    // Kiểm tra dữ liệu đầu vào
    if (!feedback.trim() || rating === 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập đánh giá và chọn số sao');
      return;
    }

    // Lấy mã đánh giá mới
    const danhgiaRef = database().ref('danhgia');
    const snapshot = await danhgiaRef.once('value');
    const danhgiaList = snapshot.val() || {};
    
    // Tìm mã đánh giá lớn nhất hiện có
    let maxId = 0;
    Object.values(danhgiaList).forEach(item => {
      if (item && item.madanhgia && item.madanhgia > maxId) {
        maxId = item.madanhgia;
      }
    });

    // Lấy ngày hiện tại theo định dạng dd/mm/yyyy
    const now = new Date();
    const ngaydanhgia = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const newDanhGia = {
      maUser: maUser,
      madanhgia: maxId + 1,
      noidung: feedback,
      rate: rating,
      ngaydanhgia: ngaydanhgia,
    };

    // Lưu vào Firebase
    await danhgiaRef.child(newDanhGia.madanhgia.toString()).set(newDanhGia);

    // Thông báo thành công
    Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá!');
    
    // Đóng dialog và reset form
    setShowRatingDialog(false);
    setFeedback('');
    setRating(0);
    
  } catch (error) {
    console.error('Lỗi khi gửi đánh giá:', error);
    Alert.alert('Lỗi', 'Gửi đánh giá thất bại: ' + error.message);
  }
};

  // Menu handlers
  const openMenu = (id, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setVisibleMenuId(id);
  };

  const closeMenu = () => setVisibleMenuId(null);

  // Filter tables
  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Check if table name exists
  const checkTableNameExists = async (name, excludeId = null) => {
    try {
      const snapshot = await database().ref('ban')
        .orderByChild('tenBan')
        .equalTo(name)
        .once('value');
      
      if (!snapshot.exists()) return false;
      
      const data = snapshot.val();
      if (excludeId) {
        return Object.keys(data).some(key => key !== excludeId);
      }
      return true;
    } catch (error) {
      console.error('Error checking table name:', error);
      return true;
    }
  };

  // Add table
  const handleAddTable = async () => {
    if (!newTableName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên bàn');
      return;
    }

    try {
      // Check if name already exists
      const nameExists = await checkTableNameExists(newTableName);
      if (nameExists) {
        Alert.alert('Lỗi', 'Tên bàn đã tồn tại');
        return;
      }

      // Get all tables to find the next ID
      const snapshot = await database().ref('ban').once('value');
      
      let nextMaBan = 1;
      if (snapshot.exists()) {
        const data = snapshot.val();
        const keys = Object.keys(data).map(k => parseInt(k)).filter(n => !isNaN(n));
        const maxKey = keys.length > 0 ? Math.max(...keys) : 0;
        nextMaBan = maxKey + 1;
      }

      const newTable = {
        tenBan: newTableName,
        tinhTrang: 1, // Available by default
        maBan: nextMaBan,
        maUser: 0
      };

      // Write to Firebase with numeric key
      await database().ref(`ban/${nextMaBan}`).set(newTable);

      setNewTableName('');
      setShowAddDialog(false);
      Alert.alert('Thành công', 'Thêm bàn thành công');
    } catch (error) {
      console.error('Error adding table:', error);
      Alert.alert('Lỗi', 'Thêm bàn thất bại');
    }
  };

  // Edit table
  const handleEdit = (id) => {
    const table = tables.find(item => item.id === id);
    setEditTableName(table.name);
    setCurrentTableId(id);
    setShowEditDialog(true);
    closeMenu();
  };

  const handleUpdateTable = async () => {
    if (!editTableName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên bàn');
      return;
    }

    try {
      // Check if table is reserved or pending (status 2 or 3)
      const table = tables.find(t => t.id === currentTableId);
      if (table.status === 2 || table.status === 3) {
        Alert.alert('Lỗi', 'Bàn đang có người đặt, không thể sửa!');
        return;
      }

      // Check if name already exists (excluding current table)
      const nameExists = await checkTableNameExists(editTableName, currentTableId);
      if (nameExists) {
        Alert.alert('Lỗi', 'Tên bàn đã tồn tại');
        return;
      }

      // Update in database
      await database().ref(`ban/${currentTableId}`).update({
        tenBan: editTableName
      });

      setEditTableName('');
      setShowEditDialog(false);
      Alert.alert('Thành công', 'Cập nhật bàn thành công');
    } catch (error) {
      console.error('Error updating table:', error);
      Alert.alert('Lỗi', 'Cập nhật bàn thất bại');
    }
  };

  // Delete table
  const confirmDelete = (id) => {
    closeMenu();
    setSelectedDeleteTableId(id);
    setShowConfirmDeleteDialog(true);
  };

  const handleDeleteConfirmed = async () => {
    try {
      const id = selectedDeleteTableId;
      const table = tables.find(t => t.id === id);

      // Check if table is reserved or pending (status 2 or 3)
      if (table.status === 2 || table.status === 3) {
        Alert.alert('Lỗi', 'Bàn đang có người đặt, không thể xóa!');
        setShowConfirmDeleteDialog(false);
        return;
      }

      // Delete from database
      await database().ref(`ban/${id}`).remove();
      
      setShowConfirmDeleteDialog(false);
      Alert.alert('Thành công', 'Xóa bàn thành công');
    } catch (error) {
      console.error('Error deleting table:', error);
      Alert.alert('Lỗi', 'Xóa bàn thất bại');
      setShowConfirmDeleteDialog(false);
    }
  };

  // Update table status
  const confirmStatusUpdate = (id) => {
    closeMenu();
    const table = tables.find(t => t.id === id);
    setSelectedStatusTable(table);
    
    // Only show confirmation dialog if changing to available (1)
    if (table.status !== 1) {
      setShowConfirmStatusDialog(true);
    } else {
      updateTableStatus(table, 1);
    }
  };

  const updateTableStatus = async (table, newStatus) => {
    try {
      await database().ref(`ban/${table.id}`).update({
        tinhTrang: newStatus
      });
      
      if (newStatus === 1) {
        // Also reset soLuong when setting to available
        await database().ref(`ban/${table.id}`).update({
          soLuong: 0
        });
      }
      
      setShowConfirmStatusDialog(false);
      Alert.alert('Thành công', 'Cập nhật trạng thái bàn thành công');
    } catch (error) {
      console.error('Error updating table status:', error);
      Alert.alert('Lỗi', 'Cập nhật trạng thái bàn thất bại');
      setShowConfirmStatusDialog(false);
    }
  };

  // Customer actions
const handleTablePress = (table) => {
  if (maquyen === 3) { // Customer role
    setSelectedTable(table);

    if (table.status === 1) {
      // Available → cho đặt
      setShowReservationDialog(true);
    } else if (table.status === 2 || table.status === 3) {
      // Đã có người đặt
      if (table.maUser === maUser) {
        // Bàn do chính người dùng này đặt
        if (table.status === 2) {
          setShowPendingDialog(true);
        } else {
          setShowReservedDialog(true);
        }
      } else {
        // Bàn do người khác đặt → cấm truy cập
        Alert.alert('Thông báo', 'Bàn đã có người đặt!');
      }
    }
  }
};


  const formatDateTime = (date) => {
    const pad = (n) => (n < 10 ? '0' + n : n);
  
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
  
    return `${day}/${month}/${year} ${hour}:${minute}`;
  };
  
  const handleReservation = async () => {
    if (!reservationDateTime.date) {
      Alert.alert('Thông báo', 'Vui lòng chọn ngày đặt');
      return;
    }
  
    if (!reservationDateTime.time) {
      Alert.alert('Thông báo', 'Vui lòng chọn giờ đặt');
      return;
    }
  
    // Combine date and time
    const combinedDateTime = new Date(
      reservationDateTime.date.getFullYear(),
      reservationDateTime.date.getMonth(),
      reservationDateTime.date.getDate(),
      reservationDateTime.time.getHours(),
      reservationDateTime.time.getMinutes()
    );
  
    // Format lại thời gian theo định dạng dd/MM/yyyy HH:mm
    const formattedDateTime = formatDateTime(combinedDateTime);
  
    try {
      // 1. Cập nhật trạng thái bàn trong Firebase
      await database().ref(`ban/${selectedTable.id}`).update({
        tinhTrang: 2,
        maUser: maUser,
      });
  
      // 2. Lấy danh sách thông báo hiện tại trong Firebase
      const notifySnapshot = await database().ref('thongbaodatban').once('value');
      const notifies = notifySnapshot.val() || {};
  
      // Tìm ID lớn nhất và tăng thêm 1 để tạo id_notify mới
      const currentIds = Object.keys(notifies).map(id => parseInt(id)).filter(id => !isNaN(id));
      const nextId = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;
  
      // 3. Ghi thông báo đặt bàn mới vào Firebase với id_notify tự tăng
      await database().ref(`thongbaodatban/${nextId}`).set({
        id_notify: nextId,
        maBan: selectedTable.maBan,
        maUser: maUser,
        ngayDat: formattedDateTime, // Lưu ngày/tháng/năm giờ:phút
      });
  
      // Đóng dialog và hiển thị thông báo thành công
      setShowReservationDialog(false);
      Alert.alert('Thành công', 'Đặt bàn thành công!');
    } catch (error) {
      console.error('Error making reservation:', error);
      Alert.alert('Lỗi', 'Đặt bàn thất bại');
    }
  };

  const handleCancelConfirmed = async () => {
  try {
    await database().ref(`ban/${selectedTable.id}`).update({
      tinhTrang: 1,
      maUser: 0,
    });

    const maBan = selectedTable.maBan;

    const notifySnapshot = await database().ref('thongbaodatban').once('value');
    const notifies = notifySnapshot.val();

    if (notifies) {
      const matchingEntries = Object.entries(notifies).filter(
        ([key, value]) => value && value.maBan === maBan
      );

      for (const [notifyId] of matchingEntries) {
        await database().ref(`thongbaodatban/${notifyId}`).remove();
      }
    }

    setShowConfirmCancelDialog(false);
    setShowPendingDialog(false);
    setShowReservedDialog(false);
    Alert.alert('Thông báo', 'Đã huỷ đặt bàn thành công!');
  } catch (error) {
    console.error('Error canceling reservation:', error);
    Alert.alert('Lỗi', 'Huỷ đặt bàn thất bại');
    setShowConfirmCancelDialog(false);
  }
};



const confirmCancelReservation = (table) => {
  closeMenu();
  setSelectedTable(table); // đảm bảo đã set đúng table
  setShowConfirmCancelDialog(true);
  setShowPendingDialog(false);
  setShowReservedDialog(false);
};


  const navigateToOrderScreen = () => {
    setShowReservedDialog(false);
    navigation.navigate('LoaiMon', { maquyen });
  };

  const navigateToPaymentScreen = () => {
  setShowReservedDialog(false);
  navigation.navigate('ThanhToan', { 
    maBan: selectedTable?.maBan,       // Mã bàn từ API hoặc DB
    tableName: selectedTable?.name,    // Tên bàn hiển thị
    maUser: selectedTable?.maUser,
    onPaymentSuccess: () => setShowRatingDialog(true)
  });
};

  // Render table item
  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleTablePress(item)}
      onLongPress={maquyen !== 3 ? (e) => openMenu(item.id, e) : null}
      style={[
        styles.itemContainer,
        item.status === 3 && styles.reservedTable,
        item.status === 2 && styles.pendingTable
      ]}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={getStatusImage(item.status)} 
          style={styles.statusImage} 
          defaultSource={require('../assets/images/image.png')}
        />
      </View>
      <Text style={styles.tableName} numberOfLines={1}>{item.name}</Text>
      
      {maquyen !== 3 && (
        <Menu
          visible={visibleMenuId === item.id}
          onDismiss={closeMenu}
          anchor={{
            x: menuPosition.x,
            y: menuPosition.y
          }}
          contentStyle={styles.menuContent}
        >
          <Menu.Item onPress={() => handleEdit(item.id)} title="Sửa" />
          <Divider />
          <Menu.Item onPress={() => confirmStatusUpdate(item.id)} title="Cập nhật trạng thái" />
          <Divider />
          <Menu.Item
            onPress={() => confirmDelete(item.id)}
            title="Xoá"
            titleStyle={{ color: 'red' }}
          />
        </Menu>
      )}
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
            placeholder="Tìm bàn ăn..."
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={[styles.searchInput, { height: 49 }]}
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

          <FlatList
            data={filteredTables}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
                <Text style={{ color: '#FFA500', fontSize: 16 }}>Không có bàn nào</Text>
              </View>
            }
          />

          {/* Admin dialogs */}
          {maquyen !== 3 && (
            <>
              {/* Add table dialog */}
              <Portal>
                <Dialog
                  visible={showAddDialog}
                  onDismiss={() => setShowAddDialog(false)}
                  style={styles.dialog}
                >
                  <Dialog.Title style={{textAlign: 'center', fontWeight: 'bold', marginBottom: 20, marginTop: 16, fontSize: 20 }}>
                    Thêm bàn ăn
                  </Dialog.Title>           
                  <Dialog.Content>
                    <TextInput
                      label="Nhập tên bàn"
                      value={newTableName}
                      onChangeText={setNewTableName}
                      mode="outlined"
                      style={{ width: '100%', height: 43, marginBottom: 8, backgroundColor: '#fff'}}
                      left={<TextInput.Icon icon="pencil" color="#FFA500"/>}
                      theme={{ colors: { primary: '#FFA500', onSurfaceVariant: '#FFA500' } }}
                    />
                    <TouchableOpacity onPress={handleAddTable} style={{ borderRadius: 10, overflow: 'hidden', width: '100%', marginTop: 13 }}>
                      <LinearGradient
                        colors={['#FF69B4', '#FFD700']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>THÊM</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={() => setShowAddDialog(false)} style={{ borderRadius: 10, overflow: 'hidden', width: '100%', marginTop: 10 }}>
                      <LinearGradient
                        colors={['#FF69B4', '#FFD700']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>ĐÓNG</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Dialog.Content>
                </Dialog>
              </Portal>

              {/* Edit table dialog */}
              <Portal>
                <Dialog
                  visible={showEditDialog}
                  onDismiss={() => setShowEditDialog(false)}
                  style={styles.dialog}
                >
                  <Dialog.Title style={{textAlign: 'center', fontWeight: 'bold', marginBottom: 20, marginTop: 16, fontSize: 20 }}>
                    Sửa tên bàn
                  </Dialog.Title>  
                  <Dialog.Content>
                    <TextInput
                      label="Nhập tên bàn"
                      value={editTableName}
                      onChangeText={setEditTableName}
                      mode="outlined"
                      style={{ width: '100%', height: 43, marginBottom: 8, backgroundColor: '#fff'}}
                      left={<TextInput.Icon icon="pencil" color="#FFA500"/>}
                      theme={{ colors: { primary: '#FFA500', onSurfaceVariant: '#FFA500' } }}
                    />
                    <TouchableOpacity onPress={handleUpdateTable} style={{ borderRadius: 10, overflow: 'hidden', width: '100%', marginTop: 13 }}>
                      <LinearGradient
                        colors={['#FF69B4', '#FFD700']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>CẬP NHẬT</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowEditDialog(false)} style={{ borderRadius: 10, overflow: 'hidden', width: '100%', marginTop: 10 }}>
                      <LinearGradient
                        colors={['#FF69B4', '#FFD700']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>ĐÓNG</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Dialog.Content>
                </Dialog>
              </Portal>

              {/* Confirm delete dialog */}
              <Portal>
                <Dialog
                  visible={showConfirmDeleteDialog}
                  onDismiss={() => setShowConfirmDeleteDialog(false)}
                  style={styles.dialog}
                >
                  <Dialog.Title style={styles.dialogTitle}>Xác nhận</Dialog.Title>
                  <Dialog.Content>
                    <Text style={styles.notificationText}>
                      Bạn có chắc muốn xóa bàn này không?
                    </Text>
                    <View style={styles.buttonGroup2}>
                      <TouchableOpacity onPress={handleDeleteConfirmed}>
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
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>XÓA</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => setShowConfirmDeleteDialog(false)}>
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
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>HUỶ</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </Dialog.Content>
                </Dialog>
              </Portal>

              {/* Confirm status update dialog */}
              <Portal>
                <Dialog
                  visible={showConfirmStatusDialog}
                  onDismiss={() => setShowConfirmStatusDialog(false)}
                  style={styles.dialog}
                >
                  <Dialog.Title style={styles.dialogTitle}>Xác nhận</Dialog.Title>
                  <Dialog.Content>
                    <Text style={styles.notificationText}>
                      Bạn có chắc chắn muốn cập nhật trạng thái {selectedStatusTable?.name} thành trống không?
                    </Text>
                    <View style={styles.buttonGroup}>
                      <TouchableOpacity onPress={() => updateTableStatus(selectedStatusTable, 1)}>
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
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>CÓ</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => setShowConfirmStatusDialog(false)}>
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
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>KHÔNG</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </Dialog.Content>
                </Dialog>
              </Portal>
            </>
          )}

          {/* Customer dialogs */}
          {maquyen === 3 && (
            <>
              {/* Reservation dialog */}
              <Portal>
                <Dialog
                  visible={showReservationDialog}
                  onDismiss={() => setShowReservationDialog(false)}
                  style={styles.dialog}
                >
                  <Dialog.Title style={styles.dialogTitledatban}>{selectedTable?.name}</Dialog.Title>
                  <Dialog.Content>
                    <View style={{ marginVertical: 8 }}>
                      <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Ngày đặt</Text>
                      <TouchableOpacity 
                        onPress={() => setShowDatePicker(true)}
                        style={{ alignSelf: 'center' }}
                      >
                        <LinearGradient
                          colors={['#FF69B4', '#FFD700']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            width: 100,
                            paddingVertical: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>
                            {getDisplayDate()}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>

                    <View style={{ marginVertical: 8 }}>
                      <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Giờ đặt</Text>
                      <TouchableOpacity 
                        onPress={() => setShowTimePicker(true)}
                        style={{ alignSelf: 'center' }}
                      >
                        <LinearGradient
                          colors={['#FF69B4', '#FFD700']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            width: 100,
                            paddingVertical: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>
                            {getDisplayTime()}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                    
                    {showDatePicker && (
  <DateTimePicker
    value={reservationDateTime.date || new Date()}
    mode="date"
    minimumDate={new Date()}
    display="default"
    onChange={handleDateChange}
  />
)}

{showTimePicker && (
  <DateTimePicker
    value={reservationDateTime.time || new Date()}
    mode="time"
    display="default"
    onChange={handleTimeChange}
  />
)}

                    <TouchableOpacity onPress={handleReservation}>
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
                          marginBottom: -4.5
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>
                          ĐẶT BÀN
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowReservationDialog(false)}>
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
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>
                          ĐÓNG
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Dialog.Content>
                </Dialog>
              </Portal>

              {/* Pending dialog */}
              <Portal>
                <Dialog
                  visible={showPendingDialog}
                  onDismiss={() => setShowPendingDialog(false)}
                  style={styles.dialog}
                >
                  <Dialog.Title style={styles.dialogTitle}>{selectedTable?.name}</Dialog.Title>
                  <Dialog.Content>
                    <Text style={styles.notificationText}>
                      Đã đặt bàn, vui lòng chờ xác nhận!
                    </Text>
                    <View style={styles.buttonGroup}>
                      <TouchableOpacity onPress={() => confirmCancelReservation(selectedTable)}>
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
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>
                            HUỶ ĐẶT BÀN
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => setShowPendingDialog(false)}>
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
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>
                            ĐÓNG
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </Dialog.Content>
                </Dialog>
              </Portal>

<Portal>
  <Dialog
    visible={showConfirmCancelDialog}
    onDismiss={() => setShowConfirmCancelDialog(false)}
    style={styles.dialog}
  >
    <Dialog.Title style={styles.dialogTitle}>Xác nhận</Dialog.Title>
    <Dialog.Content>
      <Text style={styles.notificationText}>
        Bạn có chắc muốn huỷ đặt bàn này không?
      </Text>
      <View style={styles.buttonGroup}>
        <TouchableOpacity onPress={handleCancelConfirmed}>
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
            <Text style={{ color: 'white', fontWeight: 'bold' }}>XÁC NHẬN</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowConfirmCancelDialog(false)}>
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
            <Text style={{ color: 'white', fontWeight: 'bold' }}>ĐÓNG</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Dialog.Content>
  </Dialog>
</Portal>

              {/* Reserved dialog */}
              <Portal>
                <Dialog
                  visible={showReservedDialog}
                  onDismiss={() => setShowReservedDialog(false)}
                  style={styles.dialog}
                >
                  <Dialog.Title style={styles.dialogTitle}>{selectedTable?.name}</Dialog.Title>
                  <Dialog.Content>
                    <Text style={styles.notificationText}>
                      {selectedTable?.name} đã được duyệt, xin mời quý khách đặt món!
                    </Text>
                    <TouchableOpacity onPress={navigateToOrderScreen}>
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
                          marginBottom: -4
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>
                          ĐẶT MÓN
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={navigateToPaymentScreen}>
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
                          marginBottom: -4
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>
                          THANH TOÁN
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => confirmCancelReservation(selectedTable)}>
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
                          marginBottom: -4
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>
                          HUỶ ĐẶT BÀN
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowReservedDialog(false)}>
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
                          marginBottom: -4
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>
                          ĐÓNG
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Dialog.Content>
                </Dialog>
              </Portal>

             <Portal>
  <Dialog
    visible={showRatingDialog}
    onDismiss={() => setShowRatingDialog(false)}
    dismissable={false}
    style={styles.dialog}
  >
    <Dialog.Title style={styles.dialogTitle2}>Đánh giá trải nghiệm sử dụng App</Dialog.Title>
    <Dialog.Content>
      <Rating
        startingValue={rating}
        imageSize={45}
        onFinishRating={setRating}
        style={{ paddingVertical: 10 }}
        starStyle={{ borderBottomWidth: 0 }} 
      />
      
      <TextInput
        value={feedback}
        label="Nhập phản hồi của bạn"
        onChangeText={setFeedback}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.feedbackInput}
        theme={{ 
          colors: { 
            primary: '#FFA500',  
            onSurfaceVariant: '#FFA500',
            background: '#FFF' 
          } 
        }}
      />
      
       <View style={styles.buttonContainer}>
        <View style={styles.buttonWrapper}>
          <TouchableOpacity onPress={handleSubmitFeedback}>
            <LinearGradient
              colors={['#FF69B4', '#FFD700']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>GỬI ĐÁNH GIÁ</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonWrapper}>
          <TouchableOpacity onPress={() => setShowRatingDialog(false)}>
            <LinearGradient
              colors={['#FF69B4', '#FFD700']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>ĐÓNG</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Dialog.Content>
  </Dialog>
</Portal>

            </>
          )}
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
    marginStart: 10,
    marginEnd: 10,
    marginTop: 3,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  itemContainer: {
    width: (width - 48) / 2,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ffefa9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
    padding: 12,
  },
  reservedTable: {
    backgroundColor: '#ffd6d6',
  },
  pendingTable: {
    backgroundColor: '#fff3cd',
  },
  imageContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  tableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  tableStatus: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: '#555',
  },
  menuContent: {
    backgroundColor: 'white',
  },
  dialog: {
    backgroundColor: 'white',
    borderColor: '#FFA500',
    borderWidth: 2,
    borderRadius: 20,
  },
  dialogTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 16,
    fontSize: 20,
    color: '#FFA500',
  },
    dialogTitle2: {
    color: '#333',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dialogTitledatban: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 16,
    fontSize: 20,
    color: '#FFA500',
  },
  notificationText: {
    textAlign: 'center',
    marginBottom: 5,
    fontSize: 16
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: -2
  },
  buttonGroup2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    marginBottom: -2
  },

  dialogButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  flex1: {
    flex: 1, // Giúp 2 nút có chiều rộng bằng nhau
  },
  dialogButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    width: '100%',
    
  },
  feedbackInput: {
    backgroundColor: '#FFF',
    marginTop: 20,
    minHeight: 120, // Chiều cao tối thiểu
    textAlignVertical: 'top', // Để text bắt đầu từ trên xuống
  },
   buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 10,
    gap: 10, // Khoảng cách giữa các nút
  },
  buttonWrapper: {
    flex: 1, // Chiếm không gian bằng nhau
  },
  button: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    minWidth: 0, // Quan trọng để flex hoạt động đúng
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 8, // Thêm padding ngang cho chữ
  },
});

export default TablesScreen;