import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ImageBackground, PermissionsAndroid, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { TextInput, Provider as PaperProvider, RadioButton, Portal, Dialog, Checkbox, HelperText } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Login = ({ navigation }) => {
  // State for dialogs
  const [loginVisible, setLoginVisible] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);
    const [isAutoLoginAttempted, setIsAutoLoginAttempted] = useState(false);
const [isManualLogout, setIsManualLogout] = useState(false);

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regHidePassword, setRegHidePassword] = useState(true);
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regHideConfirmPassword, setRegHideConfirmPassword] = useState(true);
  const [regDob, setRegDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [regGender, setRegGender] = useState('Nam');
  const [regImageUri, setRegImageUri] = useState(null);
  
  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');

  // Helper text validations
  const hasLoginInputError = () => {
  // Nếu input chứa @ thì kiểm tra email format
  if (email.includes('@')) {
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  // Nếu là username thì không cần validate format
  return false;
};
  const hasPasswordError = () => password && password.length < 6;
  const hasRegFullNameError = () => regFullName && regFullName.trim().length < 2;
  const hasRegUsernameError = () => regUsername && regUsername.trim().length < 3;
  const hasRegEmailError = () => regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail);
  const hasRegPhoneError = () => regPhone && !/^\d{10,11}$/.test(regPhone);
  const hasRegPasswordError = () => regPassword && regPassword.length < 6;
  const hasRegConfirmPasswordError = () => regConfirmPassword && regConfirmPassword !== regPassword;

    // Load saved credentials khi component mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      const credentials = await loadLoginCredentials();
      if (credentials) {
        setEmail(credentials.email);
        setPassword(credentials.password);
        setRememberMe(true);
      }
    };
    
    loadSavedCredentials();
  }, []);

  useEffect(() => {
    const checkManualLogout = async () => {
      const manualLogout = await AsyncStorage.getItem('isManualLogout');
      if (manualLogout === 'true') {
        await AsyncStorage.removeItem('isManualLogout');
        setIsManualLogout(true);
      }
    };
    checkManualLogout();
  }, []);

 useEffect(() => {
    const attemptAutoLogin = async () => {
      if (isManualLogout) {
        setIsAutoLoginAttempted(true);
        return;
      }
      const credentials = await loadLoginCredentials();
      if (credentials) {
        setEmail(credentials.email);
        setPassword(credentials.password);
        setRememberMe(true);
        
        // Thử đăng nhập tự động
        try {
          const usersRef = database().ref('/Users');
          const snapshot = await usersRef.once('value');
          
          if (!snapshot.exists()) {
            return;
          }

          let foundUser = null;
          let loginEmail = null;
          
          snapshot.forEach(child => {
            const userData = child.val();
            if (userData?.email === credentials.email.trim() || userData?.username === credentials.email.trim()) {
              foundUser = userData;
              loginEmail = userData.email;
            }
          });

          if (!foundUser || !loginEmail) {
            return;
          }

          const userCredential = await auth().signInWithEmailAndPassword(loginEmail, credentials.password);
          const user = userCredential.user;

          if (user) {
            switch (foundUser.maquyen) {
              case 1:
              case 2:
                navigation.navigate('AppStack', { userData: foundUser });
                break;
              case 3:
                navigation.navigate('KhachHang', { userData: foundUser });
                break;
            }
          }
        } catch (error) {
          console.log('Tự động đăng nhập thất bại:', error);
          // Không hiển thị thông báo lỗi cho người dùng
        } finally {
          setIsAutoLoginAttempted(true);
        }
      } else {
        setIsAutoLoginAttempted(true);
      }
    };
    
    attemptAutoLogin();
  }, []);

  // Hàm lưu thông tin đăng nhập
const saveLoginCredentials = async (email, password) => {
  try {
    await AsyncStorage.setItem('rememberedCredentials', JSON.stringify({
      email,
      password
    }));
  } catch (error) {
    console.error('Lỗi khi lưu thông tin đăng nhập:', error);
  }
};

// Hàm đọc thông tin đăng nhập đã lưu
const loadLoginCredentials = async () => {
  try {
    const credentials = await AsyncStorage.getItem('rememberedCredentials');
    return credentials ? JSON.parse(credentials) : null;
  } catch (error) {
    console.error('Lỗi khi đọc thông tin đăng nhập:', error);
    return null;
  }
};

