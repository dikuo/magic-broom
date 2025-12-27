# Magic Broom - On-Demand Cleaning Service Marketplace

<div align="center">

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-Magic%20Broom-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://magic-broom.vercel.app/)

**[🌐 View Live Demo →](https://magic-broom.vercel.app/)**

</div>

---

A full-stack, cross-platform mobile application built with React Native and Expo, connecting customers with professional cleaning service providers through a secure, scalable three-sided marketplace platform.

## 🎯 Project Overview

Magic Broom is a **three-sided marketplace** that facilitates on-demand cleaning services:

- **👥 Customers**: Request cleaning services, manage bookings, and rate providers
- **🧹 Service Providers (Cleaners)**: Browse available jobs, accept requests, and manage completed orders
- **👨‍💼 Administrators**: Manage cleaner applications, approve/reject providers, and oversee platform operations

### Key Features

- **Real-time Job Matching**: Customers post cleaning requests that providers can browse and accept
- **Role-Based Access Control**: Secure authentication with distinct user roles (customer, cleaner, admin)
- **Location Services**: Google Maps integration for address autocomplete and location-based services
- **Rating System**: Customers can rate cleaners after service completion
- **Application Management**: Cleaners apply to join the platform, admins review and approve applications
- **Order Tracking**: Real-time status updates from `pending` → `accepted` → `Completed`

## 🛠️ Tech Stack

### Frontend
- **React Native** (v0.76.7) - Cross-platform mobile framework
- **Expo** (v52.0.38) - Development platform and tooling
- **Expo Router** (v4.0.18) - File-based routing system
- **React Navigation** - Navigation library
- **React Native Reanimated** - Animation library

### Backend & Services
- **Firebase Authentication** - User authentication and email verification
- **Cloud Firestore** - NoSQL database for real-time data synchronization
- **Firebase Storage** - Profile picture and media storage
- **Firebase Functions** - Serverless backend functions (Google Maps API proxy)

### Third-Party Integrations
- **Google Maps API** - Location autocomplete and geocoding
- **React Native Google Places Autocomplete** - Address input component

### Development Tools
- **TypeScript** - Type safety
- **Jest** - Testing framework
- **ESLint** - Code linting

## 🚀 Featured Engineering: Race Condition Prevention

### Problem
In a high-concurrency environment, multiple service providers could simultaneously attempt to claim the same cleaning request, leading to:
- **Data inconsistency**: Multiple cleaners assigned to one job
- **Race conditions**: Lost updates when concurrent writes occur
- **Poor user experience**: Confusion and booking conflicts

### Solution: Firebase Transactions

Refactored critical database operations from `updateDoc()` to **Firebase `runTransaction()`** to ensure atomic, consistent updates:

#### Implementation

**File**: `app/(cleanertabs)/requests.jsx`

```javascript
// Before: Race condition vulnerability
await updateDoc(requestRef, {
  status: "accepted",
  cleanerId: user.uid,
  cleanerEmail: cleanerEmail,
});

// After: Atomic transaction with concurrency control
await runTransaction(db, async (transaction) => {
  const requestSnap = await transaction.get(requestRef);
  const requestData = requestSnap.data();
  
  // Verify status is 'pending' before updating
  if (requestData.status !== "pending") {
    if (requestData.status === "accepted") {
      throw new Error("Job already claimed");
    }
    throw new Error("This request has already been accepted.");
  }
  
  // Atomic update within transaction
  transaction.update(requestRef, {
    status: "accepted",
    cleanerId: user.uid,
    cleanerEmail: cleanerEmail,
  });
});
```

#### Benefits
- ✅ **100% Data Consistency**: Only one cleaner can claim a job, guaranteed
- ✅ **Atomic Operations**: Read and write operations execute atomically
- ✅ **Automatic Retry**: Firebase automatically retries failed transactions
- ✅ **Concurrency Safety**: Prevents race conditions in high-traffic scenarios

#### Impact
- Eliminated race conditions in job-claiming flow
- Ensured data integrity under concurrent access
- Improved system reliability and user trust

## 🧪 Testing

### Race Condition Stress Testing

A comprehensive Node.js test suite validates transaction logic under concurrent load:

**File**: `test-race-condition.js`

The test script simulates real-world concurrency by:
1. Creating a test cleaning request with `status: 'pending'`
2. Launching **3 simultaneous claim attempts** using `Promise.all()`
3. Verifying that **exactly one** attempt succeeds
4. Confirming that **2 attempts** correctly receive "Job already claimed" error
5. Validating final database state matches expected outcome

#### Running the Test

```bash
# Install test dependencies
npm install firebase-admin

# Set Firebase credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Update test configuration in test-race-condition.js
# - Add test cleaner UIDs
# - Add test user UID

# Run the test
node test-race-condition.js
```

#### Expected Output

```
✅ TEST PASSED: Exactly one cleaner succeeded (as expected)
✅ All failed attempts correctly threw "Job already claimed" error
✅ Database confirms only one cleaner was assigned
```

See `TEST_RACE_CONDITION_README.md` for detailed setup and troubleshooting instructions.

## 🔒 Security

### Firestore Security Rules

Comprehensive security rules enforce role-based access control:

- **User Collection**: Users can only read/update their own profile; admins have full access
- **Cleaner Applications**: Users can create applications with `status: 'pending'` only; admins can update status
- **Cleaning Requests**: 
  - Customers can create and manage their own requests
  - Cleaners can list and accept available requests
  - Admins have full access
- **Default Deny**: All other collections are locked down by default

**File**: `firestore.rules`

### Authentication & Authorization

- **Email Verification**: Required before customers can submit requests
- **Role-Based Access**: Three distinct roles (user, cleaner, admin) with appropriate permissions
- **Secure API Keys**: Environment variables for sensitive configuration
- **Google Maps Integration**: CORS-protected API calls through Firebase Functions proxy

## 📁 Project Structure

```
magicBroom/
├── app/                          # Expo Router app directory
│   ├── (auth)/                  # Authentication screens
│   │   ├── index.jsx           # Login
│   │   └── signup.jsx           # Registration
│   ├── (tabs)/                  # Customer interface
│   │   ├── index.jsx            # Request cleaning service
│   │   ├── plan.jsx             # View/manage requests
│   │   └── profile.jsx          # User profile & cleaner application
│   ├── (cleanertabs)/           # Provider interface
│   │   ├── requests.jsx         # Browse & accept jobs (with transactions)
│   │   ├── order.jsx            # Manage accepted orders
│   │   └── profile.jsx          # Cleaner profile
│   ├── (admintabs)/             # Admin interface
│   │   └── CleanerManage.jsx    # Approve/reject cleaner applications
│   └── firebaseConfig.js         # Firebase initialization
├── components/                   # Reusable UI components
├── functions/                   # Firebase Cloud Functions
│   └── index.js                 # Google Maps API proxy
├── firestore.rules              # Security rules
├── test-race-condition.js     # Race condition test script
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (installed globally or via npx)
- **Firebase Project** with:
  - Authentication enabled
  - Firestore database created
  - Storage bucket configured
- **Google Maps API Key** (for location services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dikuo/magic-broom.git
   cd magic-broom
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. **Configure Firebase**
   
   Update `app/firebaseConfig.js` if needed (configuration is loaded from `app.config.js`)

5. **Deploy Firestore Rules** (optional, for production)
   ```bash
   firebase deploy --only firestore:rules
   ```

### Running the Application

1. **Start the Expo development server**
   ```bash
   npx expo start
   ```

2. **Choose your platform**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser
   - Scan QR code with Expo Go app (iOS/Android)

### Building for Production

**Web:**
```bash
npx expo export:web
```

**iOS/Android:**
```bash
# Build using EAS (Expo Application Services)
eas build --platform ios
eas build --platform android
```

## 📱 Platform Support

- ✅ **iOS** (iOS 13+)
- ✅ **Android** (API 21+)
- ✅ **Web** (Modern browsers)

## 🔄 Data Flow

### Job Claiming Flow (with Transaction)

```
1. Customer creates request → status: "pending"
2. Multiple cleaners see request simultaneously
3. Cleaner A, B, C all click "Accept" at same time
4. Transaction ensures:
   - Only first transaction succeeds
   - Others receive "Job already claimed" error
   - Database shows exactly one cleaner assigned
5. Status updates to "accepted" with cleanerId
```

### Cleaner Application Flow

```
1. User applies → cleanerApplications/{uid} created (status: "pending")
2. Admin reviews application
3. Admin approves/rejects → status updated to "Approved" or "Rejected"
4. If approved → user role updated to "cleaner" in users collection
```

## 🛣️ Roadmap

- [ ] Push notifications for job assignments
- [ ] In-app messaging between customers and cleaners
- [ ] Payment integration
- [ ] Advanced filtering and search
- [ ] Cleaner availability scheduling
- [ ] Recurring booking support

## 📄 License

This project is private and proprietary.

## 👥 Contributing

This is a private project. For questions or issues, please contact the development team.

## 📞 Support

For technical support or questions:
- Review the documentation in `TEST_RACE_CONDITION_README.md`
- Check `STATUS_FIELD_ANALYSIS.md` for status field documentation
- Review Firestore security rules in `firestore.rules`

---

**Built with ❤️ using React Native, Expo, and Firebase**
