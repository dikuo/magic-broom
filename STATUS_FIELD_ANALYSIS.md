# Status Field Analysis - Firebase Documents

This document provides a comprehensive analysis of all `status` field values used in Firebase Firestore documents and where they are updated in the codebase.

## Summary of Status Values by Collection

### 1. `users` Collection
**Status Field:** `status`
- **"unverified"** - Set when a new user signs up (email not yet verified)

### 2. `cleanerApplications` Collection
**Status Field:** `status`
- **"pending"** - Initial status when a cleaner application is submitted
- **"Approved"** - Set by admin when application is approved
- **"Rejected"** - Set by admin when application is rejected

### 3. `cleaningRequests` Collection
**Status Field:** `status`
- **"pending"** - Initial status when a cleaning request is created
- **"accepted"** - Set when a cleaner accepts the request
- **"Completed"** - Set when a cleaner marks the order as completed

---

## Detailed Status Update Locations

### Users Collection - Status Updates

#### 1. Setting "unverified" Status
**File:** `app/(auth)/signup.jsx`
**Line:** 63
**Function:** `handleSignUp()`
**Code:**
```javascript
await setDoc(doc(db, "users", user.uid), {
  fullName,
  email,
  profilePictureUrl: "",
  role: "user",
  status: "unverified",  // ← Status set here
  totalPoints: 0,
  totalRatings: 0,
  createdAt: new Date(),
});
```
**Context:** When a new user signs up, their status is set to "unverified" until they verify their email.

---

### CleanerApplications Collection - Status Updates

#### 2. Setting "pending" Status (User Profile)
**File:** `app/(tabs)/profile.jsx`
**Line:** 212
**Function:** `applyToBeCleaner()`
**Code:**
```javascript
await setDoc(applicationRef, {
  userId: user.uid,
  email: user.email,
  fullName: userInfo?.fullName || user.displayName || "N/A",
  profilePictureUrl: userInfo?.profilePictureUrl || user.photoURL || "",
  status: "pending",  // ← Status set here
  appliedAt: new Date(),
});
```
**Context:** When a regular user applies to become a cleaner from their profile page.

#### 3. Setting "pending" Status (Cleaner Profile)
**File:** `app/(cleanertabs)/profile.jsx`
**Line:** 178
**Function:** `applyToBeCleaner()`
**Code:**
```javascript
await setDoc(applicationRef, {
  userId: user.uid,
  email: user.email,
  fullName: userInfo?.fullName || "N/A",
  profilePictureUrl: userInfo?.profilePictureUrl || "",
  status: "pending",  // ← Status set here
  appliedAt: new Date(),
});
```
**Context:** When a cleaner applies (duplicate functionality in cleaner profile).

#### 4. Updating to "Approved" or "Rejected" Status
**File:** `app/(admintabs)/CleanerManage.jsx`
**Line:** 88-126
**Function:** `updateApplicationStatus(id, newStatus, userId)`
**Code:**
```javascript
const updateApplicationStatus = async (id, newStatus, userId) => {
  try {
    console.log(`Attempting to update application ${id} to status: ${newStatus}`);
    
    await updateDoc(doc(db, "cleanerApplications", id), { status: newStatus });  // ← Status updated here
    
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
```
**Called from:**
- Line 217: `updateApplicationStatus(item.id, "Approved", item.userId)` - Approve button
- Line 226: `updateApplicationStatus(item.id, "Rejected", item.userId)` - Reject button

**Context:** Admin can approve or reject cleaner applications. When approved, the user's role is also updated to "cleaner".

---

### CleaningRequests Collection - Status Updates

#### 5. Setting "pending" Status
**File:** `app/(tabs)/index.jsx`
**Line:** 189
**Function:** `submitCleaningRequest()`
**Code:**
```javascript
const request = {
  userId: user.uid,
  userEmail,
  location,
  date: date.toISOString().split("T")[0],
  time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
  additionalNotes: additionalNotes || "No additional notes",
  status: "pending",  // ← Status set here
  timestamp: new Date(),
};

// 6) Store in Firestore
await addDoc(collection(db, "cleaningRequests"), request);
```
**Context:** When a user creates a new cleaning request, it starts with "pending" status.

