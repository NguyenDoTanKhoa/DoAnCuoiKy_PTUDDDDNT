import React, { useState, useEffect } from 'react';
import { 
  View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Platform, PermissionsAndroid, BackHandler 
} from 'react-native';
import { 
  TextInput, Provider as PaperProvider, RadioButton, Portal, Dialog, HelperText 
} from 'react-native-paper';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import database from '@react-native-firebase/database';
import ImageBackground from 'react-native/Libraries/Image/ImageBackground';
import { useNavigation, useRoute } from '@react-navigation/native';

const ProfileScreen = ({ route }) => {
  const { userData } = route.params || {};
  const [name, setName] = useState(userData?.fullName || '');
  const [username, setUsername] = useState(userData?.username || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [phone, setPhone] = useState(userData?.phoneNumber || '');
  
  // Validation helpers
  const hasNameError = () => name && name.trim().length < 2;
  const hasUsernameError = () => username && username.trim().length < 3;
  const hasEmailError = () => email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const hasPhoneError = () => phone && !/^\d{10,11}$/.test(phone);
  const hasCurrentPasswordError = () => currentPassword && currentPassword.length < 6;
  const hasNewPasswordError = () => newPassword && newPassword.length < 6;
  const hasConfirmPasswordError = () => confirmPassword && confirmPassword !== newPassword;
const [showPasswordConfirmDialog, setShowPasswordConfirmDialog] = useState(false);
const [passwordForEmailChange, setPasswordForEmailChange] = useState('');
const [newEmail, setNewEmail] = useState('');

  const parseDate = (dateString) => {
    if (!dateString) return new Date();
    
    const parts = dateString.split(/[/-]/);
    if (parts.length === 3) {
      const formats = [
        new Date(parts[2], parts[1] - 1, parts[0]), // dd/MM/yyyy
        new Date(parts[2], parts[0] - 1, parts[1])  // MM/dd/yyyy
      ];
      return formats.find(d => !isNaN(d.getTime())) || new Date();
    }
    return new Date(dateString) || new Date();
  };

  const [dob, setDob] = useState(parseDate(userData?.dateOfBirth));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState(userData?.gender || 'Nam');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempImageUri, setTempImageUri] = useState(null); // Ảnh tạm
  const [currentImageUri, setCurrentImageUri] = useState(userData?.imageUrl || null); // Ảnh hiện tại
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const navigation = useNavigation();

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

  // Hàm xử lý chọn ảnh
  const showImagePickerDialog = () => {
    Alert.alert(
      'Chọn ảnh đại diện',
      'Bạn muốn chọn ảnh từ đâu?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Thư viện ảnh', onPress: () => selectImage('library') },
        { text: 'Chụp ảnh', onPress: () => selectImage('camera') },
      ],
      { cancelable: true }
    );
  };

  // Chọn ảnh từ thư viện hoặc camera
  const selectImage = async (source) => {
    try {
      let result;
      const options = {
        mediaType: 'photo',
        quality: 0.8,
      };

      if (source === 'library') {
        result = await launchImageLibrary(options);
      } else {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          Alert.alert('Thông báo', 'Bạn cần cấp quyền camera để chụp ảnh');
          return;
        }
        result = await launchCamera(options);
      }

      if (result?.assets?.[0]?.uri) {
        setTempImageUri(result.assets[0].uri);
        Alert.alert('Thành công', 'Ảnh đã được chọn, bấm Cập nhật để lưu thay đổi');
      }
    } catch (error) {
      console.log('Image selection error:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  // Yêu cầu quyền camera (Android)
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Quyền sử dụng camera',
            message: 'Ứng dụng cần quyền để sử dụng camera',
            buttonPositive: 'Đồng ý',
            buttonNegative: 'Từ chối',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

// Upload ảnh lên Firebase Storage
const uploadImage = async (uri) => {
  if (!uri) return null;

  try {
    const filename = `profile_${userData?.maUser || Date.now()}.jpg`;
    const reference = storage().ref(`profile_images/${filename}`);
    
    // Nếu có ảnh cũ, xóa nó
    if (currentImageUri) {
      const oldReference = storage().refFromURL(currentImageUri);
      await oldReference.delete(); // Xóa ảnh cũ khỏi storage
    }

    // Upload ảnh mới lên Storage
    await reference.putFile(uri);
    const downloadUrl = await reference.getDownloadURL();
    
    return downloadUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

  // Kiểm tra email/username đã tồn tại
  const checkExistingUser = async (field, value, currentValue) => {
    if (value === currentValue) return false; // Không thay đổi
    
    const usersRef = database().ref('Users');
    const snapshot = await usersRef.once('value');
    
    if (snapshot.exists()) {
      const usersData = snapshot.val();
      return Object.values(usersData).some(
        user => user && user[field] === value && user.maUser !== userData.maUser
      );
    }
    return false;
  };

  const handlePasswordConfirmForEmailChange  = async () => {
  if (!passwordForEmailChange || !newEmail) {
    Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ mật khẩu và email mới');
    return;
  }

  try {
    const user = auth().currentUser;

    // Bước 1: Xác thực lại người dùng
    const credential = auth.EmailAuthProvider.credential(
      user.email,
      passwordForEmailChange
    );
    await user.reauthenticateWithCredential(credential);

    // Bước 2: Cập nhật email trong Authentication
    await user.updateEmail(newEmail);
    await user.sendEmailVerification();

    // Bước 3: Cập nhật email trong Database
    await database().ref(`Users/${userData.maUser}`).update({
      email: newEmail
    });

    // Reset & thông báo
    setShowPasswordConfirmDialog(false);
    setPasswordForEmailChange('');
    Alert.alert(
      'Thành công',
      'Đã đổi email thành công. Vui lòng kiểm tra email mới để xác minh.'
    );
  } catch (error) {
    let errorMessage = 'Đổi email thất bại';
    if (
      error.code === 'auth/wrong-password' || 
      error.code === 'auth/invalid-credential'
    ) {
      errorMessage = 'Mật khẩu hiện tại không đúng';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau';
    } else if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email này đã được sử dụng';
    }

    Alert.alert('Lỗi', errorMessage);
  }
};


const updateNonEmailInfo = async () => {
  let imageUrl = currentImageUri;
  if (tempImageUri) {
    imageUrl = await uploadImage(tempImageUri);
  }

  const updates = {
    fullName: name,
    username,
    phoneNumber: phone,
    dateOfBirth: safeFormatDate(dob),
    gender,
    ...(imageUrl && { imageUrl }),
  };
  
  await database().ref(`Users/${userData.maUser}`).update(updates);
  
  if (tempImageUri) {
    setCurrentImageUri(imageUrl);
    setTempImageUri(null);
  }
  
  Alert.alert('Thành công', 'Cập nhật thông tin thành công');
};

  // Xử lý cập nhật thông tin
  const handleUpdateProfile = async () => {
    if (!userData?.maUser) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    // Validate
    if (!name || !username || !email || !phone) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (hasNameError() || hasUsernameError() || hasEmailError() || hasPhoneError()) {
      Alert.alert('Thông báo', 'Vui lòng kiểm tra lại thông tin nhập');
      return;
    }

    setIsUpdating(true);
    try {
      // Kiểm tra email/username trùng
      const isEmailExist = await checkExistingUser('email', email, userData.email);
      if (isEmailExist) {
        Alert.alert('Thông báo', 'Email đã được sử dụng bởi tài khoản khác');
        return;
      }

      const isUsernameExist = await checkExistingUser('username', username, userData.username);
      if (isUsernameExist) {
        Alert.alert('Thông báo', 'Tên tài khoản đã được sử dụng');
        return;
      }
      

      // Nếu email thay đổi
    if (email !== userData.email) {
      const user = auth().currentUser;
      const providers = user.providerData;
      const isEmailProvider = providers.some(p => p.providerId === 'password');
      
      if (isEmailProvider) {
        // Lưu email mới và hiển thị dialog xác nhận mật khẩu
        setNewEmail(email);
        setShowPasswordConfirmDialog(true);
        return;
      } else {
        Alert.alert('Thông báo', 'Tài khoản của bạn không sử dụng email/password để đăng nhập');
      }
    }

    // Cập nhật các thông tin khác (không phải email)
    await updateNonEmailInfo();
    
  } catch (error) {
    console.error('Update error:', error);
    
    let errorMessage = 'Cập nhật thông tin thất bại';
    if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'Vui lòng đăng nhập lại để thay đổi email';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Tính năng đổi email không được bật cho tài khoản này';
    }
    
    Alert.alert('Lỗi', errorMessage);
  } finally {
      setIsUpdating(false);
    }
  };

  // Xử lý đổi mật khẩu
  const handleChangePassword = async () => {
  // Kiểm tra xem tất cả thông tin đã được điền đầy đủ chưa
  if (!currentPassword || !newPassword || !confirmPassword) {
    Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin');
    return;
  }

  // Kiểm tra lỗi nếu có
  if (hasCurrentPasswordError() || hasNewPasswordError() || hasConfirmPasswordError()) {
    Alert.alert('Thông báo', 'Vui lòng kiểm tra lại thông tin mật khẩu');
    return;
  }

  // Kiểm tra xem mật khẩu mới có trùng với mật khẩu cũ không
  if (newPassword === currentPassword) {
    Alert.alert('Lỗi', 'Mật khẩu mới không được trùng với mật khẩu cũ');
    return;
  }

  // Kiểm tra xem mật khẩu mới và mật khẩu xác nhận có khớp không
  if (newPassword !== confirmPassword) {
    Alert.alert('Lỗi', 'Mật khẩu mới và mật khẩu xác nhận không khớp');
    return;
  }

  setIsChangingPassword(true);
  try {
    const user = auth().currentUser;

    // Re-authenticate user
    const credential = auth.EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

    await user.reauthenticateWithCredential(credential);

    // Update password
    await user.updatePassword(newPassword);

    Alert.alert('Thành công', 'Đổi mật khẩu thành công');
    setShowPasswordDialog(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  } catch (error) {
    let errorMessage = 'Đổi mật khẩu thất bại';
    if (
      error.code === 'auth/wrong-password' || 
      error.code === 'auth/invalid-credential'
    ) {
      errorMessage = 'Mật khẩu hiện tại không đúng';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    Alert.alert('Lỗi', errorMessage);
  } finally {
    setIsChangingPassword(false);
  }
};


  const safeFormatDate = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    return format(date, 'dd/MM/yyyy');
  };

  return (
    <ImageBackground
      source={require('../assets/images/templatechung.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <PaperProvider>
        <ScrollView style={styles.container}>
          {/* Header với avatar và tiêu đề */}
          <View style={styles.header}>
            <Text style={styles.title}>Thông tin cá nhân</Text>
            <TouchableOpacity onPress={showImagePickerDialog}>
              <Image
                source={
                  tempImageUri ? { uri: tempImageUri } : 
                  currentImageUri ? { uri: currentImageUri } : 
                  require('../assets/images/avt_default.jpg')
                }
                style={styles.avatar}
              />
              {isUpdating && <ActivityIndicator style={styles.uploadIndicator} />}
            </TouchableOpacity>
          </View>

          {/* Thông tin cá nhân */}
          <View style={styles.infoContainer}>
            <TextInput
              label="Họ tên (*)"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.inputPaper}
              left={<TextInput.Icon icon="account" color="#FFA500" />}
              theme={{ 
                colors: { 
                  primary: '#FFA500',
                  background: '#ffe4b5',
                  surface: 'transparent'
                } 
              }}
            />
            <HelperText type="error" visible={hasNameError()}>
              Họ tên phải có ít nhất 2 ký tự
            </HelperText>

            <TextInput
              label="Tên tài khoản (*)"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.inputPaper}
              left={<TextInput.Icon icon="account-circle" color="#FFA500" />}
              theme={{ 
                colors: { 
                  primary: '#FFA500',
                  background: '#ffe4b5',
                  surface: 'transparent'
                } 
              }}
            />
            <HelperText type="error" visible={hasUsernameError()}>
              Tên tài khoản phải có ít nhất 3 ký tự
            </HelperText>

            <TextInput
              label="Email (*)"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.inputPaper}
              left={<TextInput.Icon icon="email" color="#FFA500" />}
              keyboardType="email-address"
              autoCapitalize="none"
              theme={{ 
                colors: { 
                  primary: '#FFA500',
                  background: '#ffe4b5',
                  surface: 'transparent'
                } 
              }}
            />
            <HelperText type="error" visible={hasEmailError()}>
              Email không hợp lệ
            </HelperText>

            <TextInput
              label="Số điện thoại (*)"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.inputPaper}
              left={<TextInput.Icon icon="phone" color="#FFA500" />}
              keyboardType="phone-pad"
              theme={{ 
                colors: { 
                  primary: '#FFA500',
                  background: '#ffe4b5',
                  surface: 'transparent'
                } 
              }}
            />
            <HelperText type="error" visible={hasPhoneError()}>
              Số điện thoại phải có 10-11 chữ số
            </HelperText>

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <TextInput
                label="Ngày sinh"
                value={safeFormatDate(dob)}
                mode="outlined"
                style={styles.inputPaper}
                editable={false}
                left={<TextInput.Icon icon="calendar" color="#FFA500" />}
                theme={{ 
                  colors: { 
                    primary: '#FFA500',
                    background: '#ffe4b5',
                    surface: 'transparent'
                  } 
                }}
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={isNaN(dob.getTime()) ? new Date() : dob}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDob(selectedDate);
                  }
                }}
              />
            )}

            {/* Giới tính */}
            <View style={styles.genderRow}>
              <Text style={{fontWeight: 'bold', fontSize: 15}}>Giới tính</Text>
              <RadioButton.Group onValueChange={setGender} value={gender}>
                <View style={styles.radioGroup}>
                  {['Nam', 'Nữ', 'Khác'].map((item) => (
                    <View key={item} style={styles.radioItem}>
                      <RadioButton value={item} color="#FFA500" />
                      <Text style={styles.radioLabel}>{item}</Text>
                    </View>
                  ))}
                </View>
              </RadioButton.Group>
            </View>
          </View>

          {/* Các nút hành động */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              onPress={handleUpdateProfile}
              disabled={isUpdating}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#FF69B4', '#FFD700']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  opacity: isUpdating ? 0.7 : 1,
                }}
              >
                {isUpdating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>CẬP NHẬT</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowPasswordDialog(true)}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#FF69B4', '#FFD700']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>ĐỔI MẬT KHẨU</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Dialog đổi mật khẩu */}
          <Portal>
            <Dialog 
              visible={showPasswordDialog} 
              onDismiss={() => setShowPasswordDialog(false)}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle}>Đổi mật khẩu</Dialog.Title>
              <Dialog.Content>
                <TextInput
                  label="Mật khẩu hiện tại (*)"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.dialogInput}
                  theme={{ colors: { primary: '#FFA500' } }}
                />
                <HelperText type="error" visible={hasCurrentPasswordError()}>
                  Mật khẩu phải có ít nhất 6 ký tự
                </HelperText>
                
                <TextInput
                  label="Mật khẩu mới (*)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.dialogInput}
                  theme={{ colors: { primary: '#FFA500' } }}
                />
                <HelperText type="error" visible={hasNewPasswordError()}>
                  Mật khẩu phải có ít nhất 6 ký tự
                </HelperText>
                
                <TextInput
                  label="Nhập lại mật khẩu mới (*)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.dialogInput}
                  theme={{ colors: { primary: '#FFA500' } }}
                />
                <HelperText type="error" visible={hasConfirmPasswordError()}>
                  Mật khẩu không khớp
                </HelperText>
                
                <View style={styles.dialogButtonContainer}>
                  <TouchableOpacity 
                    onPress={handleChangePassword}
                    disabled={isChangingPassword}
                    style={styles.buttonWrapper}
                  >
                    <LinearGradient
                      colors={['#FF69B4', '#FFD700']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        padding: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                        opacity: isChangingPassword ? 0.7 : 1,
                      }}
                    >
                      {isChangingPassword ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>ĐỔI MẬT KHẨU</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }} 
                    style={styles.buttonWrapper}
                  >
                    <LinearGradient
                      colors={['#FF69B4', '#FFD700']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        padding: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>XOÁ TRẮNG</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Dialog.Content>
            </Dialog>
          </Portal>

          <Portal>
          <Dialog 
            visible={showPasswordConfirmDialog} 
            onDismiss={() => setShowPasswordConfirmDialog(false)}
            style={styles.dialog}
          >
            <Dialog.Title style={styles.dialogTitle}>Xác nhận mật khẩu</Dialog.Title>
            <Dialog.Content>
              <Text style={{ marginBottom: 15 }}>
                Vui lòng nhập mật khẩu hiện tại để xác nhận đổi email
              </Text>
              
              <TextInput
                label="Mật khẩu hiện tại (*)"
                value={passwordForEmailChange}
                onChangeText={setPasswordForEmailChange}
                mode="outlined"
                secureTextEntry
                style={styles.dialogInput}
                theme={{ colors: { primary: '#FFA500' } }}
              />
              
              <TouchableOpacity onPress={handlePasswordConfirmForEmailChange} style={{ borderRadius: 10, overflow: 'hidden', width: '100%', marginTop: 10 }}>
                              <LinearGradient
                                colors={['#FF69B4', '#FFD700']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                  paddingVertical: 16,
                                  paddingHorizontal: 16,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 10,
                                }}
                              >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>XÁC NHẬN</Text>
                              </LinearGradient>
                            </TouchableOpacity>
            </Dialog.Content>
          </Dialog>
        </Portal>
        </ScrollView>
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
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  title: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15
  },
  infoContainer: {
    paddingHorizontal: 17,
  },
  inputPaper: {
    marginBottom: 5,
    backgroundColor: 'transparent',
  },
  radioGroup: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 20,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    marginTop: 10,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    marginBottom: -4
  },
  dialog: {
    backgroundColor: 'white',
    borderColor: '#FFA500',
    borderWidth: 2,
    borderRadius: 20,
  },
  dialogTitle: {
    color: '#FFA500',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dialogInput: {
    marginBottom: 5,
    backgroundColor: 'white',
  },
  dialogButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginHorizontal: -5,
  },
  uploadIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
  },
});

export default ProfileScreen;