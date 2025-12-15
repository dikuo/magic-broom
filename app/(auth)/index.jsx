import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logo from "@/assets/images/logo.png";
import broom from "@/assets/lottie/broom.json";
import LottieView from 'lottie-react-native';
import * as Haptics from "expo-haptics";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Platform, Modal, Pressable } from 'react-native';
import Animated,{FadeInRight} from 'react-native-reanimated';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut 
} from "firebase/auth";
import { doc, getDoc} from "firebase/firestore";
import { db, auth} from "../firebaseConfig"; 


const LoginPage = () => {
  const router = useRouter();

  // Manage login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 🌟 FIX: 自定义 Modal 状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // 🌟 FIX: 辅助函数：显示自定义 Modal
  const showCustomAlert = (title, message, callback = () => {}) => {
      setModalTitle(title);
      setModalMessage(message);
      setModalVisible(true);
      
      global.onModalClose = callback; 
  };
  
  // 🌟 FIX: 辅助函数：关闭自定义 Modal
  const closeCustomAlert = () => {
      setModalVisible(false);
      
      if (global.onModalClose) {
          global.onModalClose();
      }
      global.onModalClose = null; 
  };
  
  // **Login Handler for regular users**
  const handleLogin = async () => {
    if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (!email || !password) {
      showCustomAlert("Error", "Please enter both email and password.");
      return;
    }
    
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user) {
        throw new Error("Authentication failed. No user returned.");
      }
  
      await user.reload();
      const refreshedUser = auth.currentUser;
      
      if (!refreshedUser.emailVerified) {
        showCustomAlert("Email Not Verified", "Please check your email and verify your account before logging in.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      setTimeout(() => {
        setLoading(false);
        router.replace("(tabs)");
      }, 2000);
  
      await AsyncStorage.setItem("email", email);
      await AsyncStorage.setItem("authToken", user.accessToken);
    } catch (error) {
      console.error("Login failed:", error);
      setLoading(false);
      showCustomAlert("Login Error", error.message);
    }
  };

  // **Login Handler for Cleaners**
  const handleCleanerLogin = async () => {
    if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!email || !password) {
      showCustomAlert("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user) {
        throw new Error("Authentication failed. No user returned.");
      }
  
      await user.reload();
      const refreshedUser = auth.currentUser;
  
      if (!refreshedUser.emailVerified) {
        showCustomAlert("Email Not Verified", "Please check your email and verify your account before logging in.");
        await signOut(auth);
        setLoading(false);
        return;
      }
  
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        throw new Error("User data not found in database.");
      }
  
      const userData = userDoc.data();
      const userRole = userData.role;
  
      if (userRole === "cleaner") {
        setTimeout(() => {
          setLoading(false);
          router.push("(cleanertabs)/requests");
        }, 2000);
      } else {
        showCustomAlert("Error", "This account is not registered as a cleaner.");
        await signOut(auth);
        setLoading(false);
        return;
      }
  
      await AsyncStorage.setItem("email", email);
      await AsyncStorage.setItem("authToken", user.accessToken);
      await AsyncStorage.setItem("userRole", userRole);
    } catch (error) {
      console.error("Cleaner Login failed:", error);
      setLoading(false);
      showCustomAlert("Login Error", error.message);
    }
  };

  // **Login Handler for Admin**
  const handleAdminLogin = async () => {
    if (!email || !password) {
      showCustomAlert("Error", "Please enter both email and password.");
      return;
    }
  
    setLoading(true);

    try {
      const AdminCredential = await signInWithEmailAndPassword(auth, email, password);
      const Admin = AdminCredential.user;
      if (!Admin) {
        throw new Error("Authentication failed. No user returned.");
      }
  
      await Admin.reload();
      const refreshedAdmin = auth.currentUser;
  
      if (!refreshedAdmin.emailVerified) {
        showCustomAlert("Email Not Verified", "Please check your email and verify your account before logging in.");
        await signOut(auth); 
        setLoading(false);
        return;
      }
  
      const userDoc = await getDoc(doc(db, "users", Admin.uid));
      if (!userDoc.exists()) {
        throw new Error("Admin user data not found in database.");
      }
  
      const userData = userDoc.data();
      const userRole = userData.role; 
  
      if (userRole === "admin") {
        await AsyncStorage.setItem("email", email);
        await AsyncStorage.setItem("authToken", Admin.accessToken);
        await AsyncStorage.setItem("userRole", "admin");
  
        setTimeout(() => {
          setLoading(false);
          router.replace("(admintabs)/CleanerManage");
        }, 2000);
      } else {
        showCustomAlert("Access Denied", "This account is not registered as an administrator.");
        await signOut(auth); 
        setLoading(false);
        return;
      }
      
    } catch (error) {
      console.error("Admin Login failed:", error);
      setLoading(false);
      showCustomAlert("Login Error", error.message);
    }
  };

  // **Handle Forgot Password (最终修复版本，使用 Modal)**
  const handleForgotPassword = async () => {
    console.log("--- DEBUG: Forgot Password button clicked. ---");
    
    if (!email) {
      showCustomAlert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true); 
    
    try {
      console.log(`DEBUG: Attempting to send reset email to: ${email}`);
      
      await sendPasswordResetEmail(auth, email);

      // 1. 成功发送邮件后，先关闭 loading 状态，确保 UI 视图回到表单
      setLoading(false); 

      // 2. 清理会话
      if (auth.currentUser) {
          await signOut(auth);
      }
      
      // 3. 弹出成功的 Alert
      showCustomAlert(
          "Success", 
          "Password reset email sent! Please check your inbox and log in with your new password.",
          // Modal 关闭后执行的回调，这里不需要额外操作，但保留结构
      );
      
    } catch (error) {
      console.error("DEBUG: Password Reset Error CAUGHT:", error);
      
      // 1. 在弹出 Alert 之前，必须先关闭 loading 状态，否则 Alert 无法显示
      setLoading(false); 
      
      // 2. 弹出错误提示
      showCustomAlert("Error", error.message);
    }
  };


  // **Resend Verification Email (最终修复版本，使用 Modal)**
  const handleResendVerification = async () => {
    try {  
      if (!email || !password) {
        showCustomAlert("Error", "Please enter both email and password.");
        return;
      }
      
      setLoading(true);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user) {
        throw new Error("Authentication failed. No user returned. Please Signup first.");
      }

      await user.reload();
      const refreshedUser = auth.currentUser;
  

      // Check if already verified
      if (refreshedUser.emailVerified) {
        showCustomAlert("Already Verified", "Your email is already verified.");
        await signOut(auth); 
        setLoading(false);
      }
      else if (!refreshedUser.emailVerified) {
        await sendEmailVerification(user);
        
        await signOut(auth);
        
        
        showCustomAlert("Success", "Verification email sent. Please check your inbox.", () => setLoading(false));
        return;
      }
      
    } catch (error) {
      console.error("Resend Verification Error:", error);
      if (auth.currentUser) {
          await signOut(auth);
      }
      setLoading(false);
      showCustomAlert("Error", error.message);
    }
  };

  // **Go to Sign-Up Page**
  const goToSignUp = () => {
    router.push('/signup');
  };

  return (
    <View style={styles.container}>
      {/*loading screen on successful login*/}
      {loading ? (
        <LottieView
          source={broom}
          autoPlay
          loop
          style={styles.fullScreenLottie}
        />
      ) : (
        <>
        {/* 🌟 FIX: 自定义 Modal 视图 (放在最顶层) */}
        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={closeCustomAlert} // Android / Web Back button handling
        >
            <View style={styles.centeredView}>
            <View style={styles.modalView}>
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <Text style={styles.modalText}>{modalMessage}</Text>
                <Pressable
                style={[styles.buttonModal, styles.buttonClose]} 
                onPress={closeCustomAlert}
                >
                <Text style={styles.textStyle}>OK</Text>
                </Pressable>
            </View>
            </View>
        </Modal>
        
        <Animated.View style={styles.stars} pointerEvents="none">
          {Array.from({ length: 50 }).map((_, index) => (
            <Animated.View 
              key={index} 
              style={{
                position: 'absolute',
                top: Math.random() * 800,
                left: Math.random() * 400,
                width: 2,
                height: 2,
                backgroundColor: 'white',
                borderRadius: 50,
                opacity: Math.random() * 0.8,
              }}
            />
          ))}
        </Animated.View>
          <View style={styles.logoContainer}>
            <Animated.Image entering={FadeInRight.delay(300).duration(2000)} source={logo} style={styles.logo} />
          </View>
  
          <Text style={styles.title}>Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="gray"  
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="gray"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
  
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleCleanerLogin}>
            <Text style={styles.buttonText}>Login as Cleaner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleAdminLogin}>
            <Text style={styles.buttonText}>Admin Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupButton} onPress={goToSignUp}>
            <Text style={styles.signupText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
  
          <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
  
          <TouchableOpacity style={styles.resendVerificationButton} onPress={handleResendVerification}>
            <Text style={styles.resendVerificationText}>Resend Verification Email</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  fullScreenLottie:{
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "5D3FD3",
  },
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20, 
    backgroundColor: '#5D3FD3',
    position: 'relative'
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#FFFFFF',
    marginBottom: 20 
  },
  input: { 
    width: '90%', 
    padding: 12, 
    marginVertical: 10, 
    borderWidth: 1, 
    borderRadius: 8,
    borderColor: '#B0A3F5',
    backgroundColor: '#372B7B',
    color: '#FFFFFF',
    fontSize: 16
  },
  button: { 
    backgroundColor: '#6A5ACD',
    padding: 15, 
    borderRadius: 8, 
    marginTop: 15,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#E94560',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 18 
  },
  logoContainer: { 
    alignItems: 'center', 
    padding: 10 
  },
  logo: { 
    width: 150, 
    height: 150, 
    resizeMode: 'contain', 
    marginBottom: 10 
  },
  signupButton: {
    marginTop: 20,
  },
  signupText: {
    color: '#B0A3F5',
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: 'underline',
  },
  forgotPasswordButton: {
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#B0A3F5',
    fontWeight: '600',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  resendVerificationButton: {
    marginTop: 10,
  },
  resendVerificationText: {
    color: '#F8C8DC',
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: 'underline',
  },
  // Starry Background Effect
  stars: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  // ================== Modal 样式 ==================
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 16,
    color: '#555',
  },
  buttonModal: {
    backgroundColor: '#6A5ACD', 
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
    width: 100,
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
});

export default LoginPage;