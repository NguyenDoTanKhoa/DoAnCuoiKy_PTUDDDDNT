import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Image,
  Dimensions,
  ImageBackground,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import database from '@react-native-firebase/database';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [chartPage, setChartPage] = useState(0);
  const itemsPerPage = 8;
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
  const fetchData = () => {
    try {
      // Lắng nghe thay đổi từ "Users"
      const usersRef = database().ref('Users');
      usersRef.limitToLast(1).on('value', (usersSnapshot) => {
        const usersData = usersSnapshot.val() || {};
        const usersList = Object.values(usersData).map(user => ({
          id: user.maUser || '1',
          name: user.username || 'admin',
          role:
  user.maquyen === 1
    ? 'Quản lý'
    : user.maquyen === 2
    ? 'Nhân viên'
    : 'Khách hàng',
          phone: user.phoneNumber || 'Không có',
          email: user.email || 'Không có',
          avatar: user.imageUrl ? { uri: user.imageUrl } : require('../assets/images/avt_default.jpg')
        }));
        setUsers(usersList);
      });

      // Lắng nghe thay đổi từ "loaimon"
      const categoriesRef = database().ref('loaimon');
      categoriesRef.limitToLast(1).on('value', (categoriesSnapshot) => {
        const categoriesData = categoriesSnapshot.val() || {};
        const categoriesList = Object.values(categoriesData).map(category => ({
          id: category.maLoai || '1',
          name: category.tenLoai || 'Không tên',
          image: category.imgLoai ? { uri: category.imgLoai } : require('../assets/images/avt_default.jpg')
        }));
        setMenuCategories(categoriesList);
      });

      // Lắng nghe thay đổi từ "HoaDon"
      const invoicesRef = database().ref('HoaDon')
        .orderByChild('tinhTrang')
        .equalTo(2);
      invoicesRef.limitToLast(1).on('value', async (invoicesSnapshot) => {
        const invoicesData = invoicesSnapshot.val() || {};
        const invoicesList = await Promise.all(
          Object.entries(invoicesData).map(async ([key, invoice]) => {
            let username = 'Không có';
            if (invoice.maUser) {
              const userSnapshot = await database().ref(`Users/${invoice.maUser}`).once('value');
              const userData = userSnapshot.val();
              if (userData) {
                username = userData.username || 'Không có';
              }
            }

            return {
              id: key,
              date: invoice.ngayDat ? invoice.ngayDat.split(' ')[0] : 'Không có',
              staff: username,
              table: `Bàn ${invoice.maBan}` || 'Không có',
              total: invoice.tongTien || 0,
              status: invoice.tinhTrang === 2 ? 1 : 0
            };
          })
        );
        setInvoices(invoicesList);
      });

      // Lắng nghe thay đổi từ "thongbaodatban"
      const reservationsRef = database().ref('thongbaodatban');
      reservationsRef.limitToLast(1).on('value', async (reservationsSnapshot) => {
        const reservationsData = reservationsSnapshot.val() || {};
        const reservationsList = await Promise.all(
          Object.entries(reservationsData).map(async ([key, reservation]) => {
            let fullName = 'Không có';
            if (reservation.maUser) {
              const userSnapshot = await database().ref(`Users/${reservation.maUser}`).once('value');
              const userData = userSnapshot.val();
              if (userData) {
                fullName = userData.fullName || 'Không có';
              }
            }

            return {
              id: key,
              tableName: `Bàn ${reservation.maBan}` || 'Không có',
              customerName: fullName,
              date: reservation.ngayDat ? reservation.ngayDat.split(' ')[0] : 'Không có'
            };
          })
        );
        setReservations(reservationsList);
      });

      // Lắng nghe thay đổi từ "ban"
      const tablesRef = database().ref('ban');
      tablesRef.limitToLast(2).on('value', (tablesSnapshot) => {
        const tablesData = tablesSnapshot.val() || {};
        const tablesList = Object.values(tablesData).map(table => ({
          id: table.maBan || '1',
          name: table.tenBan || 'Không tên',
          status: table.tinhTrang === 1 ? 'AVAILABLE' : 'RESERVED'
        }));
        setTables(tablesList);
      });

      // Lắng nghe thay đổi từ "HoaDon" để tính doanh thu
      const revenueRef = database().ref('HoaDon')
  .orderByChild('tinhTrang')
  .equalTo(2);
revenueRef.on('value', (revenueSnapshot) => {
  const revenueData = revenueSnapshot.val() || {};
  const monthlyRevenue = Array(12).fill(0);

  Object.values(revenueData).forEach(invoice => {
  if (!invoice) {
    console.warn('Invoice is null or undefined');
    return; // Bỏ qua nếu invoice không hợp lệ
  }

  // Xử lý ngayDat theo cách tương tự getCombinedData()
  const [datePart] = invoice.ngayDat?.split(' ') || ['']; // Chỉ lấy phần ngày
  const [day, month, year] = datePart.split('/').map(Number);
  
  // Kiểm tra tính hợp lệ của ngày tháng năm
  if (!isNaN(year) && !isNaN(month) && !isNaN(day) && 
      month >= 1 && month <= 12 && 
      day >= 1 && day <= 31) {
    if (year === currentYear) {
      const monthIndex = month - 1;
      monthlyRevenue[monthIndex] += invoice.tongTien || 0;
    }
  } else {
    console.warn('Dữ liệu ngày không hợp lệ:', invoice.ngayDat);
  }
});

  setRevenueData(monthlyRevenue);
});

      setLoading(false);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);
      setLoading(false);
    }
  };

  fetchData();

  // Cleanup listener khi component unmount
  return () => {
    database().ref('Users').off('value');
    database().ref('loaimon').off('value');
    database().ref('HoaDon').off('value');
    database().ref('thongbaodatban').off('value');
    database().ref('ban').off('value');
    database().ref('HoaDon').off('value');
  };

}, []);


  // Hàm định dạng tiền tệ
  const formatCurrency = (amount) => {
    if (amount >= 1000000000) {
      const billion = amount / 1000000000;
      return billion % 1 === 0 ? `${billion}B` : `${billion.toFixed(1)}B`;
    } else if (amount >= 1000000) {
      const million = amount / 1000000;
      return million % 1 === 0 ? `${million}tr` : `${million.toFixed(1)}tr`;
    } else if (amount >= 1000) {
      const thousand = amount / 1000;
      return `${thousand}k`;
    }
    return amount.toString();
  };

  const getStatusImage = (status) => {
    switch(status) {
      case 'RESERVED':
        return require('../assets/images/dadat.png');
      case 'PENDING':
        return require('../assets/images/pending.png');
      case 'AVAILABLE':
      default:
        return require('../assets/images/controng.png');
    }
  };

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  // Phân trang biểu đồ
  const paginatedLabels = Array.from({ length: 12 }, (_, i) => `T${i + 1}`).slice(
    chartPage * itemsPerPage, 
    (chartPage + 1) * itemsPerPage
  );
  
  const paginatedData = revenueData.slice(
    chartPage * itemsPerPage, 
    (chartPage + 1) * itemsPerPage
  );

  const totalPages = Math.ceil(12 / itemsPerPage);
  const canGoPrev = chartPage > 0;
  const canGoNext = chartPage < totalPages - 1;

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
      <ScrollView style={styles.container}>
        {/* Phần Người Dùng */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Người Dùng</Text>
            <TouchableOpacity onPress={() => navigateToScreen('Users')}>
              <Text style={styles.seeAll}>Xem tất cả&gt;</Text>
            </TouchableOpacity>
          </View>
          {users.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.userItem}
            >
              <Image source={users[0].avatar} style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{users[0].name}</Text>
                <Text style={styles.userRole}>{users[0].role}</Text>
                <Text style={styles.userPhone}>{users[0].phone}</Text>
                <Text style={styles.userEmail}>{users[0].email}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Phần Loại Món */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Loại Món</Text>
            <TouchableOpacity onPress={() => navigateToScreen('LoaiMon')}>
              <Text style={styles.seeAll}>Xem tất cả&gt;</Text>
            </TouchableOpacity>
          </View>
          {menuCategories.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.menuItemContainer}
            >
              <Image 
                source={menuCategories[0].image} 
                style={styles.menuItemImage} 
              />
              <View style={styles.textOverlay}>
                <Text style={styles.menuItemName}>{menuCategories[0].name}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Phần Hóa Đơn */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hóa Đơn</Text>
            <TouchableOpacity onPress={() => navigateToScreen('HoaDon')}>
              <Text style={styles.seeAll}>Xem tất cả&gt;</Text>
            </TouchableOpacity>
          </View>
          {invoices.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.invoiceCard}
            >
              <View style={styles.invoiceHeader}>
                <Text style={styles.invoiceId}>Mã hóa đơn: {invoices[0].id}</Text>
                <View style={styles.dateContainer}>
                  <Icon name="calendar" size={20} color="#5D4037" />
                  <Text style={styles.invoiceDate}>{invoices[0].date}</Text>
                </View>
              </View>
              
              <View style={styles.invoiceBody}>
                <View style={styles.infoContainer}>
                  <View style={styles.leftInfo}>
                    <Text style={styles.invoiceStaff}>{invoices[0].staff}</Text>
                    <Text style={styles.invoiceTable}>{invoices[0].table}</Text>
                    <Text style={styles.invoiceTotal}>{invoices[0].total.toLocaleString()} VNĐ</Text>
                  </View>
                  
                  <View style={styles.statusContainer}>
                    {invoices[0].status === 1 ? (
                      <Text style={[styles.invoiceStatus, styles.statusPaid]}>ĐÃ THANH TOÁN</Text>
                    ) : (
                      <Text style={[styles.invoiceStatus, styles.statusPending]}>CHỜ DUYỆT</Text>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Phần Thông Báo Đặt Bàn */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thông Báo Đặt Bàn</Text>
            <TouchableOpacity onPress={() => navigateToScreen('Thông báo đặt bàn')}>
              <Text style={styles.seeAll}>Xem tất cả&gt;</Text>
            </TouchableOpacity>
          </View>
          {reservations.length > 0 && (
            <TouchableOpacity
              style={styles.reservationItem}
            >
              <Text style={styles.reservationText}>
                <Text style={styles.label}>Bàn: </Text>
                <Text style={styles.value}>{reservations[0].tableName}</Text>
              </Text>
              <Text style={styles.reservationText}>
                <Text style={styles.label}>Họ tên: </Text>
                <Text style={styles.value}>{reservations[0].customerName}</Text>
              </Text>
              <Text style={styles.reservationText}>
                <Text style={styles.label}>Ngày đặt: </Text>
                <Text style={styles.value}>{reservations[0].date} {reservations[0].time}</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Phần Bàn */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bàn</Text>
            <TouchableOpacity onPress={() => navigateToScreen('Tables')}>
              <Text style={styles.seeAll}>Xem tất cả&gt;</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.tablesContainer}>
            {tables.map((table) => (
              <TouchableOpacity
                key={table.id}
                activeOpacity={0.8}
                style={styles.tableItemContainer}
              >
                <View style={styles.imageContainer}>
                  <Image source={getStatusImage(table.status)}  style={styles.tableImage} />
                </View>
                <Text style={styles.tableName}>{table.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Phần Thống Kê */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thống Kê</Text>
            <TouchableOpacity onPress={() => navigateToScreen('ThongKe')}>
              <Text style={styles.seeAll}>Xem tất cả&gt;</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Doanh thu theo tháng - Năm {currentYear}</Text>
            <BarChart
              data={{
                labels: paginatedLabels,
                datasets: [{ data: paginatedData }],
              }}
              width={Dimensions.get('window').width - 50}
              height={220}
              fromZero
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 128, 0, ${opacity})`,
                labelColor: () => '#333',
                fillShadowGradient: '#009000',
                fillShadowGradientOpacity: 1,
                barPercentage: 0.6,
                formatYLabel: (value) => formatCurrency(value),
                propsForLabels: {
                  fontSize: 14,
                  fontWeight: 'bold',
                },
              }}
              style={{ marginVertical: 12, borderRadius: 10, marginLeft: -5 }}
            />
            
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity 
                  onPress={() => setChartPage(p => Math.max(0, p - 1))}
                  disabled={!canGoPrev}
                  style={[styles.paginationButton, !canGoPrev && styles.disabledButton]}
                >
                  <Icon name="chevron-left" size={24} color={canGoPrev ? "#FF9800" : "#ccc"} />
                </TouchableOpacity>
                
                <Text style={styles.pageText}>
                  Trang {chartPage + 1}/{totalPages}
                </Text>
                
                <TouchableOpacity 
                  onPress={() => setChartPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={!canGoNext}
                  style={[styles.paginationButton, !canGoNext && styles.disabledButton]}
                >
                  <Icon name="chevron-right" size={24} color={canGoNext ? "#FF9800" : "#ccc"} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

// Giữ nguyên các style từ phiên bản trước và thêm style phân trang
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    color: 'rgba(51, 181, 229, 1)',
    fontWeight: 'bold',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFDAB9',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatar: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#555',
  },
  menuItemContainer: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  menuItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemName: {
    backgroundColor: '#FFA500',
    color: 'white',
    fontSize: 25,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
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
  statusContainer: {
    marginTop: 9.5,
    left: 11,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusPaid: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  },
  reservationItem: {
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
  reservationText: {
    fontSize: 16,
    marginBottom: 6,
    paddingVertical: 2
  },
  label: {
    fontWeight: 'bold',
    color: '#555',
  },
  value: {
    color: '#000',
  },
  tablesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  tableItemContainer: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
    padding: 12,
  },
  imageContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  tableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 15
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#BEBEBE',
    marginVertical: 10,
    marginBottom: 13
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  paginationButton: {
    padding: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pageText: {
    marginHorizontal: 15,
    fontSize: 16,
  }
});

export default HomeScreen;