#### 6. Updating to "accepted" Status
**File:** `app/(cleanertabs)/requests.jsx`
**Line:** 67-71
**Function:** `handleAcceptRequest(requestId)`
**Code:**
```javascript
// Update the request status and assign the cleaner
await updateDoc(requestRef, {
  status: "accepted",  // ← Status updated here
  cleanerId: user.uid,
  cleanerEmail: cleanerEmail, // Store cleaner's email
});
```
**Context:** When a cleaner accepts an available cleaning request, the status changes from "pending" to "accepted".

**Validation:** 
- Line 61: Checks if `requestData.status !== "pending"` before allowing acceptance
- Line 24: Filters requests to only show those with `status === "pending"`

#### 7. Updating to "Completed" Status
**File:** `app/(cleanertabs)/order.jsx`
**Line:** 54-64
**Function:** `markAsCompleted(requestId)`
**Code:**
```javascript
// Mark order as completed
const markAsCompleted = async (requestId) => {
  try {
    const requestRef = doc(db, "cleaningRequests", requestId);
    await updateDoc(requestRef, { status: "Completed" });  // ← Status updated here

    Alert.alert("Success", "Order marked as completed!");
  } catch (error) {
    console.error("Error updating request status:", error);
    Alert.alert("Error", "Failed to mark order as completed.");
  }
};
```
**Context:** When a cleaner marks an accepted order as completed, the status changes to "Completed".

**UI Condition:**
- Line 96: Button only shows when `item.status !== "Completed"`

---

## Status Value Usage in UI/Logic

### Status Checks and Filters

1. **Filtering Pending Requests:**
   - `app/(cleanertabs)/requests.jsx:24` - Filters to show only `status === "pending"` requests

2. **Status Validation:**
   - `app/(cleanertabs)/requests.jsx:61` - Prevents accepting already accepted requests: `if (requestData.status !== "pending")`

3. **UI Conditional Rendering:**
   - `app/(tabs)/plan.jsx:333, 342, 359` - Shows rating UI only when `status === "Completed"`
   - `app/(cleanertabs)/order.jsx:96` - Shows "Mark as Completed" button only when `status !== "Completed"`
   - `app/(cleanertabs)/requests.jsx:101` - Shows "Accept Request" button only when `status === "pending"`
   - `app/(admintabs)/CleanerManage.jsx:215, 224` - Shows Approve/Reject buttons based on current status

4. **Status Display:**
   - `app/(tabs)/plan.jsx:315` - Displays status: `Status: {item.status}`
   - `app/(cleanertabs)/order.jsx:79` - Displays status: `Status: {item.status}`
   - `app/(cleanertabs)/requests.jsx:99` - Displays status: `Status: {item.status}`
   - `app/(admintabs)/CleanerManage.jsx:210` - Displays application status with color coding

---

## Firestore Security Rules

**File:** `firestore.rules`
**Line:** 45

The security rules enforce that cleaner applications can only be created with "pending" status:

```javascript
allow create: if request.auth != null && 
                 request.resource.data.userId == request.auth.uid && 
                 request.resource.data.status == 'pending';
```

This prevents users from creating applications with "Approved" or "Rejected" status directly.

---

## Status Flow Diagrams

### Cleaner Application Status Flow
```
User applies → "pending" → Admin reviews → "Approved" or "Rejected"
```

### Cleaning Request Status Flow
```
User creates request → "pending" → Cleaner accepts → "accepted" → Cleaner completes → "Completed"
```

### User Account Status Flow
```
User signs up → "unverified" → (Email verification handled separately, status may not be updated)
```

---

## Notes

1. **Case Sensitivity:** Note that status values use different cases:
   - "pending" (lowercase)
   - "accepted" (lowercase)
   - "Completed" (capitalized)
   - "Approved" (capitalized)
   - "Rejected" (capitalized)
   - "unverified" (lowercase)

2. **Status Updates:** All status updates use `updateDoc()` except for initial creation which uses `setDoc()` or `addDoc()`.

3. **No Status Updates Found For:**
   - The "unverified" status in users collection is never updated to "verified" in the codebase (email verification may be handled separately)

4. **Missing Status Transitions:**
   - There's no code to update user status from "unverified" to "verified" after email verification
   - There's no code to update cleaning request status from "accepted" back to "pending" (cancellation)

