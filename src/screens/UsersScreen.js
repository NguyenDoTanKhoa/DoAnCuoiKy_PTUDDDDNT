import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  Image, 
  Text, 
  TouchableOpacity,
  ImageBackground,
  Alert,
  ScrollView,
  ActivityIndicator
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
import database from '@react-native-firebase/database';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

const UsersScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [visibleMenuId, setVisibleMenuId] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState(null);
  const [selectedDeleteUserId, setSelectedDeleteUserId] = useState(null);
const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(3); // Default to customer role

  const navigation = useNavigation();
  const route = useRoute();

  // Load users from Firebase
  useEffect(() => {
    const usersRef = database().ref('Users');
    
    const subscriber = usersRef.on('value', snapshot => {
      try {
        const usersData = snapshot.val();
        if (usersData) {
          const usersArray = Object.keys(usersData)
            .map(key => {
              const item = usersData[key];
              if (item && item.maUser && item.fullName) {
                return {
                  id: key,
                  maUser: item.maUser,
                  name: item.fullName,
                  username: item.username || '',
                  email: item.email || '',
                  phone: item.phoneNumber || '',
                  dob: item.dateOfBirth || '',
                  gender: item.gender === 'Nam' ? 'male' : item.gender === 'Nữ' ? 'female' : 'other',
                  role: item.maquyen === 1 ? 'Quản lý' : item.maquyen === 2 ? 'Nhân viên' : 'Khách hàng',
                  maquyen: item.maquyen || 3,
                  avatar: { uri: item.imageUrl } || require('../assets/images/image.png')
                };
              }
              return null;
            })
            .filter(item => item !== null);

          setUsers(usersArray);
        } else {
          setUsers([]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading users:', error);
        setLoading(false);
      }
    });

    return () => usersRef.off('value', subscriber);
  }, []);

  useEffect(() => {
    if (route.params?.maquyen) {
      setCurrentUserRole(route.params.maquyen);
    }
  }, [route.params]);

  const openMenu = (id, event) => {
    const touchY = event.nativeEvent.pageY;
    setMenuPosition({ x: event.nativeEvent.pageX, y: touchY });
    setVisibleMenuId(id);
  };

  const closeMenu = () => setVisibleMenuId(null);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchText.toLowerCase()) ||
    user.phone.includes(searchText) ||
    user.email.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleDeleteConfirmed = async () => {
    try {
      const id = selectedDeleteUserId;
      const user = userToDelete;
      if (!user) return;
      // Không cho xoá quản lý
      if (user.maquyen === 1) {
        Alert.alert('Lỗi', 'Không thể xóa quản lý');
        return;
      }
  
      // Xoá ảnh nếu có
      if (user.avatar?.uri) {
        try {
          const imageRef = storage().refFromURL(user.avatar.uri);
          await imageRef.delete();
        } catch (error) {
          console.log('Error deleting user image:', error);
          // Tiếp tục xoá user nếu xoá ảnh lỗi
        }
      }
  
      // Xoá khỏi database
      await database().ref(`Users/${id}`).remove();
  
      Alert.alert('Thành công', 'Xóa người dùng thành công');
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Lỗi', 'Xóa người dùng thất bại');
    } finally {
      setShowDeleteConfirmDialog(false); // ẩn dialog dù thành công hay lỗi
    }
  };
  
  const confirmDeleteUser = (id) => {
    closeMenu(); // đóng menu trước
    const user = users.find(u => u.id === id);
    if (!user) return;
    setSelectedDeleteUserId(id); // lưu id người dùng cần xoá
    setUserToDelete(user); // ⬅️ Quan trọng!
    setShowDeleteConfirmDialog(true); // hiển thị dialog xác nhận
  };
  
  const cancelDeleteUser = () => {
    setShowDeleteConfirmDialog(false);
  };


  const handleViewDetail = (user) => {
    setSelectedUser(user);
    setShowDetailDialog(true);
  };

  const confirmUpdateRole = (user) => {
    closeMenu();
    setSelectedUser(user);
    
    // Check if user is a manager
    if (user.maquyen === 1) {
      Alert.alert('Thông báo', 'Không thể thay đổi quyền của quản lý');
      return;
    }

    // Set appropriate confirmation message based on current role
    const message = 
      user.maquyen === 3 ? 'Bạn có muốn cập nhật quyền người dùng này lên nhân viên?' :
      user.maquyen === 2 ? 'Bạn có muốn cập nhật quyền người dùng này lên quản lý?' : '';
    
    setShowConfirmDialog(true);
  };

  const handleConfirmUpdateRole = async () => {
    try {
      if (!selectedUser) return;
      
      const newRole = 
        selectedUser.maquyen === 3 ? 2 : // Customer -> Staff
        selectedUser.maquyen === 2 ? 1 : // Staff -> Manager
        3; // Fallback

      // Update in database
      await database().ref(`Users/${selectedUser.id}`).update({
        maquyen: newRole
      });

      setShowConfirmDialog(false);
      Alert.alert('Thành công', 'Cập nhật quyền thành công');
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Lỗi', 'Cập nhật quyền thất bại');
    }
  };

  const cancelUpdateRole = () => {
    setShowConfirmDialog(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleViewDetail(item)}
      onLongPress={currentUserRole !== 3 ? (e) => openMenu(item.id, e) : null}
      delayLongPress={300}
      style={styles.itemContainer}
    >
      <Image 
        source={item.avatar} 
        style={styles.avatar} 
        defaultSource={require('../assets/images/image.png')}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userRole}>{item.role}</Text>
        <Text style={styles.userPhone}>{item.phone}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>

      {currentUserRole !== 3 && (
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
            onPress={() => confirmUpdateRole(item)} 
            title="Cập nhật quyền" 
          />
          <Divider />
          <Menu.Item
            onPress={() => confirmDeleteUser(item.id)}
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
            placeholder="Tìm người dùng..."
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
            data={filteredUsers}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />

          {/* User detail dialog */}
          <Portal>
            <Dialog
              visible={showDetailDialog}
              onDismiss={() => setShowDetailDialog(false)}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle}>Thông tin người dùng</Dialog.Title>
            <Dialog.Content style={styles.dialogContent}>
              {selectedUser && (
                <ScrollView style={styles.detailScrollView}>
                  <View style={styles.detailContainer}>
                    <View style={styles.detailHeader}>
                      <Image 
                        source={selectedUser.avatar} 
                        style={styles.detailAvatar} 
                        defaultSource={require('../assets/images/image.png')}
                      />
                    </View>
                    
                    <TextInput
                      label="Họ tên"
                      value={selectedUser.name}
                      mode="outlined"
                      style={styles.detailInput}
                      editable={false}
                      left={<TextInput.Icon icon="card-account-details" color="#FFA500" />}
                      theme={{ colors: { primary: '#FFA500' } }}
                    />
                    
                    <TextInput
                      label="Tài khoản"
                      value={selectedUser.username}
                      mode="outlined"
                      style={styles.detailInput}
                      editable={false}
                      left={<TextInput.Icon icon="account" color="#FFA500" />}
                      theme={{ colors: { primary: '#FFA500' } }}
                    />
                    
                    <TextInput
                      label="Email"
                      value={selectedUser.email}
                      mode="outlined"
                      style={styles.detailInput}
                      editable={false}
                      left={<TextInput.Icon icon="email" color="#FFA500" />}
                      theme={{ colors: { primary: '#FFA500' } }}
                    />
                    
                    <TextInput
                      label="Số điện thoại"
                      value={selectedUser.phone}
                      mode="outlined"
                      style={styles.detailInput}
                      editable={false}
                      left={<TextInput.Icon icon="phone" color="#FFA500" />}
                      theme={{ colors: { primary: '#FFA500' } }}
                    />
                    
                    <TextInput
                      label="Ngày sinh"
                      value={selectedUser.dob}
                      mode="outlined"
                      style={styles.detailInput}
                      editable={false}
                      left={<TextInput.Icon icon="calendar" color="#FFA500" />}
                      theme={{ colors: { primary: '#FFA500' } }}
                    />
                    
                    <View style={{flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,}}>
                      <Text style={styles.genderLabel}>Giới tính:</Text>
                      <View style={styles.genderOptions}>
                        <View style={styles.genderOption}>
                          <RadioButton
                            value="male"
                            status={selectedUser.gender === 'male' ? 'checked' : 'unchecked'}
                            color="#FFA500"
                            disabled
                          />
                          <Text>Nam</Text>
                        </View>
                        <View style={styles.genderOption}>
                          <RadioButton
                            value="female"
                            status={selectedUser.gender === 'female' ? 'checked' : 'unchecked'}
                            color="#FFA500"
                            disabled
                          />
                          <Text>Nữ</Text>
                        </View>
                        <View style={styles.genderOption}>
                          <RadioButton
                            value="other"
                            status={selectedUser.gender === 'other' ? 'checked' : 'unchecked'}
                            color="#FFA500"
                            disabled
                          />
                          <Text>Khác</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.roleContainer}>
                      <Text style={styles.quyenLabel}>Quyền: {selectedUser.role}</Text>
                    </View>
                  </View>
                </ScrollView>
              )}
            </Dialog.Content>
            </Dialog>
          </Portal>


          <Portal>
            <Dialog
              visible={showDeleteConfirmDialog}
              onDismiss={cancelDeleteUser}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle2}>Xác nhận xóa</Dialog.Title>
              <Dialog.Content>
                <Text style={styles.notificationText}>
                  Bạn có chắc chắn muốn xóa người dùng {userToDelete?.name}?
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
          
                  <TouchableOpacity onPress={cancelDeleteUser}>
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
          

          <Portal>
            <Dialog
              visible={showConfirmDialog}
              onDismiss={cancelUpdateRole}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle2}>Xác nhận</Dialog.Title>
              <Dialog.Content>
              <Text style={styles.notificationText}>
                  {selectedUser?.maquyen === 3 
                    ? 'Bạn có muốn cập nhật quyền người dùng này lên nhân viên?'
                    : 'Bạn có muốn cập nhật quyền người dùng này lên quản lý?'}
                </Text>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity onPress={handleConfirmUpdateRole}>
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
          
                  <TouchableOpacity onPress={cancelUpdateRole}>
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
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 2,
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
    marginTop: 8,
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
  // Add these to your styles object if they're not already there
detailScrollView: {
  maxHeight: 550,
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
  
});

export default UsersScreen;