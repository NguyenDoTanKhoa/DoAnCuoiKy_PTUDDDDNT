import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  Image, 
  Text, 
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  Alert
} from 'react-native';
import { 
  TextInput, 
  Provider as PaperProvider, 
  Menu, 
  Portal,
  Dialog
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';

const HoaDonScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [visibleMenuId, setVisibleMenuId] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [invoices, setInvoices] = useState([]);
  const [invoiceDetails, setInvoiceDetails] = useState({});
  const [menuItems, setMenuItems] = useState({});
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [invoiceToApprove, setInvoiceToApprove] = useState(null);

  // Lấy dữ liệu từ Firebase
  useEffect(() => {
  const invoicesRef = database().ref('HoaDon');
  const detailsRef = database().ref('Chitiethoadon');
  const menuRef = database().ref('mon');
  const usersRef = database().ref('Users');

  // Hàm xử lý dữ liệu
  const handleData = (snapshot, setter, parseFunction = null) => {
    const data = snapshot.val();
    if (data) {
      setter(parseFunction ? parseFunction(data) : data);
    } else {
      setter([]);
    }
  };

  // Đăng ký lắng nghe realtime
  const invoicesListener = invoicesRef.on('value', snapshot => {
    handleData(snapshot, setInvoices, (rawData) =>
      Object.entries(rawData)
        .filter(([key, value]) => value !== null && value !== undefined)
        .map(([key, value]) => ({ id: key, ...value }))
    );
  });

  const detailsListener = detailsRef.on('value', snapshot => {
    handleData(snapshot, setInvoiceDetails);
  });

  const menuListener = menuRef.on('value', snapshot => {
    handleData(snapshot, setMenuItems);
  });

  const usersListener = usersRef.on('value', snapshot => {
    handleData(snapshot, setUsers);
  });

  setLoading(false);

  // Hủy lắng nghe khi component unmount
  return () => {
    invoicesRef.off('value', invoicesListener);
    detailsRef.off('value', detailsListener);
    menuRef.off('value', menuListener);
    usersRef.off('value', usersListener);
  };
}, []);


  // Kết hợp thông tin hóa đơn
  const getCombinedInvoices = () => {
    return invoices
      .filter(invoice => invoice && invoice.maHoaDon) // Lọc bỏ các invoice không hợp lệ
      .map(invoice => {
        // Lấy chi tiết hóa đơn
        const details = Object.values(invoiceDetails)
          .filter(detail => detail && detail.maHoaDon == invoice.maHoaDon);
        
        // Lấy thông tin món ăn và tính tổng tiền
        let total = 0;
        const items = details.map(detail => {
          const menuItem = menuItems[detail.maMon];
          const itemTotal = menuItem ? menuItem.giaMon * detail.soluong : 0;
          total += itemTotal;
          
          return {
            maMon: detail.maMon,
            quantity: detail.soluong,
            name: menuItem?.tenMon || `Món ${detail.maMon}`,
            price: menuItem?.giaMon || 0,
            image: menuItem?.imgMon ? { uri: menuItem.imgMon } : require('../assets/images/chien.jpg'),
            total: itemTotal
          };
        });

        // Lấy thông tin nhân viên (sử dụng username thay vì fullName)
        const staffInfo = users[invoice.maUser] || {};
        const staffName = staffInfo.username || `NV${invoice.maUser}`;

        return {
          ...invoice,
          items,
          id: invoice.maHoaDon,
          date: invoice.ngayDat,
          table: `Bàn ${invoice.maBan}`,
          staff: staffName,
          total: invoice.tongTien || total,
          status: invoice.tinhTrang
        };
      });
  };

  const openMenu = (id, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setVisibleMenuId(id);
  };

  const closeMenu = () => setVisibleMenuId(null);

  const filteredInvoices = getCombinedInvoices().filter(invoice =>
    invoice && (
      (invoice.id?.toString().includes(searchText)) ||
      (invoice.staff?.toLowerCase().includes(searchText.toLowerCase())) ||
      (invoice.table?.toLowerCase().includes(searchText.toLowerCase()))
    )
  );

  const handleViewDetail = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailDialog(true);
  };

  const fetchInvoices = async () => {
  const snapshot = await database().ref('HoaDon').once('value');
  const data = snapshot.val();
  if (data) {
    setInvoices(Object.values(data)); // hoặc setInvoices(Object.entries(data).map(([key, value]) => ({ ...value, id: key })))
  }
};

