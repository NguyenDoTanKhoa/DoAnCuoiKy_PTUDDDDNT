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
import { Dropdown } from 'react-native-element-dropdown';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useOrder } from '../../orderContext';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';

const { width } = Dimensions.get('window');

const MonScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [visibleMenuId, setVisibleMenuId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [editDishName, setEditDishName] = useState('');
  const [editDishPrice, setEditDishPrice] = useState('');
  const [currentDishId, setCurrentDishId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [tempImage, setTempImage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [selectedDeleteDishId, setSelectedDeleteDishId] = useState(null);
  const [maquyen, setMaquyen] = useState(3); // Default to customer role
  const [filteredDishes, setFilteredDishes] = useState([]); // Thêm state riêng cho filteredDishes

  const navigation = useNavigation();
  const route = useRoute();
  const { categoryId, categoryName, maquyen: routeMaquyen } = route.params || {};
  
  const { addToOrder, orderItems } = useOrder();

  // Load dishes from Firebase
  // Load dishes và filter ngay khi có dữ liệu
  useEffect(() => {
  const dishesRef = database().ref('mon');
  
  const subscriber = dishesRef.on('value', snapshot => {
    try {
      const dishesData = snapshot.val();
      if (dishesData) {
        const dishesArray = Object.keys(dishesData)
          .map(key => {
            const item = dishesData[key];
            if (item && item.maMon && item.tenMon && item.giaMon && item.imgMon && item.maLoaiMon) {
              return {
                id: key,
                maMon: item.maMon,
                name: item.tenMon,
                price: `${item.giaMon} VNĐ`,
                priceValue: item.giaMon,
                category: Number(item.maLoaiMon), // Đảm bảo là số
                image: item.imgMon
              };
            }
            return null;
          })
          .filter(item => item !== null);

        setDishes(dishesArray);
        
        // Filter logic cải tiến
        const filtered = dishesArray.filter(dish => {
          // Nếu không có categoryId (undefined/null) thì hiển thị tất cả
          if (categoryId === undefined || categoryId === null) return true;
          
          // Nếu có categoryId thì lọc theo category
          return dish.category === Number(categoryId);
        }).filter(dish =>
          dish.name.toLowerCase().includes(searchText.toLowerCase())
        );
        
        setFilteredDishes(filtered);
      } else {
        setDishes([]);
        setFilteredDishes([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading dishes:', error);
      setLoading(false);
    }
  });

  return () => dishesRef.off('value', subscriber);
}, [categoryId, searchText]);

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
              if (item && item.maLoai && item.tenLoai) {
                return {
                  label: item.tenLoai,
                  value: item.maLoai.toString()
                };
              }
              return null;
            })
            .filter(item => item !== null);

          setCategories(categoriesArray);
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
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
      setSelectedCategory('');
      navigation.setParams({ openAddDialog: false });
    }
  }, [route.params?.openAddDialog]);

  useEffect(() => {
      if (routeMaquyen) {
        setMaquyen(routeMaquyen);
      }
    }, [routeMaquyen]);

    useEffect(() => {
  if (showEditDialog && currentDishId) {
    const currentDish = dishes.find(d => d.id === currentDishId);
    if (currentDish) {
      setEditDishName(currentDish.name); // Using 'name' instead of 'tenMon'
      setEditDishPrice(currentDish.priceValue?.toString() || ''); // Using 'priceValue' with optional chaining
      setSelectedCategory(currentDish.category?.toString() || ''); // Using 'category' with optional chaining
      // Nếu có ảnh hiện tại, bạn có thể set vào tempImage nếu cần
    }
  }
}, [showEditDialog, currentDishId, dishes]);

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

  const openMenu = (id, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setVisibleMenuId(id);
  };

  const closeMenu = () => setVisibleMenuId(null);



const handleAddToOrder = () => {
  const parsedQuantity = parseInt(quantity);

  if (!quantity || isNaN(parsedQuantity) || parsedQuantity <= 0) {
    Alert.alert('Lỗi', 'Số lượng không được để trống!');
    return;
  }

  if (selectedDish) {
    addToOrder({
      id: selectedDish.id,
      maMon: selectedDish.maMon,
      name: selectedDish.name,
      price: selectedDish.priceValue,
      quantity: parsedQuantity,
      image: selectedDish.image
    });

    setShowOrderDialog(false);
    setQuantity('');
  }
};


  const confirmDelete = (id) => {
    closeMenu();
    setSelectedDeleteDishId(id);
    setShowConfirmDeleteDialog(true);
  };

  const handleDeleteConfirmed = async () => {
    try {
      const id = selectedDeleteDishId;
      const dish = dishes.find(d => d.id === id);
      
      // Delete image from storage first
      if (dish.image) {
        try {
          const imageRef = storage().refFromURL(dish.image);
          await imageRef.delete();
        } catch (error) {
          console.log('Error deleting image:', error);
        }
      }

      // Delete from database
      await database().ref(`mon/${id}`).remove();
      
      setShowConfirmDeleteDialog(false);
      Alert.alert('Thành công', 'Đã xóa món thành công');
    } catch (error) {
      console.error('Error deleting dish:', error);
      Alert.alert('Lỗi', 'Xóa món thất bại');
      setShowConfirmDeleteDialog(false);
    }
  };

  const handleEdit = (id) => {
    const dish = dishes.find(item => item.id === id);
    setEditDishName(dish.name);
    setEditDishPrice(dish.priceValue.toString());
    setSelectedCategory(dish.category);
    setCurrentDishId(id);
    setShowEditDialog(true);
    closeMenu();
  };

  const checkDishNameExists = async (name, excludeId = null) => {
    try {
      const snapshot = await database().ref('mon')
        .orderByChild('tenMon')
        .equalTo(name)
        .once('value');
      
      if (!snapshot.exists()) return false;
      
      const data = snapshot.val();
      if (excludeId) {
        return Object.keys(data).some(key => key !== excludeId);
      }
      return true;
    } catch (error) {
      console.error('Error checking dish name:', error);
      return true;
    }
  };

  const handleUpdateDish = async () => {
    if (!editDishName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên món');
      return;
    }

    if (!editDishPrice.trim() || isNaN(parseFloat(editDishPrice))) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá món hợp lệ');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại món');
      return;
    }

    try {
      // Check if name already exists (excluding current dish)
      const nameExists = await checkDishNameExists(editDishName, currentDishId);
      if (nameExists) {
        Alert.alert('Lỗi', 'Tên món đã tồn tại');
        return;
      }

      const updates = {
        tenMon: editDishName,
        giaMon: parseFloat(editDishPrice),
        maLoaiMon: parseInt(selectedCategory)
      };

      // Upload new image if selected
      if (tempImage) {
        // Delete old image first
        const oldDish = dishes.find(d => d.id === currentDishId);
        if (oldDish.image) {
          try {
            const oldImageRef = storage().refFromURL(oldDish.image);
            await oldImageRef.delete();
          } catch (error) {
            console.log('Error deleting old image:', error);
          }
        }

        // Upload new image
        const filename = `dish_${currentDishId}_${Date.now()}.jpg`;
        const reference = storage().ref(`mon_images/${filename}`);
        await reference.putFile(tempImage.uri);
        const imageUrl = await reference.getDownloadURL();
        updates.imgMon = imageUrl;
      }

      // Update in database
      await database().ref(`mon/${currentDishId}`).update(updates);

      setEditDishName('');
      setEditDishPrice('');
      setSelectedCategory('');
      setTempImage(null);
      setShowEditDialog(false);
      Alert.alert('Thành công', 'Cập nhật món thành công');
    } catch (error) {
      console.error('Error updating dish:', error);
      Alert.alert('Lỗi', 'Cập nhật món thất bại');
    }
  };

  const handleAddDish = async () => {
    if (!newDishName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên món');
      return;
    }

    if (!newDishPrice.trim() || isNaN(parseFloat(newDishPrice))) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá món hợp lệ');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại món');
      return;
    }

    if (!tempImage || !tempImage.uri) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh cho món');
      return;
    }

    try {
      // Check if name already exists
      const nameExists = await checkDishNameExists(newDishName);
      if (nameExists) {
        Alert.alert('Lỗi', 'Tên món đã tồn tại');
        return;
      }

      // Get all dishes to find the next ID
      const snapshot = await database().ref('mon').once('value');
      
      let nextMaMon = 1;
      if (snapshot.exists()) {
        const data = snapshot.val();
        const keys = Object.keys(data).map(k => parseInt(k)).filter(n => !isNaN(n));
        const maxKey = keys.length > 0 ? Math.max(...keys) : 0;
        nextMaMon = maxKey + 1;
      }

      // Upload image
      let imageUrl = '';
      if (tempImage && tempImage.uri) {
        const filename = `dish_${nextMaMon}_${Date.now()}.jpg`;
        const reference = storage().ref(`mon_images/${filename}`);
        await reference.putFile(tempImage.uri);
        imageUrl = await reference.getDownloadURL();
      }

      const newDish = {
        tenMon: newDishName,
        giaMon: parseFloat(newDishPrice),
        maLoaiMon: parseInt(selectedCategory),
        imgMon: imageUrl,
        maMon: nextMaMon
      };

      // Write to Firebase with numeric key
      await database().ref(`mon/${nextMaMon}`).set(newDish);

      setNewDishName('');
      setNewDishPrice('');
      setSelectedCategory('');
      setTempImage(null);
      setShowAddDialog(false);
      Alert.alert('Thành công', 'Thêm món thành công');
    } catch (error) {
      console.error('Error adding dish:', error);
      Alert.alert('Lỗi', 'Thêm món thất bại');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        if (maquyen === 3) { // Customer role
          setSelectedDish(item);
          setShowOrderDialog(true);
        }
      }}
      onLongPress={maquyen !== 3 ? (e) => openMenu(item.id, e) : null}
      delayLongPress={300}
      style={styles.itemContainer}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.itemImage} 
        defaultSource={require('../assets/images/image.png')}
      />
      <View style={styles.textContainer}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemPrice}>{item.price}</Text>
      </View>

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
            placeholder="Tìm món..."
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
            data={filteredDishes}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
                <Text style={{ color: '#FFA500', fontSize: 16 }}>Không có món nào</Text>
              </View>
            }
          />

          <Portal>
            <Dialog
              visible={showOrderDialog}
              onDismiss={() => setShowOrderDialog(false)}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle}>
                {selectedDish?.name}
                {(() => {
                  const existingItem = orderItems.find(item => item.id === selectedDish?.id);
                  return existingItem ? `\n(Đã thêm: ${existingItem.quantity})` : ''; 
                })()}
              </Dialog.Title>

              <Dialog.Content>
                <Text style={{ fontSize: 18, color: '#FFA500', fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
                  {selectedDish?.price} /1 phần
                </Text>
                    
                <TextInput
                  label="Nhập số lượng"
                  value={quantity}
                  onChangeText={(text) => {
                    setQuantity(text);
                  }}
                  keyboardType="numeric"
                  mode="outlined"
                  style={{ width: '100%', height: 43, marginBottom: 8, backgroundColor: '#fff'}}
                  theme={{ colors: { primary: '#FFA500' } }}
                />
                
                <TouchableOpacity 
                  onPress={handleAddToOrder}
                  style={{ borderRadius: 10, overflow: 'hidden', marginTop: 10 }}
                >
                  <LinearGradient
                    colors={['#FF69B4', '#FFD700']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      padding: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>ĐỒNG Ý</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Dialog.Content>
            </Dialog>
          </Portal>

          <Portal>
            <Dialog
              visible={showConfirmDeleteDialog}
              onDismiss={() => setShowConfirmDeleteDialog(false)}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle}>Xác nhận</Dialog.Title>
              <Dialog.Content>
                <Text style={styles.notificationText}>
                  Bạn có chắc muốn xóa món này không?
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
              style={styles.dialog}
            >
              <Dialog.Title style={{textAlign: 'center', fontWeight: 'bold', marginBottom: 28, marginTop: 16, fontSize: 20 }}>
                Thêm món
              </Dialog.Title>

              <Dialog.Content>
                <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center' }}>
                  {tempImage ? (
                    <Image
                      source={{ uri: tempImage.uri }}
                      style={{ width: 180, height: 150, marginBottom: 5, borderRadius: 8}}
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
                  label="Tên món"
                  value={newDishName}
                  onChangeText={setNewDishName}
                  mode="outlined"
                  style={{ width: '100%', height: 43, marginBottom: 8, backgroundColor: '#fff'}}
                  left={<TextInput.Icon icon="pencil" color="#FFA500"/>}
                  theme={{ colors: { primary: '#FFA500', onSurfaceVariant: '#FFA500' } }}
                />

                <TextInput
                  label="Giá món"
                  value={newDishPrice}
                  onChangeText={setNewDishPrice}
                  mode="outlined"
                  style={{ width: '100%', height: 43, marginBottom: 8, backgroundColor: '#fff'}}
                  left={<TextInput.Icon icon="currency-usd" color="#FFA500"/>}
                  theme={{ colors: { primary: '#FFA500', onSurfaceVariant: '#FFA500' } }}
                  keyboardType="numeric"
                />

                <Dropdown
                  data={categories}
                  labelField="label"
                  valueField="value"
                  value={selectedCategory}
                  onChange={item => setSelectedCategory(item.value)}
                  onFocus={() => setIsOpen(true)}
                  onBlur={() => setIsOpen(false)}
                  style={{
                    borderWidth: isOpen ? 2 : 1,
                    borderColor: isOpen ? '#FFA500' : '#79747E',
                    borderRadius: 4.5,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    height: 48,
                    justifyContent: 'center',
                    marginTop: 8
                  }}
                  placeholder="Chọn loại món"
                  placeholderStyle={{ 
                    color: '#FFA500', 
                    fontSize: 16,
                  }}
                  selectedTextStyle={{ 
                    color: '#FFA500', 
                    fontSize: 16,
                    marginVertical: 0,
                  }}
                  itemTextStyle={{ 
                    color: '#000', 
                    fontSize: 16,
                    paddingVertical: 1,
                  }}
                  activeColor="#FFE0B2"
                />

                <TouchableOpacity onPress={handleAddDish} style={{ borderRadius: 10, overflow: 'hidden', width: '100%', marginTop: 21 }}>
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
              style={styles.dialog}
            >
              <Dialog.Title style={{textAlign: 'center', fontWeight: 'bold', marginBottom: 28, marginTop: 16, fontSize: 20 }}>
                Sửa món
              </Dialog.Title>

              <Dialog.Content>
                <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center' }}>
                  {tempImage ? (
                    <Image
                      source={{ uri: tempImage.uri }}
                      style={{ width: 150, height: 130, marginBottom: 15, borderRadius: 8 }}
                    />
                  ) : (
                    <Image
                      source={{ uri: dishes.find(d => d.id === currentDishId)?.image }}
                      style={{ width: 150, height: 130, marginBottom: 15, borderRadius: 8 }}
                      defaultSource={require('../assets/images/image.png')}
                    />
                  )}
                </TouchableOpacity>

                <TextInput
                  label="Tên món"
                  value={editDishName}
                  onChangeText={setEditDishName}
                  mode="outlined"
                  style={{ width: '100%', height: 43, marginBottom: 8, backgroundColor: '#fff'}}
                  left={<TextInput.Icon icon="pencil" color="#FFA500"/>}
                  theme={{ colors: { primary: '#FFA500', onSurfaceVariant: '#FFA500' } }}
                />

                <TextInput
                  label="Giá món"
                  value={editDishPrice}
                  onChangeText={setEditDishPrice}
                  mode="outlined"
                  style={{ width: '100%', height: 43, marginBottom: 8, backgroundColor: '#fff'}}
                  left={<TextInput.Icon icon="currency-usd" color="#FFA500"/>}
                  theme={{ colors: { primary: '#FFA500', onSurfaceVariant: '#FFA500' } }}
                  keyboardType="numeric"
                />

                <Dropdown
                  data={categories}
                  labelField="label"
                  valueField="value"
                  value={selectedCategory}
                  onChange={item => setSelectedCategory(item.value)}
                  onFocus={() => setIsOpen(true)}
                  onBlur={() => setIsOpen(false)}
                  style={{
                    borderWidth: isOpen ? 2 : 1,
                    borderColor: isOpen ? '#FFA500' : '#79747E',
                    borderRadius: 4.5,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    height: 48,
                    justifyContent: 'center',
                    marginTop: 8
                  }}
                  placeholder="Chọn loại món"
                  placeholderStyle={{ 
                    color: '#FFA500', 
                    fontSize: 16,
                  }}
                  selectedTextStyle={{ 
                    color: '#FFA500', 
                    fontSize: 16,
                    marginVertical: 0,
                  }}
                  itemTextStyle={{ 
                    color: '#000', 
                    fontSize: 16,
                    paddingVertical: 1,
                  }}
                  activeColor="#FFE0B2"
                />

                <TouchableOpacity onPress={handleUpdateDish} style={{ borderRadius: 10, overflow: 'hidden', width: '100%', marginTop: 21 }}>
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
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  itemContainer: {
    width: (width - 48) / 2,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FAF3DD',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },  
  itemImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  textContainer: {
    padding: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: 'bold',
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
    paddingHorizontal: 25,
    marginBottom: -2
  },
});

export default MonScreen;