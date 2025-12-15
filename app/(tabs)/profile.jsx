import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  Alert,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from "expo-file-system";  
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from "firebase/firestore";  
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../firebaseConfig"; 




const Profile = () => {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setUploading] = useState(false); 
  const [applicationStatus, setApplicationStatus] = useState(null); 

  // **Subscribe to Real-Time User Data & Auto-Create Profile**
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        let unsubscribeFirestore;

        // 1. Check/Create User Profile Document
        getDoc(userRef)
          .then(async (docSnapshot) => {
            if (!docSnapshot.exists()) {
              // Document missing: Auto-create base profile
              console.warn("User profile missing in Firestore. Creating base document...");
              await setDoc(userRef, {
                userId: user.uid,
                email: user.email,
                fullName: user.displayName || "New User",
                createdAt: new Date(),
              }, { merge: true }); 

              setError(null); 
            }
          })
          .catch((err) => {
            console.error("Error checking user profile existence:", err);
            setError("Failed to check profile existence.");
            setLoading(false);
            return; 
          });

        // 2. Real-time listener for user profile (includes error callback)
        unsubscribeFirestore = onSnapshot(userRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            setUserInfo(docSnapshot.data());
            setError(null); 
          } else {
            setError("User profile data could not be loaded.");
          }
          setLoading(false);
        }, (firestoreError) => { 
          // Catch permission/network errors from subscription
          console.error("Firestore subscription failed (Permission or Network):", firestoreError);
          setError("Failed to load profile data. Check permissions or network.");
          setLoading(false);
        });

        // 3. Check cleaner application status
        const applicationRef = doc(db, "cleanerApplications", user.uid);
        getDoc(applicationRef).then((docSnapshot) => {
          if (docSnapshot.exists()) {
            setApplicationStatus(docSnapshot.data().status); 
          } else {
            setApplicationStatus(null);
          }
        }).catch(err => {
            console.error("Failed to fetch application status:", err);
            // Non-critical error, do not block loading
        });

        return () => {
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
            }
        };
      } else {
        setError("User not logged in.");
        setUserInfo(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);
  
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow access to photos to upload a profile picture.');
        return;
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
  
      if (result.canceled || !result.assets?.length) {
        console.log("Image selection canceled.");
        return;
      }
  
      setUploading(true); 
      await uploadProfilePicture(result.assets[0].uri);
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "An error occurred while selecting the image.");
      setUploading(false);
    }
  };
  
  const uploadProfilePicture = async (uri) => {
    try {
      if (!uri) throw new Error("No image selected");
  
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");
  
      let localUri = uri;
  
      if (!uri.startsWith("file://")) {
        console.log("Downloading image from cloud...");
        const downloadedFile = await FileSystem.downloadAsync(uri, FileSystem.documentDirectory + "tempImage.jpg");
        localUri = downloadedFile.uri;
      }
  
      const response = await fetch(localUri);
      const blob = await response.blob();
  
      const filename = `profilePictures/${user.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      const uploadTask = uploadBytesResumable(storageRef, blob);
  
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          console.error("Upload error:", error);
          Alert.alert("Upload Error", "Failed to upload profile picture.");
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File available at", downloadURL);
  
          // Update Firestore with new profile picture URL
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, { profilePictureUrl: downloadURL }); 

          // Update UI
          setUserInfo(prev => ({ ...prev, profilePictureUrl: downloadURL }));

          Alert.alert("Success", "Profile picture updated!");
        }
      );
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      Alert.alert("Upload Error", "An error occurred while uploading the picture.");
      setUploading(false);
    }
  };

  // **Apply to Become a Cleaner**
  const applyToBeCleaner = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to apply.");
        return;
      }

      const applicationRef = doc(db, "cleanerApplications", user.uid);
      const docSnapshot = await getDoc(applicationRef);

      if (docSnapshot.exists()) {
        Alert.alert("Application Pending", "Your application is under reviewed.");
        return;
      }

      // Submit new application
      await setDoc(applicationRef, {
        userId: user.uid,
        email: user.email,
        fullName: userInfo?.fullName || user.displayName || "N/A",
        profilePictureUrl: userInfo?.profilePictureUrl || user.photoURL || "",
        status: "pending",
        appliedAt: new Date(),
      });

      setApplicationStatus("pending");

      Alert.alert("Success", "Your application has been submitted for review.");
    } catch (error) {
      console.error("Error applying to be a cleaner:", error);
      Alert.alert("Error", "An error occurred while submitting your application.");
    }
  };

  // **Sign Out**
  const handleSignOut = async () => {
    try {
      await auth.signOut(); // Use Firebase signOut for cleaner session termination
      await AsyncStorage.clear();
      router.replace('/(auth)');
    } catch (err) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // **Loading State**
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    )
  };

  // **Error State**
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    
    <View style={styles.container}>
      <Text style={styles.header}>Profile Info</Text>

      {/* Profile Picture */}
      <TouchableOpacity onPress={pickImage}>
        {userInfo?.profilePictureUrl ? (
          <Image source={{ uri: userInfo.profilePictureUrl }} style={styles.profilePicture} />
        ) : (
          <View style={[styles.profilePicture, styles.placeholder]}>
            <Text style={styles.placeholderText}>Add Picture</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.infoLabel}>Name:</Text>
      <Text style={styles.infoValue}>{userInfo?.fullName || "N/A"}</Text>

      <Text style={styles.infoLabel}>Email:</Text>
      <Text style={styles.infoValue}>{userInfo?.email || "N/A"}</Text>

      {/* Display Application Status */}
      {applicationStatus === "pending" ? (
        <Text style={styles.pendingText}>Your cleaner application is under review.</Text>
      ) : applicationStatus === "Approved" ? (
        <Text style={styles.pendingText}>✅ You can sign in as Cleaner Now!</Text>
      ) : (
        <TouchableOpacity style={styles.cleanerButton} onPress={applyToBeCleaner}>
            <Text style={styles.cleanerButtonText}>Apply to be a Cleaner</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>

    </View>
         
    
  );
};

// **Styles**
  const styles = StyleSheet.create({
  
  container: { flex: 1, padding: 20, backgroundColor: "rgba(255, 255, 255, 0.3)", alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  infoLabel: { fontSize: 18, fontWeight: 'bold', color: '#555' },
  infoValue: { fontSize: 18, color: '#333', marginBottom: 10 },
  profilePicture: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#ddd', marginBottom: 20 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 16, color: '#555' },
  pendingText: { fontSize: 16, color: '#FFA500', marginTop: 10, textAlign: "center", fontWeight: "bold" },
  cleanerButton: { backgroundColor: '#28A745', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, marginTop: 20 },
  cleanerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  signOutButton: { marginTop: 20, backgroundColor: '#FF3B30', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  signOutButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  errorText: { color: 'red', fontSize: 16, marginBottom: 20 },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    resizeMode: "cover",
  },
});

export default Profile;