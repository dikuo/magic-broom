import React, { useState, useEffect } from "react";
import { View, ImageBackground, Alert, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { collection, query, where, onSnapshot, getDoc, doc, runTransaction } from "firebase/firestore";
import { db, auth } from "../firebaseConfig"; // Ensure this path is correct
import bground from "@/assets/images/light-purple-glitter-background-nkx73.png"

const CleanerAcceptedOrdersScreen = () => {
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState({}); // Store emails for clicked requests

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch only the requests assigned to the logged-in cleaner
    const q = query(collection(db, "cleaningRequests"), where("cleanerId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedRequests = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAcceptedRequests(fetchedRequests);
    });

    return () => unsubscribe(); // Cleanup listener when component unmounts
  }, []);

  // Fetch the user's email when clicking on a request
  const fetchUserEmail = async (userId, requestId) => {
    if (selectedEmail[requestId]) {
      // If email is already loaded, hide it on click
      setSelectedEmail((prev) => ({ ...prev, [requestId]: null }));
      return;
    }

    try {
      const cleaningrequestRef = doc(db, "cleaningRequests", requestId);
      const requestSnap = await getDoc(cleaningrequestRef);

      if (requestSnap.exists()) {
        const email = requestSnap.data().userEmail;
        setSelectedEmail((prev) => ({ ...prev, [requestId]: email })); // Store email
      } else {
        setSelectedEmail((prev) => ({ ...prev, [requestId]: "Email not found" }));
      }
    } catch (error) {
      console.error("Error fetching user email:", error);
      setSelectedEmail((prev) => ({ ...prev, [requestId]: "Error fetching email" }));
    }
  };

  // Mark order as completed
  const markAsCompleted = async (requestId) => {
    try {
      const requestRef = doc(db, "cleaningRequests", requestId);
      
      // Use transaction to ensure atomic status update with concurrency control
      await runTransaction(db, async (transaction) => {
        // Get the current request document within the transaction
        const requestSnap = await transaction.get(requestRef);
        
        if (!requestSnap.exists()) {
          throw new Error("Request does not exist.");
        }
        
        const requestData = requestSnap.data();
        
        // Verify the current status is 'accepted' before updating to 'Completed'
        if (requestData.status !== "accepted") {
          throw new Error(`Cannot complete request. Current status is: ${requestData.status}. Expected status: accepted`);
        }
        
        // Update the status to 'Completed' within the transaction
        transaction.update(requestRef, { status: "Completed" });
      });

      Alert.alert("Success", "Order marked as completed!");
    } catch (error) {
      console.error("Error updating request status:", error);
      Alert.alert("Error", error.message || "Failed to mark order as completed.");
    }
  };

  return (
    <ImageBackground source={bground} style={styles.background} resizeMode="cover">  
    <View style={styles.container}>
      <Text style={styles.title}>Your Accepted Cleaning Requests</Text>
      <FlatList
  data={acceptedRequests}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <View style={styles.requestItem}>
      <Text style={styles.text}>📍 Location: {item.location}</Text>
      <Text style={styles.text}>📅 Date: {item.date}</Text>
      <Text style={styles.text}>⏰ Time: {item.time}</Text>
      <Text style={styles.text}>📝 Notes: {item.additionalNotes}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>

      {/* Button to Show User Email */}
      <TouchableOpacity
        style={styles.showEmailButton}
        onPress={() => fetchUserEmail(item.userId, item.id)}
      >
        <Text style={styles.showEmailText}>
          {selectedEmail[item.id] ? "Hide Email" : "Contact Client"}
        </Text>
      </TouchableOpacity>

      {/* Display Email when Clicked */}
      {selectedEmail[item.id] && (
        <Text style={styles.emailText}>📧 {selectedEmail[item.id]}</Text>
      )}
      {/* Button to Mark as Completed */}
      {item.status !== "Completed" && (
        <TouchableOpacity style={styles.completeButton} onPress={() => markAsCompleted(item.id)}>
        <Text style={styles.completeButtonText}>Mark as Completed</Text>
        </TouchableOpacity>
            )}
    </View>
  )}
  ListEmptyComponent={<Text style={styles.noRequests}>No accepted requests yet.</Text>}
  contentContainerStyle={{ paddingBottom: 20 }} //  Fixes bottom cut-off issue
  showsVerticalScrollIndicator={false} // Hides default scroll indicator
/>

    </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingBottom:100,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  requestItem: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    fontWeight: "bold",
    color: "green",
  },
  noRequests: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "gray",
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
  completeButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "green",
    alignItems: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default CleanerAcceptedOrdersScreen;