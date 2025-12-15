import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ImageBackground,
} from "react-native";
import bground from "@/assets/images/light-purple-glitter-background-nkx73.png"
import { useRouter } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { AntDesign } from "@expo/vector-icons"; 
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";


const ColorList = "#BF40BF";

const Plan = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [selectedRequest, setSelectedRequest] = useState(null); 
  const [selectedEmail, setSelectedEmail] = useState({}); 
  const [rating, setRating] = useState(0); 
  const [isRatingModalVisible, setRatingModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDate, setNewDate] = useState(new Date()); 
  const [showDatePicker, setShowDatePicker] = useState(false);


  const fetchRequests = async (userId, isRefreshing = false) => {
    if (!userId) return;
    try {
      if (!isRefreshing) setLoading(true);
      const q = query(collection(db, "cleaningRequests"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const userRequests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(userRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchRequests(user.uid);
      } else {
        setUser(null);
        setRequests([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);


  const handleRating = async (cleanerId, rating) => {
    if (!cleanerId) {
      console.error("Error: cleanerId is undefined");
      Alert.alert("Error", "Cleaner ID is missing.");
      return;
    }
  
    try {
      const cleanerRef = doc(db, "users", cleanerId); 
      const docSnap = await getDoc(cleanerRef);
      if (!docSnap.exists()) {
        console.error("Error: Cleaner document does not exist.");
        Alert.alert("Error", "Cleaner profile not found.");
        return;
      }

      const updatedData = docSnap.data();
      const currentTotalPoints = updatedData.totalPoints || 0;
      const currentTotalRatings = updatedData.totalRatings || 0;

      const newTotalPoints = currentTotalPoints + rating;
      const newTotalRatings = currentTotalRatings + 1;
      const newAverage = newTotalRatings > 0 ? newTotalPoints / newTotalRatings : 0;

      await updateDoc(cleanerRef, {
        totalPoints: increment(rating),  
        totalRatings: increment(1),      
        average: newAverage, 
      });
  
      Alert.alert("Success", "Rating updated for cleaner!");
    } catch (error) {
      console.error("Error updating cleaner's rating:", error.message);
      Alert.alert("Error", "Failed to update rating.");
    }
  };

  const handleRefresh = async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      await fetchRequests(user.uid);
    } catch (error) {
      console.error("Error refreshing requests:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const openRatingModal = (request) => {
    console.log("Opening rating modal for request:", request);
    setSelectedRequest(request);
    setRating(request.rating || 0);
    setRatingModalVisible(true);
  };

  const openEditModal = (request) => {
    console.log("Opening edit modal for request:", request);
    setSelectedRequest(request);
    setNewLocation(request.location || ""); 
    setNewTime(request.time || ""); 
    setNewDate(request.date ? new Date(request.date) : new Date()); 

    setEditModalVisible(true);
  };

  const submitRating = async () => {
    if (!selectedRequest || isSubmitting) return; 

    setIsSubmitting(true); 

    try {
      const requestRef = doc(db, "cleaningRequests", selectedRequest.id);
      await updateDoc(requestRef, { rating });

      Alert.alert("Thank You!", "Your rating has been submitted.");
      setRequests(prev => prev.map(req => (req.id === selectedRequest.id ? { ...req, rating } : req)));
      setRatingModalVisible(false);
    } catch (error) {
      console.error("Error updating rating:", error);
      Alert.alert("Error", "Failed to submit rating.");
    }finally {
      setIsSubmitting(false); 
    }
  };

  const renderStars = (rating, onPress) => {
    return (
      <View style={{ flexDirection: "row" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onPress && handleRating(selectedRequest.cleanerId, star) && setRating(star)}> 
            <AntDesign
              name={star <= rating ? "star" : "staro"} 
              size={30}
              color="#FFD700" 
              style={{ marginHorizontal: 3 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const fetchCleanerEmail = async (requestId) => {
    try {
      const userRef = doc(db, "cleaningRequests", requestId);
      const requestSnap = await getDoc(userRef);  
      if (requestSnap.exists()) {
        const requestData = requestSnap.data();
        const cleanerId = requestData.cleanerId;

        if (!cleanerId) {
          Alert.alert("No Cleaner Assigned", "This request has not been accepted by a cleaner yet.");
          return;
        }
        
        const cleanerRef = doc(db, "users", cleanerId);
        const cleanerSnap = await getDoc(cleanerRef);

        if (cleanerSnap.exists()) {
          const cleanerEmail = cleanerSnap.data().email;

          setSelectedEmail((prev) => ({
            ...prev,
            [requestId]: prev[requestId] ? null : cleanerEmail,
          }));
        }else {
          Alert.alert("Error", "Cleaner information not found.");
        }
      } else {
        Alert.alert("Error", "Request not found.");
      }
    } catch (error) {
      console.error("Error fetching user email:", error);
      setSelectedEmail((prev) => ({ ...prev, [requestId]: "Error fetching email" }));
    }
  };


  const editRequest = async () => {
    if (!selectedRequest) return;

    // 1. Validate Time Format (HH:MM AM/PM)
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i; 
    
    if (!timeRegex.test(newTime)) {
      Alert.alert(
        "Invalid Time Format",
        "Please enter a valid time in HH:MM AM/PM format (e.g., 9:00 AM or 03:30 pm)."
      );
      return;
    }

    let dateToUpdate;
    let formattedDateForState;

    if (Platform.OS === "web") {
      // 2a. Web: newDate is a YYYY-MM-DD string from the input
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(newDate)) {
        Alert.alert("Invalid Date", "Please enter a valid date in YYYY-MM-DD format.");
        return;
      }
      dateToUpdate = newDate; 
      formattedDateForState = newDate;
    } else {
      // 2b. Mobile: newDate is a Date object from DateTimePicker
      if (!(newDate instanceof Date)) {
         Alert.alert("Date Error", "Invalid date object on mobile platform.");
         return;
      }
      // Convert Date object to YYYY-MM-DD string for storage
      dateToUpdate = newDate.toISOString().split("T")[0];
      formattedDateForState = dateToUpdate;
    }


    try {
      const requestRef = doc(db, "cleaningRequests", selectedRequest.id);
      
      await updateDoc(requestRef, { 
        location: newLocation, 
        time: newTime,
        date: dateToUpdate 
      });

      Alert.alert("Updated!", "The request has been successfully updated.");

      setRequests(prev =>
        prev.map(req => (req.id === selectedRequest.id ? { 
          ...req, 
          location: newLocation, 
          time: newTime, 
          date: formattedDateForState 
        } : req))
      );

      setEditModalVisible(false); 
    } catch (error) {
      console.error("Error updating request:", error);
      const errorMessage = error.message.includes("permission denied") 
        ? "Permission Denied. Check your Firestore Rules." 
        : `Failed to update request. Error: ${error.message}`;
        
      Alert.alert("Update Failed", errorMessage);
    }
  };


  const deleteRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, "cleaningRequests", requestId));
      
      Alert.alert("Deleted", "Your request has been removed.");
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Error deleting request:", error);
      
      const errorMessage = error.message.includes("permission denied") 
        ? "Permission Denied. You might not have the rights to delete this." 
        : "Failed to delete request due to a network or server issue.";
      
      Alert.alert("Deletion Failed", errorMessage); 
    }
  };

  const renderRequest = ({ item }) => (
    <View style={[styles.requestCard, { borderColor: ColorList }]}>
      <Text style={[styles.serviceType, { color: ColorList }]}>{item.location}</Text>
      <Text style={styles.details}>📅 Date: {item.date}</Text>
      <Text style={styles.details}>🕒 Time: {item.time}</Text>
      <Text style={styles.details}>📝 Notes: {item.additionalNotes || "N/A"}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>

      <TouchableOpacity
        style={styles.showEmailButton}
        onPress={() => fetchCleanerEmail(item.id)}
      >
        <Text style={styles.showEmailText}>
          {selectedEmail[item.id] ? "Hide Email" : "Contact Cleaner"}
        </Text>
      </TouchableOpacity>
    
      
      {selectedEmail[item.id] && (
        <Text style={styles.emailText}>📧 {selectedEmail[item.id]}</Text>
      )}
      

      
      {item.status === "Completed" && (
        <View>
          <Text style={styles.ratingLabel}>Rating:</Text>
          {renderStars(item.rating || 0)}
        </View>
      )}


      
      {item.status === "Completed" && (
        <TouchableOpacity 
        style={[
          styles.rateButton, 
          item.rating ? { backgroundColor: "#ccc" } : {}, 
          isSubmitting ? { backgroundColor: "#ccc" } : {} 
        ]}
        onPress={() => !item.rating && !isSubmitting && openRatingModal(item)} 
        disabled={Boolean(item.rating) || isSubmitting} 
      >
        <Text style={styles.buttonText}>
          {item.rating ? "Rated" : "Rate Task"}
        </Text>
      </TouchableOpacity>
      )}


      {item.status != "Completed" && (
        <TouchableOpacity style={[styles.editButton,{ backgroundColor: ColorList }]} onPress={() => openEditModal(item)}>
        <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
      )}


      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRequest(item.id)}>
      <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>
      
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={ColorList} />
      </View>
    );
  }

  return (
    <ImageBackground source={bground} style={styles.background}>
    <View style={styles.container}>
      <Text style={[styles.header, { color: "#000000" }]}>Your Cleaning Requests</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <AntDesign name="reload1" size={24} color="white" />
            <Text style={[styles.buttonText, { color: "white" }]}>Click Here to Refresh </Text>
          </TouchableOpacity>
      {requests.length === 0 ? (
        <Text style={styles.noRequests}>No requests found.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          style={{flex:1}}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
        
      )}
      
      {/* Rating Modal */}
      <Modal visible={isRatingModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate the Cleaning Task</Text>
            {renderStars(rating, true)}

            <TouchableOpacity style={[styles.submitButton, isSubmitting && { backgroundColor: "#ccc" }]} onPress={submitRating} disabled={isSubmitting}>
              <Text style={styles.buttonText}> {isSubmitting ? "Submitting..." : "Submit Rating"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Edit Request</Text>
      
          <TextInput
            style={styles.input}
            value={newLocation}
            onChangeText={setNewLocation}
            placeholder="Enter new location"
          />

          <TextInput
            style={styles.input}
            value={newTime}
            onChangeText={setNewTime}
            placeholder="Enter new time (HH:MM AM/PM)"
          />
          <Text style={styles.label}>Select Date:</Text>

          {/* Use TouchableOpacity for mobile, TextInput for web */}
          {Platform.OS === "web" ? (
            <input
            type="date"
            style={styles.input}
            value={newDate}
            onChange={(event) => setNewDate(event.target.value)} 
        />
      ) : (
        <>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
            <Text style={styles.dateText}>{newDate.toDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={newDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setNewDate(selectedDate);
              }}
          />
        )}
      </>
      )}

          <TouchableOpacity style={styles.submitButton} onPress={editRequest}>
            <Text style={styles.buttonText}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setEditModalVisible(false)}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    
    
    </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
  },
  container: { flex: 1, padding: 20, backgroundColor: "transparent" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  noRequests: { textAlign: "center", fontSize: 16, color: "#555", marginTop: 20 },
  requestCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 2,
    elevation: 3,
  },
  serviceType: { fontSize: 18, fontWeight: "bold" },
  details: { fontSize: 14, color: "#555", marginTop: 5 },
  status: { fontSize: 14, fontWeight: "bold", marginTop: 10, color: "#28A745" },
  editButton: {
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 5,
  },
  buttonText: { color: "#fff", fontSize: 16 },
  ratingLabel: { fontSize: 16, fontWeight: "bold", marginTop: 10 },
  rateButton: { backgroundColor: "#FFA500", paddingVertical: 10, borderRadius: 5, alignItems: "center", marginTop: 10 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 10, alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  submitButton: { backgroundColor: "#007BFF", padding: 10, borderRadius: 5, marginTop: 15 },
  cancelButton: { color: "#FF3B30", fontSize: 16, marginTop: 10 },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  
  datePickerButton: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  refreshButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor:"black",
  },
  showEmailButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    backgroundColor: "#007BFF",
    alignItems: "center",
  },
  showEmailText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  emailText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
});

export default Plan;