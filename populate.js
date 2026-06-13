const admin = require('firebase-admin');

// We are using the project ID directly. 
// If it fails due to missing credentials, we will catch it.
admin.initializeApp({
  projectId: 'omni-arch-mcp-2026'
});

const db = admin.firestore();

async function run() {
  try {
    await db.collection('users').doc('licenses').collection('LICENSE_KEY_HEX_AAA_888').doc('data').set({
        active: true,
        tier: 3,
        assignedDevice: "8472ad9e92bf181a",
        email: "executive@sovereign.io",
        created: 1716942000000
    });
    // Wait, the schema from prompt is users/licenses/LICENSE_KEY_HEX_AAA_888
    await db.collection('users').doc('licenses').set({}); // ensure parent exists? not strictly required
    await db.doc('users/licenses/LICENSE_KEY_HEX_AAA_888').set({
        active: true,
        tier: 3,
        assignedDevice: "8472ad9e92bf181a",
        email: "executive@sovereign.io",
        created: 1716942000000
    });
    console.log('Test license created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create test document:', error);
    process.exit(1);
  }
}

run();
