# Race Condition Test Script

This test script verifies that the `runTransaction` logic in `app/(cleanertabs)/requests.jsx` properly prevents race conditions when multiple cleaners try to claim the same cleaning request simultaneously.

## Prerequisites

1. **Firebase Admin SDK Setup:**
   - You need a Firebase service account key JSON file
   - Or use Application Default Credentials (gcloud CLI)

2. **Test Data:**
   - Create 3 test cleaner accounts in Firebase Authentication
   - Get their UIDs from Firebase Console > Authentication > Users
   - Note: These should be users with the 'cleaner' role

3. **Node.js Dependencies:**
   ```bash
   npm install firebase-admin
   ```

## Setup Instructions

### Option 1: Using Service Account Key (Recommended)

1. **Get Service Account Key:**
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

2. **Set Environment Variable:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
   ```

### Option 2: Using Application Default Credentials

1. **Install gcloud CLI** (if not already installed)

2. **Authenticate:**
   ```bash
   gcloud auth application-default login
   ```

3. **Set Project ID:**
   ```bash
   export FIREBASE_PROJECT_ID="magic-broom-7d544"
   ```

## Configuration

Edit `test-race-condition.js` and update the `CONFIG` object:

```javascript
const CONFIG = {
  // Replace with actual UIDs from Firebase Auth
  testCleanerUIDs: [
    'actual-cleaner-1-uid-here',
    'actual-cleaner-2-uid-here',
    'actual-cleaner-3-uid-here',
  ],
  
  testCleanerEmails: [
    'cleaner1@example.com',
    'cleaner2@example.com',
    'cleaner3@example.com',
  ],
  
  testRequestData: {
    userId: 'actual-user-uid-here',  // A regular user (not a cleaner)
    userEmail: 'user@example.com',
    // ... rest of config
  },
};
```

## Running the Test

```bash
node test-race-condition.js
```

## Expected Output

### ✅ Success Case:
```
🚀 Starting Race Condition Test...

📝 Creating test cleaning request...
✅ Test request created with ID: abc123...

⚡ Launching simultaneous claim attempts...

📊 Test Results:
✅ Successful Claims: 1
   - Cleaner 1 (cleaner-1-uid) succeeded

❌ Failed Claims: 2
   ✅ Cleaner 2 (cleaner-2-uid): Job already claimed
   ✅ Cleaner 3 (cleaner-3-uid): Job already claimed

🔍 Verification:
✅ TEST PASSED: Exactly one cleaner succeeded (as expected)
✅ All failed attempts correctly threw "Job already claimed" error

🔎 Verifying final database state...
   Final Status: accepted
   Assigned Cleaner ID: cleaner-1-uid
   ✅ Database confirms Cleaner 1 won the race
```

### ❌ Failure Case (if race condition exists):
```
❌ TEST FAILED: 2 cleaners succeeded (expected only 1)
   ⚠️  Race condition detected! Transaction logic may not be working correctly.
```

## How It Works

1. **Creates a test cleaning request** with status `'pending'`
2. **Launches 3 simultaneous attempts** to claim the same request using `Promise.all()`
3. **Each attempt uses `runTransaction`** with the exact same logic as production code:
   - Reads the current document status
   - Verifies status is `'pending'`
   - Updates to `'accepted'` atomically
4. **Verifies results:**
   - Only ONE attempt should succeed
   - The other TWO should fail with "Job already claimed" error
   - Database should show exactly one cleaner assigned

## Understanding the Results

- **✅ Test Passes:** Only one cleaner succeeded, others got "Job already claimed" → Transaction is working correctly
- **❌ Test Fails:** Multiple cleaners succeeded → Race condition exists, transaction logic needs fixing

## Troubleshooting

### Error: "Error initializing Firebase Admin SDK"
- Make sure `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
- Verify the service account key file path is correct
- Check that the service account has Firestore permissions

### Error: "Request does not exist"
- The test request creation might have failed
- Check Firestore rules allow writes to `cleaningRequests` collection

### Error: "Permission denied"
- Service account needs Firestore read/write permissions
- Check Firestore security rules

### All 3 cleaners succeed (unexpected)
- This indicates a race condition
- Verify that `runTransaction` is being used correctly
- Check that the transaction logic matches production code exactly

## Notes

- The test automatically cleans up the test request after completion
- The test uses the exact same transaction logic as `requests.jsx`
- This test simulates real-world concurrent access patterns
- Run multiple times to ensure consistency