// Hàm xóa thông tin đăng nhập đã lưu
const clearLoginCredentials = async () => {
  try {
    await AsyncStorage.removeItem('rememberedCredentials');
  } catch (error) {
    console.error('Lỗi khi xóa thông tin đăng nhập:', error);
  }
};

  // Show/hide dialogs
  const showLoginDialog = () => {
    setLoginVisible(true);
    setRegisterVisible(false);
  };

  const showRegisterDialog = () => {
    setRegisterVisible(true);
    setLoginVisible(false);
    resetRegistrationForm();
  };

  const resetRegistrationForm = () => {
    setRegFullName('');
    setRegUsername('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegDob(new Date());
    setRegGender('Nam');
    setRegImageUri(null);
  };

  // Handle login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên đăng nhập/email và mật khẩu');
      return;
    }
  
    try {
      const usersRef = database().ref('/Users');
      const snapshot = await usersRef.once('value');
  
      if (!snapshot.exists()) {
        Alert.alert('Lỗi', 'Không có dữ liệu người dùng');
        return;
      }
  
      let foundUser = null;
      let loginEmail = null;
  
      // ✅ Tìm theo email hoặc username
      snapshot.forEach(child => {
        const userData = child.val();
        if (userData?.email === email.trim() || userData?.username === email.trim()) {
          foundUser = userData;
          loginEmail = userData.email;
        }
      });
  
      if (!foundUser || !loginEmail) {
        Alert.alert('Lỗi', 'Không tìm thấy tài khoản phù hợp');
        return;
      }
  
      // ✅ Đăng nhập bằng email tìm được
      const userCredential = await auth().signInWithEmailAndPassword(loginEmail, password);
      const user = userCredential.user;
  
      if (!user) {
        Alert.alert('Lỗi', 'Không thể xác thực tài khoản');
        return;
      }

      if (rememberMe) {
        await saveLoginCredentials(email, password);
      } else {
        await clearLoginCredentials();
      }
  
      // ✅ Điều hướng theo quyền
      switch (foundUser.maquyen) {
        case 1:
        case 2:
            navigation.navigate('AppStack', { 
            userData: foundUser // Truyền toàn bộ thông tin người dùng
          });
          break;
        case 3:
          navigation.navigate('KhachHang', { userData: foundUser });
          break;
        default:
          Alert.alert('Lỗi', 'Quyền người dùng không hợp lệ');
      }
  
    } catch (error) {
  console.log('Login error:', error);

  let errorMessage = 'Đăng nhập thất bại';
  
  if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
    errorMessage = 'Tên đăng nhập / Email hoặc mật khẩu không đúng!';
  }

  Alert.alert('Lỗi', errorMessage);
}

  };
  
  // Handle registration
  const handleRegister = async () => {
    if (!regFullName || !regUsername || !regEmail || !regPhone || !regPassword || !regConfirmPassword) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
  
    if (regPassword !== regConfirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu không khớp');
      return;
    }
  
    try {
         // ✅ Kiểm tra trùng
  // ✅ Kiểm tra trùng email hoặc username
  const usersRef = database().ref('Users');
  const existingSnapshot = await usersRef.once('value');

  if (existingSnapshot.exists()) {
    const usersData = existingSnapshot.val();

    const isUsernameDuplicate = Object.values(usersData).some(user =>
      user && user.username === regUsername
    );

    if (isUsernameDuplicate) {
      Alert.alert('Thông báo', 'Tên đăng nhập đã được sử dụng');
      return;
    }
  }
      const userCredential = await auth().createUserWithEmailAndPassword(regEmail, regPassword);
      const user = userCredential.user;
  
      let imageUrl = '';
      if (regImageUri) {
        const filename = regUsername + '_' + Date.now();
        const reference = storage().ref(`profile_images/${filename}`);
        await reference.putFile(regImageUri);
        imageUrl = await reference.getDownloadURL();
      }
      else {
        // ✅ Sử dụng link ảnh mặc định trực tiếp
        imageUrl = 'https://firebasestorage.googleapis.com/v0/b/quanlynhahang-firebase.appspot.com/o/profile_images%2Favt_default.jpg?alt=media&token=5634d3b5-eece-4203-bfbe-1e2c26dfcf92';
      }
      const snapshot = await usersRef.once('value');

      let nextId = 1;
      if (snapshot.exists()) {
        const data = snapshot.val();
        const keys = Object.keys(data).map(key => parseInt(key)).filter(key => !isNaN(key));
        if (keys.length > 0) {
          nextId = Math.max(...keys) + 1;
        }
      }
  
      const userData = {
        maUser: nextId,
        fullName: regFullName,
        username: regUsername,
        email: regEmail,
        phoneNumber: regPhone,
        dateOfBirth: format(regDob, 'dd/MM/yyyy'),
        gender: regGender,
        maquyen: 3,
        imageUrl: imageUrl || ''
      };
  
      await usersRef.child(nextId.toString()).set(userData);
  
      Alert.alert('Thành công', 'Đăng ký thành công!');
      setRegisterVisible(false);
      resetRegistrationForm();
    } catch (error) {
        console.log('Firebase Register Error:', error);
        if (error.code === 'auth/email-already-in-use') {
          Alert.alert('Thông báo', 'Email đã được sử dụng');
        } else {
          Alert.alert('Lỗi', 'Đăng ký thất bại: ' + error.message);
        }
      }      
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert('Thông báo', 'Vui lòng nhập email');
      return;
    }

    try {
      await auth().sendPasswordResetEmail(forgotEmail);
      Alert.alert('Thành công', 'Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.');
      setForgotPasswordVisible(false);
    } catch (error) {
      Alert.alert('Lỗi', error.message);
    }
  };
  
  // Show image picker dialog
  const showImagePickerDialog = () => {
    Alert.alert(
      'Chọn ảnh đại diện',
      'Bạn muốn chọn ảnh từ đâu?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Thư viện ảnh',
          onPress: () => selectImage('library'),
        },
        {
          text: 'Chụp ảnh',
          onPress: () => selectImage('camera'),
        },
      ],
      { cancelable: true }
    );
  };

  // Handle image selection
  const selectImage = async (source) => {
    try {
      let result;
  
      if (source === 'library') {
        result = await launchImageLibrary({
          mediaType: 'photo',
          quality: 0.8,
        });
      } else {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          Alert.alert('Thông báo', 'Bạn cần cấp quyền camera để chụp ảnh');
          return;
        }
  
        result = await launchCamera({
          mediaType: 'photo',
          quality: 0.8,
        });
      }
  
      if (result?.assets && result.assets[0].uri) {
        setRegImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Image selection error:', error);
    }
  };

  // Request camera permission
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Quyền sử dụng camera',
            message: 'Ứng dụng cần quyền để sử dụng camera',
            buttonNeutral: 'Hỏi sau',
            buttonNegative: 'Từ chối',
            buttonPositive: 'Đồng ý',
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

  return (
    <ImageBackground
      source={require('../assets/images/templatedangnhap.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <PaperProvider>
        {!isAutoLoginAttempted ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFA500" />
          <Text style={styles.loadingText}>Đang đăng nhập tự động...</Text>
        </View>
      ) : (
        <View style={styles.container}>
          {/* Main content */}
          <View style={styles.content}>
            <Text style={styles.title}>Hệ thống quản lý nhà hàng The Mira</Text>
            
            {/* Login and Register buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={showLoginDialog} style={styles.buttonWrapper2}>
                <LinearGradient
                  colors={['#FF69B4', '#FFD700']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>ĐĂNG NHẬP</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={showRegisterDialog} style={styles.buttonWrapper2}>
                <LinearGradient
                  colors={['#FF69B4', '#FFD700']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>ĐĂNG KÝ</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Dialog */}
          <Portal>
            <Dialog 
              visible={loginVisible} 
              onDismiss={() => setLoginVisible(false)}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle}>Đăng nhập</Dialog.Title>
              <Dialog.Content>
                <TextInput
                  label="Tên đăng nhập / Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  style={styles.dialogInput}
                  left={<TextInput.Icon icon="email" color="#FFA500" />}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  theme={{ colors: { primary: '#FFA500' } }}
                />
                <HelperText type="error" visible={hasLoginInputError()}>
  {email.includes('@') ? 'Email không đúng định dạng' : ''}
</HelperText>
                <TextInput
                  label="Mật khẩu"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={hidePassword}
                  style={styles.dialogInput}
                  left={<TextInput.Icon icon="lock" color="#FFA500" />}
                  right={
                    <TextInput.Icon 
                      icon={hidePassword ? "eye" : "eye-off"} 
                      onPress={() => setHidePassword(!hidePassword)}
                    />
                  }
                  theme={{ colors: { primary: '#FFA500' } }}
                />
                <HelperText type="error" visible={hasPasswordError()}>
                  Mật khẩu phải có ít nhất 6 ký tự
                </HelperText>
                
                <View style={styles.loginFooter}>
                  <View style={styles.rememberMeContainer}>
                    <Checkbox
                      status={rememberMe ? 'checked' : 'unchecked'}
                      onPress={() => setRememberMe(!rememberMe)}
                      color="#FFA500"
                    />
                    <Text style={styles.rememberMeText}>Lưu thông tin</Text>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => {
                      setLoginVisible(false);
                      setForgotPasswordVisible(true);
                    }}
                    style={styles.forgotPasswordButton}
                  >
                    <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.dialogButtonContainer}>
                  <TouchableOpacity onPress={handleLogin} style={styles.buttonWrapper}>
                    <LinearGradient
                      colors={['#FF69B4', '#FFD700']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.gradientButton}
                    >
                      <Text style={styles.buttonText}>ĐĂNG NHẬP</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Dialog.Content>
            </Dialog>
          </Portal>

          {/* Register Dialog */}
          <Portal>
            <Dialog 
              visible={registerVisible} 
              onDismiss={() => setRegisterVisible(false)}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle}>Đăng ký tài khoản</Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                <ScrollView style={styles.detailScrollView}>
                  {/* Profile picture */}
                  <TouchableOpacity onPress={showImagePickerDialog} style={styles.avatarContainer}>
                    {regImageUri ? (
                      <Image source={{ uri: regImageUri }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarPlaceholderText}>+</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  <TextInput
                    label="Họ tên"
                    value={regFullName}
                    onChangeText={setRegFullName}
                    mode="outlined"
                    style={styles.dialogInput}
                    left={<TextInput.Icon icon="account" color="#FFA500" />}
                    theme={{ colors: { primary: '#FFA500' } }}
                  />
                  <HelperText type="error" visible={hasRegFullNameError()}>
                    Họ tên phải có ít nhất 2 ký tự
                  </HelperText>
                  
                  <TextInput
                    label="Tên tài khoản"
                    value={regUsername}
                    onChangeText={setRegUsername}
                    mode="outlined"
                    style={styles.dialogInput}
                    left={<TextInput.Icon icon="account-circle" color="#FFA500" />}
                    theme={{ colors: { primary: '#FFA500' } }}
                  />
                  <HelperText type="error" visible={hasRegUsernameError()}>
                    Tên tài khoản phải có ít nhất 3 ký tự
                  </HelperText>
                  
                  <TextInput
                    label="Email"
                    value={regEmail}
                    onChangeText={setRegEmail}
                    mode="outlined"
                    style={styles.dialogInput}
                    left={<TextInput.Icon icon="email" color="#FFA500" />}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    theme={{ colors: { primary: '#FFA500' } }}
                  />
                  <HelperText type="error" visible={hasRegEmailError()}>
                    Email không hợp lệ
                  </HelperText>
                  
                  <TextInput
                    label="Số điện thoại"
                    value={regPhone}
                    onChangeText={setRegPhone}
                    mode="outlined"
                    style={styles.dialogInput}
                    left={<TextInput.Icon icon="phone" color="#FFA500" />}
                    keyboardType="phone-pad"
                    theme={{ colors: { primary: '#FFA500' } }}
                  />
                  <HelperText type="error" visible={hasRegPhoneError()}>
                    Số điện thoại phải có 10-11 chữ số
                  </HelperText>

                  <TextInput
                    label="Mật khẩu"
                    value={regPassword}
                    onChangeText={setRegPassword}
                    mode="outlined"
                    secureTextEntry={regHidePassword}
                    style={styles.dialogInput}
                    left={<TextInput.Icon icon="lock" color="#FFA500" />}
                    right={
                      <TextInput.Icon 
                        icon={regHidePassword ? "eye" : "eye-off"} 
                        onPress={() => setRegHidePassword(!regHidePassword)}
                      />
                    }
                    theme={{ colors: { primary: '#FFA500' } }}
                  />
                  <HelperText type="error" visible={hasRegPasswordError()}>
                    Mật khẩu phải có ít nhất 6 ký tự
                  </HelperText>
                  
                  <TextInput
                    label="Nhập lại mật khẩu"
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    mode="outlined"
                    secureTextEntry={regHideConfirmPassword}
                    style={styles.dialogInput}
                    left={<TextInput.Icon icon="lock" color="#FFA500" />}
                    right={
                      <TextInput.Icon 
                        icon={regHideConfirmPassword ? "eye" : "eye-off"} 
                        onPress={() => setRegHideConfirmPassword(!regHideConfirmPassword)}
                      />
                    }
                    theme={{ colors: { primary: '#FFA500' } }}
                  />
                  <HelperText type="error" visible={hasRegConfirmPasswordError()}>
                    Mật khẩu không khớp
                  </HelperText>
                  
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <TextInput
                      label="Ngày sinh"
                      value={format(regDob, 'dd/MM/yyyy')}
                      mode="outlined"
                      style={styles.dialogInput}
                      editable={false}
                      left={<TextInput.Icon icon="calendar" color="#FFA500" />}
                      theme={{ colors: { primary: '#FFA500' } }}
                    />
                  </TouchableOpacity>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={regDob}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setRegDob(selectedDate);
                        }
                      }}
                    />
                  )}
                  
                  <View style={styles.genderRow}>
                    <Text style={styles.genderLabel}>Giới tính</Text>
                    <RadioButton.Group onValueChange={setRegGender} value={regGender}>
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
                  
                  <View style={styles.dialogButtonContainer}>
                    <TouchableOpacity onPress={handleRegister} style={styles.buttonWrapper}>
                      <LinearGradient
                        colors={['#FF69B4', '#FFD700']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientButton}
                      >
                        <Text style={styles.buttonText}>ĐĂNG KÝ</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </Dialog.Content>
            </Dialog>
          </Portal>

          {/* Forgot Password Dialog */}
          <Portal>
            <Dialog 
              visible={forgotPasswordVisible} 
              onDismiss={() => setForgotPasswordVisible(false)}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle}>Quên mật khẩu</Dialog.Title>
              <Dialog.Content>
                <TextInput
                  label="Email"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  mode="outlined"
                  style={styles.dialogInput}
                  left={<TextInput.Icon icon="email" color="#FFA500" />}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  theme={{ colors: { primary: '#FFA500' } }}
                />
                
                <View style={styles.dialogButtonContainer}>
                  <TouchableOpacity onPress={handleForgotPassword} style={styles.buttonWrapper}>
                    <LinearGradient
                      colors={['#FF69B4', '#FFD700']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.gradientButton}
                    >
                      <Text style={styles.buttonText}>GỬI YÊU CẦU</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Dialog.Content>
            </Dialog>
          </Portal>
        </View>
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 30,
    textAlign: 'center'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 30,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  buttonWrapper2: {
    flex: 1,
  },
  gradientButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  dialog: {
    backgroundColor: 'white',
    borderColor: '#FFA500',
    borderWidth: 2,
    borderRadius: 20,
    width: '90%',
    marginHorizontal: 0,
    alignSelf: 'center',
  },
  dialogContent: {
    paddingLeft: 11,
    paddingRight: 11
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
    justifyContent: 'center',
    marginTop: 15,
  },
  detailScrollView: {
    maxHeight: 550,
  },
  loginFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 8,
  },
  forgotPasswordButton: {
    padding: 8,
  },
  forgotPasswordText: {
    color: '#FFA500',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 30,
    color: '#666',
  },
  genderRow: {
    flexDirection: 'wrap',
    alignItems: 'left',
    marginBottom: 5,
    marginTop: -1
  },
  genderLabel: {
    marginRight: 10,
    fontWeight: 'bold',
  },
  radioGroup: {
    flexDirection: 'row',
    alignItems: 'left',
    marginLeft: -6,
    marginTop: 3
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  radioLabel: {
    marginLeft: 5,
  },
    loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  loadingText: {
    marginTop: 10,
    color: '#FFA500',
    fontSize: 16,
  },
});

export default Login;