const confirmApproveInvoice = (invoice) => {
  closeMenu(); // Đóng menu
  setInvoiceToApprove(invoice); // Lưu hóa đơn cần duyệt
  setShowApproveDialog(true); // Hiển thị Dialog xác nhận
};

  const handleApprove = async () => {
  try {
    setApproving(true);
    
    const invoice = invoiceToApprove; // Lấy hóa đơn cần duyệt từ state
    if (!invoice) return;

    if (invoice.tinhTrang === 2) {
      Alert.alert('Thông báo', 'Hóa đơn này đã được duyệt trước đó');
      return;
    }

    // Cập nhật trạng thái hóa đơn
    const invoiceRef = database().ref(`HoaDon/${invoice.id}`);
    await invoiceRef.update({
      tinhTrang: 2, // Duyệt hóa đơn
    });

    // Lấy lại danh sách hóa đơn
    await fetchInvoices();

    Alert.alert('Thành công', 'Hóa đơn đã được duyệt');
  } catch (error) {
    console.error('Approve error:', error);
    Alert.alert('Lỗi', 'Duyệt hóa đơn thất bại');
  } finally {
    setApproving(false);
    setShowApproveDialog(false); // Đóng Dialog sau khi duyệt
  }
};


  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleViewDetail(item)}
      onLongPress={(e) => openMenu(item.id, e)}
      delayLongPress={300}
      style={styles.invoiceCard}
    >
      <View style={styles.invoiceHeader}>
        <Text style={styles.invoiceId}>Mã hóa đơn: {item.id}</Text>
        <View style={styles.dateContainer}>
          <Icon name="calendar" size={20} color="#5D4037" />
          <Text style={styles.invoiceDate}>{item.date}</Text>
        </View>
      </View>
      
      <View style={styles.invoiceBody}>
        <View style={styles.infoContainer}>
          <View style={styles.leftInfo}>
            <Text style={styles.invoiceStaff}>{item.staff}</Text>
            <Text style={styles.invoiceTable}>{item.table}</Text>
            <Text style={styles.invoiceTotal}>{item.total.toLocaleString()} VNĐ</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={[
              styles.invoiceStatus,
              item.status === 2 ? styles.statusPaid : styles.statusPending
            ]}>
              {item.status === 2 ? 'ĐÃ THANH TOÁN' : 'CHỜ DUYỆT'}
            </Text>
          </View>
        </View>
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
          onPress={() => confirmApproveInvoice(item)}
          title={approving && visibleMenuId === item.id ? 
            <ActivityIndicator color="#000" /> : "Duyệt"} 
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
            placeholder="Tìm hóa đơn..."
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={styles.searchInput}
            theme={{
              colors: {
                primary: '#4CAF50',
                accent: '#4CAF50',
                placeholder: '#888',
              },
              roundness: 18,
            }}
            left={
              <TextInput.Icon
                icon="magnify"
                color={isFocused ? '#4CAF50' : 'grey'}
              />
            }
          />

          <FlatList
            data={filteredInvoices}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Không có hóa đơn nào</Text>
              </View>
            }
          />

          <Portal>
            <Dialog
              visible={showDetailDialog}
              onDismiss={() => setShowDetailDialog(false)}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle}>
                <Text style={styles.dialogTitleText}>Chi tiết hóa đơn</Text>
              </Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                {selectedInvoice && (
                  <ScrollView style={styles.detailScrollView}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailId}>Mã hóa đơn: {selectedInvoice.id}</Text>
                      <View style={styles.dateContainer}>
                        <Text style={styles.detailDate}>Ngày đặt: {selectedInvoice.date}</Text>
                      </View>
                    </View>

                    <View style={styles.itemsContainer}>
                      {selectedInvoice.items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                          <Image source={item.image} style={styles.foodImage} />
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemPrice}>{item.price.toLocaleString()}</Text>
                          <Text style={styles.itemQuantity}>{item.quantity}</Text>
                          <Text style={styles.itemTotalPrice}>{item.total.toLocaleString()}</Text>
                        </View>
                      ))}
                    </View>
                    
                    <LinearGradient
                      colors={['#FF6F00', '#FFE082']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.footerGradient}
                    >
                      <View style={styles.footerLeft}>
                        <Text style={styles.footerTable}>{selectedInvoice.table}</Text>
                        <Text style={styles.footerStaff}>{selectedInvoice.staff}</Text>
                      </View>
                      <View style={styles.footerRight}>
                        <Text style={styles.totalLabel}>Tổng tiền:</Text>
                        <Text style={styles.totalAmount}>{selectedInvoice.total.toLocaleString()} VNĐ</Text>
                      </View>
                    </LinearGradient>
                  </ScrollView>
                )}
              </Dialog.Content>
            </Dialog>
          </Portal>

          <Portal>
  <Dialog
    visible={showApproveDialog}
    onDismiss={() => setShowApproveDialog(false)}
    style={styles.dialog}
  >
    <Dialog.Title style={styles.dialogTitle2}>Xác nhận duyệt hóa đơn</Dialog.Title>
    <Dialog.Content>
      <Text style={styles.notificationText}>
        Bạn có chắc chắn muốn duyệt hóa đơn số {invoiceToApprove?.id}?
      </Text>
      <View style={styles.buttonGroup}>
        <TouchableOpacity onPress={handleApprove}>
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
            <Text style={styles.buttonText}>Duyệt</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowApproveDialog(false)}>
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
            <Text style={styles.buttonText}>Huỷ</Text>
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

