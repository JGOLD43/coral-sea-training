/**
 * Coral Sea Training - Firebase Configuration
 * Shared across partner portal pages
 */

// Replace these values with your Firebase project config from console.firebase.google.com
window.firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

function hasFirebaseConfig(config) {
    if (!config) return false;
    return Object.keys(config).every(function(key) {
        return typeof config[key] === 'string' && config[key] && config[key].indexOf('YOUR_') === -1;
    });
}

window.CST_FIREBASE_READY = false;

if (typeof firebase !== 'undefined' && hasFirebaseConfig(window.firebaseConfig)) {
    firebase.initializeApp(window.firebaseConfig);
    window.auth = firebase.auth();
    window.CST_FIREBASE_READY = true;
} else {
    console.warn('Firebase config is missing or incomplete. Admin and partner integrations remain locked.');
}
