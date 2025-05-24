import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  ActivityIndicator,
  Alert
} from 'react-native';
import { 
  TextInput, 
  Provider as PaperProvider, 
  Menu, 
  Divider,
  Portal,
  Dialog,
  RadioButton,
} from 'react-native-paper';
import { Rating } from 'react-native-ratings';
import LinearGradient from 'react-native-linear-gradient';
import database from '@react-native-firebase/database';

const DanhGiaScreen = ({route}) => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [visibleMenuId, setVisibleMenuId] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
const [reviewToDelete, setReviewToDelete] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  
    const maquyen = route.params?.maquyen;
  // Lấy dữ liệu từ Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Lấy danh sách đánh giá
        const danhgiaSnapshot = await database().ref('danhgia').once('value');
        const danhgiaData = danhgiaSnapshot.val() || {};
        
        // Lấy thông tin người dùng
        const usersSnapshot = await database().ref('Users').once('value');
        const usersData = usersSnapshot.val() || {};
        
        // Kết hợp dữ liệu
        const combinedReviews = [];
        
        Object.entries(danhgiaData).forEach(([key, danhgia]) => {
          if (danhgia && danhgia.maUser) {
            const user = usersData[danhgia.maUser];
            if (user) {
              combinedReviews.push({
                id: key,
                maUser: danhgia.malUser,
                madanhgia: danhgia.madanhgia,
                name: user.fullName || 'Không tên',
                username: user.username || 'Không có',
                phone: user.phoneNumber || 'Không có',
                email: user.email || 'Không có',
                feedback: danhgia.noidung || 'Không có nội dung',
                rating: danhgia.rate || 0,
                gender: user.gender === 'Nam' ? 'male' : 
                       user.gender === 'Nữ' ? 'female' : 'other',
                date: user.date0fBirth || 'Không có',
                ngaydanhgia: danhgia.ngaydanhgia || 'Không có',
                avatar: user.imageUrl 
                  ? { uri: user.imageUrl } 
                  : require('../assets/images/avt_default.jpg')
              });
            }
          }
        });
        
        setReviews(combinedReviews);
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const openMenu = (id, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setVisibleMenuId(id);
  };

  const closeMenu = () => setVisibleMenuId(null);

  const filteredReviews = reviews.filter(review =>
    review.name.toLowerCase().includes(searchText.toLowerCase()) ||
    review.phone.includes(searchText) ||
    review.email.toLowerCase().includes(searchText.toLowerCase()) ||
    review.username.toLowerCase().includes(searchText.toLowerCase())
  );


  // Hàm xử lý xóa
const handleDelete = (id) => {
  if (maquyen === 1) {
    // Nếu có quyền xóa, hiển thị dialog xác nhận
    const review = reviews.find(r => r.id === id);
    setReviewToDelete(review);
    setShowDeleteConfirmDialog(true);
  } else {
    // Nếu không có quyền, thông báo
    Alert.alert('Thông báo', 'Bạn không có quyền xóa đánh giá');
  }
  closeMenu();
};

// Hàm xác nhận xóa
const handleDeleteConfirmed = async () => {
  try {
    if (!reviewToDelete) return;
    
    await database().ref(`danhgia/${reviewToDelete.id}`).remove();
    
    // Cập nhật state sau khi xóa
    setReviews(reviews.filter(item => item.id !== reviewToDelete.id));
    Alert.alert('Thành công', 'Xóa đánh giá thành công');
  } catch (error) {
    console.error('Lỗi khi xóa đánh giá:', error);
    Alert.alert('Lỗi', 'Xóa đánh giá thất bại');
  } finally {
    setShowDeleteConfirmDialog(false);
    setReviewToDelete(null);
  }
};