// Giữ nguyên toàn bộ styles như trong mẫu gốc
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  searchInput: {
    marginStart: 10,
    marginEnd: 10,
    marginTop: 3,
    marginBottom: 10,
    backgroundColor: '#fff',
    height: 49,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFCC80',
    borderBottomWidth: 1,
    borderBottomColor: '#FFCC80',
  },
  invoiceId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5D4037',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceDate: {
    fontSize: 14,
    color: '#5D4037',
    marginLeft: 5,
  },
  invoiceBody: {
    padding: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftInfo: {
    flex: 1,
  },
  invoiceStaff: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  invoiceTable: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  invoiceTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  invoiceStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPaid: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  },
  menuContent: {
    backgroundColor: 'white',
  },
  dialog: {
    backgroundColor: 'white',
    borderColor: '#FF9800',
    borderWidth: 2,
    borderRadius: 20,
  },
  dialogTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 16,
    fontSize: 20,
    color: '#4CAF50',
  },
  dialogContent: {
    paddingBottom: 5,
    paddingLeft: 5,
    paddingRight: 5
  },
  detailScrollView: {
    maxHeight: 400,
  },
  dialogTitleText: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 6
  },
  detailId: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  detailDate: {
    fontSize: 15,
    color: '#FF9800',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FF9800',
    marginBottom: 8,
  },
  itemsContainer: {
    marginBottom: 15,
    paddingLeft: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    textAlign: 'center',
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodImage: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  itemName: {
    flex: 1.5,
    fontSize: 14,
  },
  itemPrice: {
    flex: 1,
    fontSize: 14,
    textAlign: 'left',
    paddingLeft: 14,
  },
  itemQuantity: {
    flex: 0.5,
    fontSize: 14,
    textAlign: 'center',
  },
  itemTotalPrice: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    textAlign: 'left',
    paddingLeft: 14,
  },
  footerGradient: {
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  footerLeft: {
    flex: 1,
    paddingLeft:18,
  },
  footerTable: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  footerStaff: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  footerRight: {
    alignItems: 'flex-start',
    minWidth: 120,
    paddingRight: 18
  },
  totalLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
    color: '#fff',
  },
  statusContainer: {
    marginTop: 9.5,
    left: 11,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
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

export default HoaDonScreen;