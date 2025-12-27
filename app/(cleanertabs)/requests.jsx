import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet,ImageBackground } from "react-native";
import { collection, getDocs, doc, getDoc, runTransaction } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import bground from "@/assets/images/light-purple-glitter-background-nkx73.png"


const AvailableRequestsScreen = () => {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  // Fetch all pending cleaning requests from Firestore
  const fetchRequests = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "cleaningRequests"));
      const fetchedRequests = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((request) => request.status === "pending"); // Only show unassigned requests
      setRequests(fetchedRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  // Function to accept a cleaning task
  const handleAcceptRequest = async (requestId) => {
    const user = auth.currentUser;
    const cleanerEmail = user.email; // Get email from Firebase Auth

  
    if (!user) {
      alert("You must be logged in to accept a request.");
      return;
    }
  
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
  
        // Prevent user from accepting their own request
        if (user.uid === requestData.userId) {
          throw new Error("You cannot accept your own request.");
        }

        // Verify the current status is exactly 'pending' before updating
        if (requestData.status !== "pending") {
          if (requestData.status === "accepted") {
            throw new Error("Job already claimed");
          }
          throw new Error("This request has already been accepted.");
        }
  
        // Update the request status and assign the cleaner within the transaction
        transaction.update(requestRef, {
          status: "accepted",
          cleanerId: user.uid,
          cleanerEmail: cleanerEmail, // Store cleaner's email
        });
      });

      // Remove the accepted request from the UI
      setRequests((prevRequests) => prevRequests.filter((req) => req.id !== requestId));

  
      alert("Request successfully assigned to you!");
    } catch (error) {
      console.error("Error updating request:", error);
      // Show specific error message if it's the "Job already claimed" error
      if (error.message === "Job already claimed") {
        alert("Job already claimed");
      } else {
        alert(`Error: ${error.message || "You don't have permission to accept this request."}`);
      }
    }
  };

  return (
    <ImageBackground source={bground} style={styles.background} resizeMode="cover">
    
    <View style={styles.container}>
      <Text style={styles.title}>Available Cleaning Requests</Text>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.requestItem}>
            <Text style={styles.text}>📍 Location: {item.location}</Text>
            <Text style={styles.text}>📅 Date: {item.date}</Text>
            <Text style={styles.text}>⏰ Time: {item.time}</Text>
            <Text style={styles.text}>📝 Notes: {item.additionalNotes}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>

            {item.status === "pending" && (
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptRequest(item.id)}
              >
                <Text style={styles.buttonText}>Accept Request</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.noRequests}>No available requests</Text>} // Handles empty state properly
        contentContainerStyle={{ flexGrow: 1 }} // Prevents height issues
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
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    padding: 20,
    paddingBottom:100,
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  requestItem: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: "#f8f8f8",
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    fontWeight: "bold",
    color: "blue",
  },
  acceptButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  noRequests: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "gray",
  },
});

export default AvailableRequestsScreen;
