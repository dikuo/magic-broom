import React, { useEffect, useState, useCallback } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { collection, getDocs, updateDoc, doc, getDoc } from "firebase/firestore"; 
import { getAuth, signOut } from "firebase/auth"; 
import { db } from "../firebaseConfig"; 
import { useNavigation } from "expo-router"; 

const CleanerManage = () => { 
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const auth = getAuth();
  const navigation = useNavigation(); 

  const fetchApplications = useCallback(async () => {
    setRefreshing(true); 
    setLoading(true);

    try {
      console.log("--- Starting Firestore Fetch for cleanerApplications ---");
      const applicationSnapshot = await getDocs(collection(db, "cleanerApplications"));
      
      const apps = await Promise.all(applicationSnapshot.docs.map(async (docData) => {
        const data = docData.data();
        const userId = data.userId;
        
        
        let currentRole = 'user';
        if (userId) {
            const userDocRef = doc(db, "users", userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                currentRole = userDoc.data().role || 'user';
            }
        }

        return {
            id: docData.id,
            fullName: data.fullName || 'N/A', 
            email: data.email || 'N/A',
            userId: userId,
            status: data.status || 'pending',
            role: currentRole, 
            phone: data.phone || 'Not Provided', 
            experience: data.experience || '0', 
            ...data,
        };
      }));

      console.log(`✅ Fetch successful. Documents found: ${apps.length}`);
      setApplications(apps);
    } catch (error) {
      console.error("❌ Error fetching cleaner applications:", error);
      Alert.alert("Error", "Failed to load applications. Check Firestore rules and network.");
    } finally {
      setLoading(false);
      setRefreshing(false); 
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      Alert.alert("Success", "Signed out successfully!");
      navigation.replace("(auth)/index"); 
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out.");
    }
  };

  // =========================================================================
  // Status Update Logic (Approved/Rejected)
  // =========================================================================
  const updateApplicationStatus = async (id, newStatus, userId) => {
    try {
      console.log(`Attempting to update application ${id} to status: ${newStatus}`);
      
      await updateDoc(doc(db, "cleanerApplications", id), { status: newStatus });
      
      let newRole = '';

      // 2. If approved, update user's role to "cleaner"
      if (newStatus === "Approved") {
        newRole = 'cleaner'; 
        console.log(`Attempting to update user ${userId} role to cleaner.`);
        await updateDoc(doc(db, "users", userId), { role: newRole });
        console.log(`INFO: User role update successful.`);
      }

      
      Alert.alert("Success", `Application status updated to ${newStatus}`);
      
      // OPTIMISTIC UPDATE: Update local state to reflect both status AND role
      setApplications((prev) =>
        prev.map((app) => 
          app.id === id 
            ? { 
                ...app, 
                status: newStatus, 
                
                ...(newRole && { role: newRole }) 
              } 
            : app
        )
      );
      
    } catch (error) {
      console.error("❌ ERROR during Application Status Update:", error);
      let errorMessage = `Update failed: ${error.message || 'Check Firestore Write Rules.'}`;
      Alert.alert("Update Error", errorMessage);
    }
  };

  // =========================================================================
  // Manual Role Update Logic
  // =========================================================================
  const updateUserRole = async (userId, newRole) => {
    try {
      console.log(`Attempting manual role update for user ${userId} to: ${newRole}`);
      await updateDoc(doc(db, "users", userId), { role: newRole });
      
      console.log(`INFO: Manual role update successful.`);
      
      Alert.alert("Success", `User role manually updated to ${newRole}`);

      // OPTIMISTIC UPDATE: Find the application card and update its local role state
      setApplications((prev) =>
        prev.map((app) => 
          app.userId === userId 
            ? { ...app, role: newRole } 
            : app
        )
      );

    } catch (error) {
      console.error("❌ ERROR during Manual Role Update:", error);
      let errorMessage = `Manual Update failed: ${error.message || 'Check Firestore Write Rules.'}`;
      Alert.alert("Manual Update Error", errorMessage);
    }
  };
  
  if (loading && applications.length === 0) {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4B0082" />
            <Text style={{ marginTop: 10 }}>Loading Applications...</Text>
        </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Cleaner Applications ({applications.length})</Text>
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      
      {applications.length === 0 ? (
        <Text style={styles.noApplicationsText}>
            {loading ? "Checking for applications..." : "No pending applications found."}
        </Text>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={fetchApplications} 
                colors={['#4B0082']} 
            />
          }
          renderItem={({ item }) => (
            <View style={styles.applicationCard}>
              <Text style={styles.fullNameText}>{item.fullName}</Text>
              <Text style={styles.detailText}>Email: {item.email}</Text>
              <Text style={styles.detailText}>Phone: {item.phone}</Text>
              <Text style={styles.detailText}>Experience: {item.experience} years</Text>
              
              {/* 新增 FIX：显示 Current Role 状态 */}
              <Text style={styles.detailText}>
                Current Role: <Text style={{ fontWeight: 'bold', color: item.role === 'cleaner' ? '#28A745' : '#6c757d' }}>
                    {item.role || 'user'}
                </Text>
              </Text>

              <Text style={[styles.statusText, { 
                color: item.status === 'Approved' ? 'green' : item.status === 'Rejected' ? 'red' : 'orange' 
              }]}>
                Application Status: {item.status || "Pending"}
              </Text>

              {/* Approve / Reject Buttons */}
              <View style={styles.buttonRow}>
                {item.status !== "Approved" && (
                  <TouchableOpacity
                    onPress={() => updateApplicationStatus(item.id, "Approved", item.userId)}
                    style={[styles.actionButton, styles.approveButton]}
                  >
                    <Text style={styles.buttonText}>Approve</Text>
                  </TouchableOpacity>
                )}

                {item.status !== "Rejected" && (
                  <TouchableOpacity
                    onPress={() => updateApplicationStatus(item.id, "Rejected", item.userId)}
                    style={[styles.actionButton, styles.rejectButton]}
                  >
                    <Text style={styles.buttonText}>Reject</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Change User Role Buttons (Manual Override) */}
              <Text style={styles.roleHeader}>Manual Role Override:</Text>

              <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => updateUserRole(item.userId, "cleaner")}
                    style={[styles.actionButton, styles.setCleanerButton]}
                  >
                    <Text style={styles.buttonText}>Set as Cleaner</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => updateUserRole(item.userId, "user")}
                    style={[styles.actionButton, styles.setUserButton]}
                  >
                    <Text style={styles.buttonText}>Set as User</Text>
                  </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    container: { 
        flex: 1, 
        paddingHorizontal: 15, 
        paddingTop: 10,
        backgroundColor: '#fff',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    headerTitle: { 
        fontSize: 22, 
        fontWeight: "bold",
        color: '#333',
    },
    signOutButton: {
        backgroundColor: "#FF3B30",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
    },
    signOutButtonText: { 
        color: "white", 
        textAlign: "center", 
        fontWeight: "bold" 
    },
    listContent: { 
        paddingBottom: 50 
    },
    applicationCard: {
        padding: 15,
        marginVertical: 8,
        backgroundColor: "#f9f9f9",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    fullNameText: { 
        fontSize: 18, 
        fontWeight: "bold",
        marginBottom: 5,
        color: '#4B0082',
    },
    detailText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 2,
    },
    statusText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 5,
        marginBottom: 10,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        gap: 10,
    },
    roleHeader: {
        marginTop: 15,
        marginBottom: 5,
        fontWeight: 'bold',
        fontSize: 14,
        color: '#333',
    },
    actionButton: {
        flex: 1,
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    buttonText: { 
        color: "white", 
        textAlign: "center",
        fontWeight: '600',
        fontSize: 14,
    },
    approveButton: {
        backgroundColor: "#28A745",
    },
    rejectButton: {
        backgroundColor: "#FF3B30",
    },
    setCleanerButton: {
        backgroundColor: "#FFA500", // Orange
    },
    setUserButton: {
        backgroundColor: "#6c757d", // Grey
    },
    noApplicationsText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#777',
    }
});

export default CleanerManage;