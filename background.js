// background.js - Service Worker (Manifest V3 Module)

// --- 1. IMPORT FIREBASE SDKs AND ERROR DICTIONARY---
import "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js";
import "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions-compat.js";
import "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js";
import { getFriendlyErrorMessage } from './src/error-dictionary.js';

// --- 2. INITIALIZE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBmCi2l_D-sW8wBVwW9p128BsFEyGQOuz0",
    authDomain: "salesbee-test.firebaseapp.com",
    projectId: "salesbee-test",
    storageBucket: "salesbee-test.firebasestorage.app",
    messagingSenderId: "519990493612",
    appId: "1:519990493612:web:9e49c76f8f683e4fb47a09",
    measurementId: "G-S28X5JZQ0Z"
};

let app, auth, functions, db;

try {
    if (self.firebase && !firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      functions = app.functions('europe-west3');
      db = firebase.firestore();
    } else if (self.firebase) {
      app = firebase.app();
      auth = firebase.auth();
      functions = app.functions('europe-west3');
      db = firebase.firestore();
    }
} catch(e) {
    console.error("Error during Firebase initialization:", e);
}

// --- 3. MANAGE USER STATE ---

// **NEW**: Create a promise that resolves when the first auth state is known.
let authReadyResolver;
const authReadyPromise = new Promise(resolve => {
    authReadyResolver = resolve;
});


let userStatus = { user: null, isEmailVerified: false, isSubscribed: false, isVintedVerified: false, hasHadTrial: false, role: null };
let firestoreListener = null;

const serializeUser = (user) => {
    if (!user) return null;
    return { uid: user.uid, email: user.email, displayName: user.displayName, emailVerified: user.emailVerified };
};

const broadcastStatusUpdate = (statusToBroadcast = userStatus) => {
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            if (tab.id && tab.url?.startsWith('http')) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'USER_STATUS_CHANGED',
                    payload: statusToBroadcast
                }).catch(err => {});
            }
        }
    });
};

async function buildUserStatus(user) {
    if (!user) {
        return { user: null, isEmailVerified: false, isSubscribed: false, isVintedVerified: false, hasHadTrial: false, role: null };
    }
    try {
        await user.reload();
        const freshUser = auth.currentUser;
        if (!freshUser) {
             return { user: null, isEmailVerified: false, isSubscribed: false, isVintedVerified: false, hasHadTrial: false, role: null };
        }

        const idTokenResult = await freshUser.getIdTokenResult();
        const stripeRole = idTokenResult.claims.stripeRole || null;
        const isEmailVerified = freshUser.emailVerified;

        const customerRef = db.collection('customers').doc(freshUser.uid);
        const customerDoc = await customerRef.get();

        if (!customerDoc.exists) {
            return { user: serializeUser(freshUser), isEmailVerified, isSubscribed: false, isVintedVerified: false, hasHadTrial: false, role: stripeRole };
        }
        
        const customerData = customerDoc.data();
        const finalStatus = {
            user: serializeUser(freshUser),
            isEmailVerified,
            isSubscribed: customerData.isSubscribed === true,
            isVintedVerified: !!customerData.vintedInfo,
            hasHadTrial: customerData.hasHadTrial === true,
            role: stripeRole
        };
        return finalStatus;

    } catch (error) {
        console.error("Error building user status:", error);
        return { user: serializeUser(user), isEmailVerified: user.emailVerified, isSubscribed: false, isVintedVerified: false, hasHadTrial: false, role: null };
    }
}


if (auth) {
    auth.onAuthStateChanged((user) => {
        if (firestoreListener) {
            firestoreListener();
            firestoreListener = null;
        }

        if (user && db) {
            const customerRef = db.collection('customers').doc(user.uid);
            
            firestoreListener = customerRef.onSnapshot(async (doc) => {
                console.log("Real-time update received! Rebuilding status.");
                userStatus = await buildUserStatus(auth.currentUser);
                broadcastStatusUpdate(userStatus);
                // **MODIFIED**: Resolve the promise once the first status is built.
                authReadyResolver();
            }, (error) => {
                console.error("Firestore listener failed:", error);
                authReadyResolver(); // Also resolve on error to not block forever
            });
        } else {
            buildUserStatus(null).then(status => {
                userStatus = status;
                broadcastStatusUpdate(userStatus);
                // **MODIFIED**: Resolve the promise for a logged-out user.
                authReadyResolver();
            });
        }
    });
}

// --- 4. LISTEN FOR MESSAGES (UPDATED) ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!auth) {
      sendResponse({ success: false, error: getFriendlyErrorMessage('firebase-not-initialized') });
      return true;
    }

    (async () => {
        // **MODIFIED**: Always wait for the initial auth state to be confirmed
        // before handling any message that depends on it.
        await authReadyPromise;

        let status;
        switch (message.type) {
            case 'GET_USER_STATUS':
                // The forceRefresh logic is still useful for subsequent checks.
                if (message.forceRefresh && auth.currentUser) {
                    status = await buildUserStatus(auth.currentUser);
                    userStatus = status;
                } else {
                    status = userStatus;
                }
                sendResponse(status);
                break;

            // ... cases for LOGIN, LOGOUT, etc. remain the same
            case 'LOGIN':
            case 'LOGOUT':
            case 'START_FREE_TRIAL':
            case 'LINK_VINTED_ACCOUNT':
                try {
                    let responseData = { success: true };
                    if (message.type === 'LOGIN') {
                        await auth.signInWithEmailAndPassword(message.payload.email, message.payload.password);
                    } else if (message.type === 'LOGOUT') {
                        await auth.signOut();
                    } else if (message.type === 'START_FREE_TRIAL') {
                        const startFreeTrial = functions.httpsCallable('startFreeTrial');
                        await startFreeTrial();
                    } else if (message.type === 'LINK_VINTED_ACCOUNT') {
                        const linkVintedAccount = functions.httpsCallable('linkVintedAccount');
                        await linkVintedAccount({ vintedUsername: message.payload.vintedUsername });
                    }
                    responseData.status = await buildUserStatus(auth.currentUser);
                    sendResponse(responseData);
                } catch (error) {
                    console.log("--- Firebase Function Error Debug ---", error);
                    sendResponse({ success: false, error: getFriendlyErrorMessage(error.code || error.message) });
                }
                break;

            case 'USE_FEATURE':
                try {
                    const useFeature = functions.httpsCallable('useFeature');
                    const result = await useFeature({ feature: message.payload.featureName });
                    sendResponse({ success: true, data: result.data });
                } catch (error) {
                    if (error.code === 'functions/permission-denied') {
                        buildUserStatus(auth.currentUser).then(newStatus => {
                           userStatus = newStatus;
                           broadcastStatusUpdate(userStatus);
                        });
                    }
                    sendResponse({ success: false, error: getFriendlyErrorMessage(error.code || error.message) });
                }
                break;
            
            case 'SEND_VERIFICATION_EMAIL':
                 try {
                    await auth.currentUser.sendEmailVerification();
                    sendResponse({ success: true });
                } catch (error) {
                    sendResponse({ success: false, error: getFriendlyErrorMessage(error.code || error.message) });
                }
                break;
        }
    })();

    return true; // Keep the message channel open for the async response
});