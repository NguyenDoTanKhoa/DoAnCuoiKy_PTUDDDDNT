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
  ImageBackground,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { 
  TextInput, 
  Provider as PaperProvider, 
  Menu, 
  Divider,
  Portal,
  Dialog,
  IconButton
} from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';

const { width } = Dimensions.get('window');

const LoaiMonScreen = ({ route }) => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [visibleMenuId, setVisibleMenuId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [tempImage, setTempImage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
const [selectedDeleteCategoryId, setSelectedDeleteCategoryId] = useState(null);

  const navigation = useNavigation();
  const maquyen = route.params?.maquyen;
  
  // Load categories from Firebase
  useEffect(() => {
    const categoriesRef = database().ref('loaimon');
  
    const subscriber = categoriesRef.on('value', snapshot => {
      try {
        const categoriesData = snapshot.val();
        if (categoriesData) {
          const categoriesArray = Object.keys(categoriesData)
            .map(key => {
              const item = categoriesData[key];
              if (item && item.maLoai && item.tenLoai && item.imgLoai) {
                return {
                  id: key,
                  maloai: item.maLoai,
                  name: item.tenLoai,
                  image: item.imgLoai
                };
              }
              return null; // Bỏ qua node rỗng
            })
            .filter(item => item !== null); // Lọc bỏ các phần tử null
  
          setCategories(categoriesArray);
        } else {
          setCategories([]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading categories:', error);
        setLoading(false);
      }
    });
  
    return () => categoriesRef.off('value', subscriber);
  }, []);
  

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
    if (route.params?.role) {
      setUserRole(route.params.role);
    }
  }, [route.params]);

  const openMenu = (id, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setVisibleMenuId(id);
  };

  const closeMenu = () => setVisibleMenuId(null);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const checkIfCategoryHasDishes = async (categoryId) => {
    try {
      const snapshot = await database().ref('mon').orderByChild('maLoaiMon').equalTo(parseInt(categoryId)).once('value');
      return snapshot.exists();
    } catch (error) {
      console.error('Error checking dishes:', error);
      return true; // Assume it has dishes to prevent accidental deletion
    }
  };

  const handleDelete = async (id) => {
    try {
      // Check if category has dishes
      const hasDishes = await checkIfCategoryHasDishes(id);
      if (hasDishes) {
        Alert.alert('Lỗi', 'Không thể xóa loại món đang có món ăn');
        closeMenu();
        return;
      }

      // Delete image from storage first
      const category = categories.find(c => c.id === id);
      if (category.image) {
        try {
          const imageRef = storage().refFromURL(category.image);
          await imageRef.delete();
        } catch (error) {
          console.log('Error deleting image:', error);
        }
      }

      // Delete from database
      await database().ref(`loaimon/${id}`).remove();
      
      closeMenu();
      Alert.alert('Thành công', 'Đã xóa loại món thành công');
    } catch (error) {
      console.error('Error deleting category:', error);
      Alert.alert('Lỗi', 'Xóa loại món thất bại');
    }
  };


  const handleDeleteConfirmed = async () => {
    try {
      const id = selectedDeleteCategoryId;
      const hasDishes = await checkIfCategoryHasDishes(id);
      if (hasDishes) {
        Alert.alert('Lỗi', 'Không thể xóa loại món đang có món ăn');
        closeMenu();
        return;
      }
  
      const category = categories.find(c => c.id === id);
      if (category.image) {
        try {
          const imageRef = storage().refFromURL(category.image);
          await imageRef.delete();
        } catch (error) {
          console.log('Error deleting image:', error);
        }
      }
  
      await database().ref(`loaimon/${id}`).remove();
  
      closeMenu();
      Alert.alert('Thành công', 'Đã xóa loại món thành công');
    } catch (error) {
      console.error('Error deleting category:', error);
      Alert.alert('Lỗi', 'Xóa loại món thất bại');
    } finally {
      setShowConfirmDeleteDialog(false);
    }
  };

  const confirmDelete = (id) => {
    closeMenu(); // đóng menu trước
    setSelectedDeleteCategoryId(id);
    setShowConfirmDeleteDialog(true);
  };
  

  
  const handleEdit = (id) => {
    const category = categories.find(item => item.id === id);
    setEditCategoryName(category.name);
    setCurrentCategoryId(id);
    setShowEditDialog(true);
    closeMenu();
  };

  const checkCategoryNameExists = async (name, excludeId = null) => {
    try {
      const snapshot = await database().ref('loaimon')
        .orderByChild('tenLoai')
        .equalTo(name)
        .once('value');
      
      if (!snapshot.exists()) return false;
      
      const data = snapshot.val();
      if (excludeId) {
        return Object.keys(data).some(key => key !== excludeId);
      }
      return true;
    } catch (error) {
      console.error('Error checking category name:', error);
      return true; // Assume name exists to prevent duplicates
    }
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên loại món');
      return;
    }

    try {
      // Check if name already exists (excluding current category)
      const nameExists = await checkCategoryNameExists(editCategoryName, currentCategoryId);
      if (nameExists) {
        Alert.alert('Lỗi', 'Tên loại món đã tồn tại');
        return;
      }

      const updates = {
        tenLoai: editCategoryName
      };

      // Upload new image if selected
      if (tempImage) {
        // Delete old image first
        const oldCategory = categories.find(c => c.id === currentCategoryId);
        if (oldCategory.image) {
          try {
            const oldImageRef = storage().refFromURL(oldCategory.image);
            await oldImageRef.delete();
          } catch (error) {
            console.log('Error deleting old image:', error);
          }
        }

        // Upload new image
        const filename = `category_${currentCategoryId}_${Date.now()}.jpg`;
        const reference = storage().ref(`loai_mon_images/${filename}`);
        await reference.putFile(tempImage.uri);
        const imageUrl = await reference.getDownloadURL();
        updates.imgLoai = imageUrl;
      }

      // Update in database
      await database().ref(`loaimon/${currentCategoryId}`).update(updates);

      setEditCategoryName('');
      setTempImage(null);
      setShowEditDialog(false);
      Alert.alert('Thành công', 'Cập nhật loại món thành công');
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Lỗi', 'Cập nhật loại món thất bại');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên loại món');
      return;
    }

    if (!tempImage || !tempImage.uri) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh cho loại món');
      return;
    }
  
    try {
      // Kiểm tra trùng tên
      const nameExists = await checkCategoryNameExists(newCategoryName);
      if (nameExists) {
        Alert.alert('Lỗi', 'Tên loại món đã tồn tại');
        return;
      }
  
      // Lấy toàn bộ loại món để tìm key lớn nhất
      const snapshot = await database().ref('loaimon').once('value');
  
      let nextMaLoai = 1;
      if (snapshot.exists()) {
        const data = snapshot.val();
        const keys = Object.keys(data).map(k => parseInt(k)).filter(n => !isNaN(n));
        const maxKey = keys.length > 0 ? Math.max(...keys) : 0;
        nextMaLoai = maxKey + 1;
      }
  
      let imageUrl = '';
      if (tempImage && tempImage.uri) {
        const filename = `category_${nextMaLoai}_${Date.now()}.jpg`;
        const reference = storage().ref(`loai_mon_images/${filename}`);
        await reference.putFile(tempImage.uri);
        imageUrl = await reference.getDownloadURL();
      }
  
      const newCategory = {
        tenLoai: newCategoryName,
        imgLoai: imageUrl,
        maLoai: nextMaLoai
      };
  
      // Ghi vào Firebase với key là số nguyên
      await database().ref(`loaimon/${nextMaLoai}`).set(newCategory);
  
      setNewCategoryName('');
      setTempImage(null);
      setShowAddDialog(false);
      Alert.alert('Thành công', 'Thêm loại món thành công');
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Lỗi', 'Thêm loại món thất bại');
    }
  };
  
  

  const pickImage = () => {
    const options = {
      mediaType: 'photo',
      maxWidth: 800,
      maxHeight: 800,
      quality: 1,
    };
  
    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const source = { uri: response.assets[0].uri };
        setTempImage(source);
      }
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        if (maquyen === 3) {
          navigation.navigate('Mon', { 
            categoryId: item.maloai, // Chuyển thành số    // Truyền maLoai
            categoryName: item.name,  // Truyền tenLoai
            maquyen: maquyen
          });
        }
      }}
      onLongPress={(maquyen === 1 || maquyen === 2) ? (e) => openMenu(item.id, e) : null}
      delayLongPress={300}
    >
      <View style={styles.itemContainer}>
        <Image 
          source={{ uri: item.image }} 
          style={styles.itemImage} 
          defaultSource={require('../assets/images/image.png')}
        />
        <View style={styles.textOverlay}>
          <Text style={styles.itemName}>{item.name}</Text>
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
        <Menu.Item onPress={() => handleEdit(item.id)} title="Sửa" />
        <Divider />
        <Menu.Item
          onPress={() => confirmDelete(item.id)}
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
          placeholder="Tìm loại món..."
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
          data={filteredCategories}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
              <Text style={{ color: '#FFA500', fontSize: 16 }}>Không có loại món nào</Text>
            </View>
          }
        />
        <Portal>
  <Dialog
    visible={showConfirmDeleteDialog}
    onDismiss={() => setShowConfirmDeleteDialog(false)}
    style={styles.dialog}
  >
    <Dialog.Title style={styles.dialogTitle}>Xác nhận</Dialog.Title>
    <Dialog.Content>
      <Text style={styles.notificationText}>
        Bạn có chắc muốn xóa loại món này không?
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


        {/* Dialog thêm mới */}
        <Portal>
          <Dialog
            visible={showAddDialog}
            onDismiss={() => setShowAddDialog(false)}
            style={{
              backgroundColor: 'white',
              borderColor: '#FFA500',
              borderWidth: 2,
              borderRadius: 12,
            }}
          >
            <Dialog.Title style={{textAlign: 'center', fontWeight: 'bold', marginBottom: 28, marginTop: 16, fontSize: 20 }}>
              Thêm loại món
            </Dialog.Title>

            <Dialog.Content style={{ alignItems: 'center' }}>
              <TouchableOpacity onPress={pickImage}>
                {tempImage ? (
                  <Image
                    source={{ uri: tempImage.uri }}
                    style={{ width: 180, height: 150, marginBottom: 5, borderRadius: 8 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 90,
                      height: 90,
                      marginBottom: 20,
                      backgroundColor: '#f0f0f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                    }}
                  >
                    <IconButton
                      icon="image-outline"
                      iconColor="#FF9800"
                      size={125}
                      onPress={pickImage}
                    />
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                label="Nhập tên loại món"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                mode="outlined"
                style={{ width: '100%', height: 43}}
                left={<TextInput.Icon icon="pencil" color="#FFA500"/>}
                theme={{ colors: { primary: '#FFA500',  onSurfaceVariant: '#FFA500' } }}
              />

              <TouchableOpacity onPress={handleAddCategory} style={{ borderRadius: 10, overflow: 'hidden', width: '100%', marginTop: 21 }}>
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

        {/* Dialog chỉnh sửa */}
        <Portal>
          <Dialog
            visible={showEditDialog}
            onDismiss={() => setShowEditDialog(false)}
            style={{
              backgroundColor: 'white',
              borderColor: '#FFA500',
              borderWidth: 2,
              borderRadius: 12,
            }}
          >
            <Dialog.Title
              style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 35, marginTop: 16 }}
            >
              Sửa loại món
            </Dialog.Title>

            <Dialog.Content style={{ alignItems: 'center' }}>
              <TouchableOpacity onPress={pickImage}>
                {tempImage ? (
                  <Image
                    source={{ uri: tempImage.uri }}
                    style={{ width: 150, height: 130, marginBottom: 15, borderRadius: 8 }}
                  />
                ) : (
                  <Image
                    source={{ uri: categories.find(c => c.id === currentCategoryId)?.image }}
                    style={{ width: 150, height: 130, marginBottom: 15, borderRadius: 8 }}
                    defaultSource={require('../assets/images/image.png')}
                  />
                )}
              </TouchableOpacity>

              <TextInput
                label="Nhập tên loại món"
                value={editCategoryName}
                onChangeText={setEditCategoryName}
                mode="outlined"
                style={{ width: '100%', height: 43 }}
                left={<TextInput.Icon icon="pencil" color="#FFA500" />}
                theme={{ 
                  colors: { 
                    primary: '#FFA500', 
                    onSurfaceVariant: '#FFA500' 
                  } 
                }}
              />

              <TouchableOpacity
                onPress={handleUpdateCategory}
                style={{ borderRadius: 10, overflow: 'hidden', width: '100%', marginTop: 21 }}
              >
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
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>LƯU</Text>
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
    marginBottom: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: width - 16,
    height: 150,
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
  itemName: {
    backgroundColor: '#FFA500',
    color: 'white',
    fontSize: 25,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  menuContent: {
    backgroundColor: 'white',
  },
  dialogInput: {
    marginTop: 8,
    marginBottom: 8,
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
  dialogInput: {
    width: '100%',
    height: 43,
    marginBottom: 8,
    backgroundColor: '#fff'
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
  dialogTitledatban: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 16,
    fontSize: 20,
    color: '#FFA500',
  },
  menuStyle: {
    marginTop: -70, // Điều chỉnh vị trí menu nếu cần
  },
});

export default LoaiMonScreen;