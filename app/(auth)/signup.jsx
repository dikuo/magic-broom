import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { auth, db } from "../firebaseConfig";  
import { doc, setDoc} from "firebase/firestore";

const SignUpScreen = () => {
  const router = useRouter();

  // State variables for form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // State for on-screen message feedback
  const [message, setMessage] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);

  // **Handle User Sign-Up & Email Verification**
  const handleSignUp = async () => {
    setMessage(''); // Clear previous message
    setIsLoading(true);

    // 1. Client-side input validation
    if (!fullName || !email || !password || !confirmPassword) {
      setMessage("Error: All fields are required.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Error: Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Creating user...");

      // 2. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Create Firestore user data
      await setDoc(doc(db, "users", user.uid), {
        fullName,
        email,
        profilePictureUrl: "",
        role: "user",
        status: "unverified",
        totalPoints: 0,
        totalRatings: 0,
        createdAt: new Date(),
      });

      // 4. Send email verification
      await sendEmailVerification(user);
      
      const successMsg = "Success! Verification email sent. Please check your inbox and spam folder.";
      setMessage(successMsg); // Display success message on screen

      // Attempt to show Alert (for native/web environments where it might work)
      Alert.alert("Registration Success", successMsg); 

      // 5. Sign out user
      await signOut(auth);

      // Delay navigation to ensure the user sees the success message
      setTimeout(() => {
        router.replace("(auth)");
      }, 3000); // Navigate after 3 seconds

    } catch (error) {
      console.error("Signup failed:", error);
      
      let errorMessage = "Signup failed, please try again later.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already in use.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak, must be at least 6 characters.";
      }
      
      setMessage(`Error: ${errorMessage}`); // Display error message on screen
      Alert.alert("Signup Error", errorMessage); // Attempt to show Alert

    } finally {
      setIsLoading(false);
    }
  };

  // Go Back Function
  const goBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Sign Up</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="gray"
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="gray"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password (min 6 chars)"
        placeholderTextColor="gray"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="gray"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      
      {/* Display message feedback */}
      {message ? (
        <Text style={message.startsWith("Error") ? styles.errorMessage : styles.successMessage}>
          {message}
        </Text>
      ) : null}


      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleSignUp}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Processing...' : 'Sign Up & Verify Email'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

// Styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  // Message Styles
  errorMessage: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  successMessage: {
    color: 'green',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  // Button Styles
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 15,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default SignUpScreen;