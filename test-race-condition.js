/**
 * Race Condition Test Script
 * 
 * This script tests that the runTransaction logic in requests.jsx
 * properly prevents race conditions when multiple cleaners try to
 * claim the same cleaning request simultaneously.
 * 
 * Usage:
 *   node test-race-condition.js
 * 
 * Prerequisites:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key
 *   2. Or set FIREBASE_PROJECT_ID environment variable and use Application Default Credentials
 *   3. Ensure you have test cleaner accounts created in Firebase Auth
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let db;
let testRequestId = null;

// Configuration - Update these with your test data
const CONFIG = {
  // Test cleaner user IDs (create these in Firebase Auth first)
  // These should be UIDs of users with 'cleaner' role
  // You can get these from Firebase Console > Authentication > Users
  testCleanerUIDs: [
    'cAoglcutz2bWzTVJDq1sd9zUBKf2',  // Replace with actual UID from Firebase Auth
    'PTGkio4isWMdsp8LCbIBWZBmQ8x1',  // Replace with actual UID from Firebase Auth
    '8JcNWRCbv6ccXGR0ghgFTj0iA5s2',  // Replace with actual UID from Firebase Auth
  ],
  
  // Test cleaner emails (for cleanerEmail field)
  testCleanerEmails: [
    'cleaner1@test.com',
    'cleaner2@test.com',
    'cleaner3@test.com',
  ],
  
  // Test request data
  testRequestData: {
    userId: 'griyPsQGlBPq8ZFXirawqHAgkWj2',  // Replace with actual user UID (not a cleaner)
    userEmail: 'user@test.com',
    location: '123 Test Street, Test City',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    additionalNotes: 'Test request for race condition testing',
    status: 'pending',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  },
};

/**
 * Initialize Firebase Admin SDK
 */
function initializeAdminSDK() {
  try {
    // Try to use existing app
    if (admin.apps.length > 0) {
      db = admin.firestore();
      console.log('✅ Using existing Firebase Admin app');
      return;
    }

    // Initialize with service account or default credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: CONFIG.testRequestData.projectId || 'magic-broom-7d544',
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Use Application Default Credentials
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'magic-broom-7d544',
      });
    } else {
      // Try to initialize with default credentials
      admin.initializeApp({
        projectId: 'magic-broom-7d544',
      });
    }

    db = admin.firestore();
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
    console.log('\n💡 Tip: Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID environment variable');
    throw error;
  }
}


/**
 * Create a test cleaning request
 */
async function createTestRequest() {
  try {
    console.log('\n📝 Creating test cleaning request...');
    const docRef = await db.collection('cleaningRequests').add(CONFIG.testRequestData);
    testRequestId = docRef.id;
    console.log(`✅ Test request created with ID: ${testRequestId}`);
    return testRequestId;
  } catch (error) {
    console.error('❌ Error creating test request:', error.message);
    throw error;
  }
}

/**
 * Attempt to claim a request (simulates handleAcceptRequest from requests.jsx)
 * This uses the EXACT same transaction logic as the production code
 */
async function attemptToClaimRequest(requestId, cleanerUID, cleanerEmail, cleanerIndex) {
  try {
    const requestRef = db.collection('cleaningRequests').doc(requestId);

    // Using Admin SDK runTransaction (same atomic behavior as JS SDK)
    await db.runTransaction(async (transaction) => {
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists) {
        throw new Error('Request does not exist.');
      }

      const requestData = requestSnap.data();

      // Verify the current status is exactly 'pending' before updating
      // This matches the exact logic from requests.jsx line 62-67
      if (requestData.status !== 'pending') {
        if (requestData.status === 'accepted') {
          throw new Error('Job already claimed');
        }
        throw new Error('This request has already been accepted.');
      }

      // Update the request status and assign the cleaner within the transaction
      // This matches the exact logic from requests.jsx line 70-74
      transaction.update(requestRef, {
        status: 'accepted',
        cleanerId: cleanerUID,
        cleanerEmail: cleanerEmail,
      });
    });

    return { success: true, cleanerIndex, cleanerUID, cleanerEmail };
  } catch (error) {
    return {
      success: false,
      cleanerIndex,
      cleanerUID,
      cleanerEmail,
      error: error.message,
    };
  }
}

/**
 * Run the race condition test
 */