// Hàm hủy xóa
const cancelDeleteReview = () => {
  setShowDeleteConfirmDialog(false);
  setReviewToDelete(null);
};
  const handleViewDetail = (review) => {
    setSelectedReview(review);
    setShowDetailDialog(true);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleViewDetail(item)}
      onLongPress={(e) => openMenu(item.id, e)}
      delayLongPress={300}
      style={styles.itemContainer}
    >
      <Image 
        source={item.avatar} 
        style={styles.avatar} 
      />
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userUsername}>{item.username}</Text>
        <Text style={styles.userPhone}>{item.phone}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
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
          onPress={() => handleDelete(item.id)}
          title="Xoá"
          titleStyle={{ color: 'red' }}
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
            placeholder="Tìm kiếm đánh giá..."
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

          <FlatList
            data={filteredReviews}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Không có đánh giá nào</Text>
            }
          />

          {/* Dialog chi tiết đánh giá */}
          <Portal>
            <Dialog
              visible={showDetailDialog}
              onDismiss={() => setShowDetailDialog(false)}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle}>Chi tiết đánh giá</Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                {selectedReview && (
                  <ScrollView style={styles.detailScrollView}>
                    <View style={styles.detailContainer}>
                      <View style={styles.detailHeader}>
                        <Image 
                          source={selectedReview.avatar} 
                          style={styles.detailAvatar} 
                        />
                      </View>
                      
                      <TextInput
                        label="Họ tên"
                        value={selectedReview.name}
                        mode="outlined"
                        style={styles.detailInput}
                        editable={false}
                        left={<TextInput.Icon icon="card-account-details" color="#FFA500" />}
                        theme={{ colors: { primary: '#FFA500' } }}
                      />
                      
                      <TextInput
                        label="Tài khoản"
                        value={selectedReview.username}
                        mode="outlined"
                        style={styles.detailInput}
                        editable={false}
                        left={<TextInput.Icon icon="account" color="#FFA500" />}
                        theme={{ colors: { primary: '#FFA500' } }}
                      />
                      
                      <TextInput
                        label="Số điện thoại"
                        value={selectedReview.phone}
                        mode="outlined"
                        style={styles.detailInput}
                        editable={false}
                        left={<TextInput.Icon icon="phone" color="#FFA500" />}
                        theme={{ colors: { primary: '#FFA500' } }}
                      />
                      
                      <TextInput
                        label="Email"
                        value={selectedReview.email}
                        mode="outlined"
                        style={styles.detailInput}
                        editable={false}
                        left={<TextInput.Icon icon="email" color="#FFA500" />}
                        theme={{ colors: { primary: '#FFA500' } }}
                      />

                      <TextInput
                        label="Ngày sinh"
                        value={selectedReview.date}
                        mode="outlined"
                        style={styles.detailInput}
                        editable={false}
                        left={<TextInput.Icon icon="calendar" color="#FFA500" />}
                        theme={{ colors: { primary: '#FFA500' } }}
                      />
                      
                      <View style={styles.genderContainer}>
                        <Text style={styles.genderLabel}>Giới tính:</Text>
                        <View style={styles.genderOptions}>
                          <View style={styles.genderOption}>
                            <RadioButton
                              value="male"
                              status={selectedReview.gender === 'male' ? 'checked' : 'unchecked'}
                              color="#FFA500"
                              disabled
                            />
                            <Text>Nam</Text>
                          </View>
                          <View style={styles.genderOption}>
                            <RadioButton
                              value="female"
                              status={selectedReview.gender === 'female' ? 'checked' : 'unchecked'}
                              color="#FFA500"
                              disabled
                            />
                            <Text>Nữ</Text>
                          </View>
                          <View style={styles.genderOption}>
                            <RadioButton
                              value="other"
                              status={selectedReview.gender === 'other' ? 'checked' : 'unchecked'}
                              color="#FFA500"
                              disabled
                            />
                            <Text>Khác</Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.ratingSection}>
                        <Text style={styles.detailLabel}>Đánh giá:</Text>
                        <Rating
                          type='star'
                          ratingCount={5}
                          imageSize={28}
                          readonly
                          startingValue={selectedReview.rating}
                          selectedColor="#FF9800" 
                          ratingTextColor='#FF9800'
                          ratingColor='#FF9800'
                          style={styles.ratingStars}
                        />
                      </View>
                      
                      <TextInput
                        label="Nội dung phản hồi"
                        value={selectedReview.feedback}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        style={styles.feedbackInput}
                        editable={false}
                        left={<TextInput.Icon icon="comment-text" color="#FFA500" />}
                        theme={{ colors: { background: '#FFF' } }}
                      />

                      {/* Thêm ngày đánh giá */}
                      <TextInput
                        label="Ngày đánh giá"
                        value={selectedReview.ngaydanhgia}
                        mode="outlined"
                        style={styles.detailInput}
                        editable={false}
                        left={<TextInput.Icon icon="clock" color="#FFA500" />}
                        theme={{ colors: { primary: '#FFA500' } }}
                      />
                    </View>
                  </ScrollView>
                )}
              </Dialog.Content>
            </Dialog>
          </Portal>

          <Portal>
  <Dialog
    visible={showDeleteConfirmDialog}
    onDismiss={cancelDeleteReview}
    style={styles.dialog}
  >
    <Dialog.Title style={styles.dialogTitle2}>Xác nhận xóa</Dialog.Title>
    <Dialog.Content>
      <Text style={styles.notificationText}>
        Bạn có chắc chắn muốn xóa đánh giá của {reviewToDelete?.name}?
      </Text>
      <View style={styles.buttonGroup}>
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

        <TouchableOpacity onPress={cancelDeleteReview}>
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
        </View>
      </PaperProvider>
    </ImageBackground>
  );
};

// Giữ nguyên các style từ phiên bản trước
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
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
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
  listContent: {
    paddingBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#FFDAB9',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  userUsername: {
    fontSize: 14,
    marginBottom: 2,
    color: '#555',
  },
  userPhone: {
    fontSize: 14,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
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
  detailContainer: {
    paddingHorizontal: 8,
  },
  detailScrollView: {
    maxHeight: 550,
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: -12
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
  detailInput: {
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  feedbackInput: {
    backgroundColor: '#FFF',
    marginBottom: 10
  },
  ratingSection: {
    marginVertical: 16,
    paddingHorizontal: 1,
  },
  detailLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ratingStars: {
    alignSelf: 'flex-start',
    marginVertical: 5,
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

export default DanhGiaScreen;