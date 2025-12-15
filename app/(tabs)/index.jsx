import "react-native-get-random-values";
import React, { useState, useRef } from "react";
import {
  View,
  ImageBackground,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import Animated,{FadeIn, FadeInLeft, FadeInRight, FadeOut } from 'react-native-reanimated';
import * as Haptics from "expo-haptics";
import logo from "@/assets/images/logo.png";
import bground from "@/assets/images/light-purple-glitter-background-nkx73.png"
import DateTimePicker from "@react-native-community/datetimepicker";
import "react-datepicker/dist/react-datepicker.css";


import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useRouter } from "expo-router";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Constants from 'expo-constants'; 

// Fetch the key safely from app.config.js's extra field
const GOOGLE_API_KEY = Constants.expoConfig.extra.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY; 

import axios from "axios";
import Feather from "react-native-vector-icons/Feather";

// For web date/time pickers
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const RequestCleaning = () => {
  const router = useRouter();

  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");

  // For showing success or error popups:
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const locationRef = useRef(null);

  const handleSubmit = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      console.log("Haptics skipped on Web.");
    }

    submitCleaningRequest();
  };

  // ----- CLEAR ALL FIELDS -----
  const clearForm = () => {
    setLocation("");
    setDate(new Date());
    setTime(new Date());
    setAdditionalNotes("");
    locationRef.current?.setAddressText("");
  };

  // ----- GET CURRENT LOCATION -----
  const getCurrentLocation = async () => {
    try {
      let latitude, longitude;

      if (Platform.OS === 'web') {
        // ** Web Fix: Use browser native Geolocation API directly **
        
        const pos = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported by this browser."));
          }
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;

      } else {
        // ** Native (iOS/Android) **
        // Location features are disabled on native platforms since expo-location was uninstalled.
        showError("Location features are currently disabled on mobile devices.");
        return;
      }

      if (latitude === undefined || longitude === undefined) {
        showError("Failed to get current location coordinates.");
        return;
      }

      // Use the coordinates to call Google Geocoding API
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
      );

      if (response.data.status === "OK") {
        const address = response.data.results[0].formatted_address;
        setLocation(address);
        locationRef.current?.setAddressText(address);
      } else {
        showError("Unable to fetch address from coordinates.");
      }
    } catch (error) {
      console.error("Failed to get location:", error);
      if (Platform.OS === 'web' && error.message && error.message.includes("Geolocation not supported")) {
          showError("Your browser does not support automatic location.");
      } else if (Platform.OS === 'web' && error.code === 1) {
          showError("You denied location access. Please grant permission in browser settings.");
      } else {
          showError("Failed to get current location. Please try again.");
      }
    }
  };


  // ----- SHOW ERROR POPUP -----
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorPopup(true);
  };

  // ----- CLOSE ERROR POPUP -----
  const closeErrorPopup = () => {
    setShowErrorPopup(false);
  };

  // ----- SUBMIT CLEANING REQUEST -----
  const submitCleaningRequest = async () => {
    const user = auth.currentUser;
    // 1) Check if user is logged in
    if (!user) {
      showError("You must be logged in to submit a request.");
      return;
    }
    
    // ** Ensure email is verified **
    if (!user.emailVerified) {
        showError("Please verify your email address before submitting a request.");
        return;
    }

    // 2) Check required fields
    if (!location || !date || !time) {
      showError("Please fill out all required fields.");
      return;
    }

    // 3) Validate date/time is in the future
    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(time.getHours());
    selectedDateTime.setMinutes(time.getMinutes());

    if (selectedDateTime <= new Date()) {
      showError("Invalid time: You cannot select a past date or time.");
      return;
    }

    // 4) Check user email
    let userEmail = user.email;
    if (!userEmail) {
        showError("User email not found in session. Please log in again.");
        return;
    }
    

    try {
      // 5) Build the request object
      const request = {
        userId: user.uid,
        userEmail,
        location,
        date: date.toISOString().split("T")[0],
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
        additionalNotes: additionalNotes || "No additional notes",
        status: "pending",
        timestamp: new Date(),
      };

      // 6) Store in Firestore
      await addDoc(collection(db, "cleaningRequests"), request);

      // 7) Show success popup
      setShowSuccessPopup(true);

    } catch (error) {
      console.error("Failed to submit request:", error);
      showError("Failed to submit request. Please try again.");
    }
  };

  // ----- CLOSE SUCCESS POPUP -----
  const closeSuccessPopup = () => {
    setShowSuccessPopup(false);
    clearForm();
  };

  const FIREBASE_FUNCTION_URL = process.env.EXPO_PUBLIC_MAPS_PROXY_URL;

  return (
    <>
      {/* On Web, ensure date/time pickers pop-up on top */}
      {Platform.OS === "web" && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .datePickerPopper {
                z-index: 9999999 !important;
              }
            `,
          }}
        />
      )}
      <ImageBackground source={bground} style={styles.background}>
      <ScrollView contentContainerStyle={styles.overlay} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Animated.Image entering={FadeInRight.delay(300).duration(2000)} source={logo} style={styles.logo} />
        </View>
        
        <View style={styles.formWrapper}>
          <Text style={styles.title}>Request a Cleaning Service</Text>

          {/* Location */}
          <View style={styles.section}>
            <Feather name="map-pin" size={22} color="#555" />
            <View style={styles.locationRow}>
              <GooglePlacesAutocomplete
                ref={locationRef}
                placeholder="Enter location"
                fetchDetails={true}
                enablePoweredByContainer={false}
                onPress={(data) => setLocation(data.description)}
                
                // **** 核心修复：解决 Web 端的 CORS 限制 ****
                currentLocation={false} 
                nearbyPlacesAPI='none' 
                requestUrl={{
                  useOnPlatform: 'web',
                  
                  url: FIREBASE_FUNCTION_URL,
                }}
                // ***************************************

                query={{
                  key: GOOGLE_API_KEY,
                  language: "en",
                }}
                styles={{
                  container: styles.autocompleteContainer,
                  textInput: styles.input,
                  listView: {
                    position: "absolute",
                    top: 55,
                    zIndex: 1001,
                    backgroundColor: "#fff",
                    elevation: 5,
                  },
                }}
              />
              <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
                <Text style={styles.pinEmoji}>📍</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View>
      {/* Date Picker */}
      <View style={styles.section}>
        <Feather name="calendar" size={22} color="#555" />
        {Platform.OS === "web" ? (
          <View style={styles.datePickerWrapper}>
            <DatePicker
              selected={date}
              onChange={(newDate) => setDate(newDate)}
              minDate={new Date()}
              dateFormat="MM/dd/yyyy"
              popperPlacement="top-start"
              popperClassName="datePickerPopper"
              popperProps={{ strategy: "fixed" }}
              portalId="root-portal"
              customInput={
                <TextInput
                  style={[styles.input, { width: "100%" }]}
                  value={date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                  onChange={() => {}}
                />
              }
            />
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
              <Text>
                {date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </>
        )}
      </View>

      {/* Time Picker */}
      <View style={styles.section}>
        <Feather name="clock" size={22} color="#555" />
        {Platform.OS === "web" ? (
          <View style={styles.datePickerWrapper}>
            <DatePicker
              selected={time}
              onChange={(newTime) => setTime(newTime)}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="hh:mm aa"
              popperPlacement="top-start"
              popperClassName="datePickerPopper"
              popperProps={{ strategy: "fixed" }}
              portalId="root-portal"
              customInput={
                <TextInput
                  style={[styles.input, { width: "100%" }]}
                  value={time.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                  onChange={() => {}}
                />
              }
            />
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
              <Text>
                {time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) setTime(selectedTime);
                }}
              />
            )}
          </>
        )}
      </View>
    </View>
    

          {/* Additional Notes */}
          <View style={styles.section}>
            <Feather name="file-text" size={22} color="#555" />
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Additional notes (optional)"
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              multiline
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>
              <Feather name="send" size={16} color="#fff" /> Submit Request
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </ImageBackground>
      {/* --- SUCCESS POPUP (Overlay) --- */}
      {showSuccessPopup && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <Feather name="check-circle" size={64} color="#28a745" style={{ marginBottom: 20 }} />
            <Text style={styles.popupTitle}>Success!</Text>
            <Text style={styles.popupMessage}>Your cleaning request has been submitted.</Text>
            <TouchableOpacity style={styles.popupButton} onPress={closeSuccessPopup}>
              <Text style={styles.popupButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* --- ERROR POPUP (Overlay) --- */}
      {showErrorPopup && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <Feather name="alert-triangle" size={64} color="#d9534f" style={{ marginBottom: 20 }} />
            <Text style={styles.popupTitle}>Error</Text>
            <Text style={styles.popupMessage}>{errorMessage}</Text>
            <TouchableOpacity style={styles.popupButton} onPress={closeErrorPopup}>
              <Text style={styles.popupButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
        
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)", // Light transparency over background
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingBottom:100,
  },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    resizeMode: "cover",
  },
  container: {
    flex: 1,
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { 
    width: 150, 
    height: 150, 
    resizeMode: 'contain',
    justifyContent: "center", 
    marginBottom: 10 
  },
  formWrapper: {
    width: "100%",
    maxWidth: 500,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
    width: "100%",
  },
  locationRow: {
    flex: 1,
    flexDirection: "row",
  },
  autocompleteContainer: {
    flex: 1,
    marginRight: 10,
  },
  locationButton: {
    backgroundColor: "#fceaea",
    padding: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    height: 45,
    width: 45,
    borderWidth: 2,
    borderColor: "#ff4d4d",
  },
  pinEmoji: {
    fontSize: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    fontSize: 16,
  },
  datePickerWrapper: {
    flex: 1,
  },

  // Nice button styling
  button: {
    marginTop: 20,
    backgroundColor: "#FF5722",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // For Android
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // --- Overlay styling (used by both success and error) ---
  popupOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupContainer: {
    width: 300,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  popupMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#555",
  },
  popupButton: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
  },
  popupButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default RequestCleaning;