async function runRaceConditionTest() {
  console.log('\n🚀 Starting Race Condition Test...\n');
  console.log('=' .repeat(60));
  console.log('Test Configuration:');
  console.log(`  - Using Firebase Admin SDK`);
  console.log(`  - Number of concurrent attempts: ${CONFIG.testCleanerUIDs.length}`);
  console.log('=' .repeat(60));

  try {
    // Step 1: Create a test request
    const requestId = await createTestRequest();

    // Step 2: Attempt to claim the same request simultaneously from 3 cleaners
    console.log('\n⚡ Launching simultaneous claim attempts...\n');
    
    const startTime = Date.now();
    
    const results = await Promise.all(
      CONFIG.testCleanerUIDs.map((uid, index) =>
        attemptToClaimRequest(
          requestId,
          uid,
          CONFIG.testCleanerEmails[index],
          index + 1
        )
      )
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Step 3: Analyze results
    console.log('\n📊 Test Results:');
    console.log('=' .repeat(60));
    
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    
    console.log(`\n✅ Successful Claims: ${successful.length}`);
    successful.forEach((result) => {
      console.log(
        `   - Cleaner ${result.cleanerIndex} (${result.cleanerUID}) succeeded`
      );
    });

    console.log(`\n❌ Failed Claims: ${failed.length}`);
    failed.forEach((result) => {
      const isExpectedError = result.error === 'Job already claimed';
      const icon = isExpectedError ? '✅' : '⚠️';
      console.log(
        `   ${icon} Cleaner ${result.cleanerIndex} (${result.cleanerUID}): ${result.error}`
      );
    });

    // Step 4: Verify the test passed
    console.log('\n🔍 Verification:');
    console.log('=' .repeat(60));
    
    if (successful.length === 1) {
      console.log('✅ TEST PASSED: Exactly one cleaner succeeded (as expected)');
    } else if (successful.length === 0) {
      console.log('❌ TEST FAILED: No cleaner succeeded (unexpected)');
    } else {
      console.log(
        `❌ TEST FAILED: ${successful.length} cleaners succeeded (expected only 1)`
      );
      console.log('   ⚠️  Race condition detected! Transaction logic may not be working correctly.');
    }

    const expectedErrors = failed.filter(
      (r) => r.error === 'Job already claimed'
    );
    if (expectedErrors.length === failed.length && failed.length === 2) {
      console.log(
        '✅ All failed attempts correctly threw "Job already claimed" error'
      );
    } else if (failed.length > 0) {
      const unexpectedErrors = failed.filter(
        (r) => r.error !== 'Job already claimed'
      );
      if (unexpectedErrors.length > 0) {
        console.log(
          '⚠️  Some failures had unexpected errors (not "Job already claimed")'
        );
      }
    }

    console.log(`\n⏱️  Test Duration: ${duration}ms`);

    // Step 5: Verify final state in database
    console.log('\n🔎 Verifying final database state...');
    const finalDoc = await db
      .collection('cleaningRequests')
      .doc(requestId)
      .get();
    
    if (finalDoc.exists) {
      const finalData = finalDoc.data();
      console.log(`   Final Status: ${finalData.status}`);
      console.log(`   Assigned Cleaner ID: ${finalData.cleanerId || 'None'}`);
      console.log(`   Assigned Cleaner Email: ${finalData.cleanerEmail || 'None'}`);
      
      if (finalData.status === 'accepted' && finalData.cleanerId) {
        const winningCleaner = CONFIG.testCleanerUIDs.indexOf(finalData.cleanerId);
        if (winningCleaner !== -1) {
          console.log(
            `   ✅ Database confirms Cleaner ${winningCleaner + 1} won the race`
          );
        }
      }
    }

    // Cleanup: Delete test request
    console.log('\n🧹 Cleaning up test data...');
    await db.collection('cleaningRequests').doc(requestId).delete();
    console.log('✅ Test request deleted');

    console.log('\n' + '=' .repeat(60));
    console.log('Test Complete!');
    console.log('=' .repeat(60) + '\n');

    return {
      passed: successful.length === 1,
      successfulCount: successful.length,
      failedCount: failed.length,
      duration,
    };
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error(error.stack);
    
    // Cleanup on error
    if (testRequestId) {
      try {
        await db.collection('cleaningRequests').doc(testRequestId).delete();
        console.log('✅ Cleaned up test request after error');
      } catch (cleanupError) {
        console.error('⚠️  Failed to cleanup test request:', cleanupError.message);
      }
    }
    
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Initialize Firebase Admin SDK
    initializeAdminSDK();

    // Run the test
    const result = await runRaceConditionTest();

    // Exit with appropriate code
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  runRaceConditionTest,
  attemptToClaimRequest,
  createTestRequest,
};

