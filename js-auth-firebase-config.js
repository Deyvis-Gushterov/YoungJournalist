/* Firebase bootstrap shared by every page (Firebase compat SDK v9). */
(function () {
    // Confirm this is the intended Firebase project before deployment.
    // If Realtime Database is in a non-default region, add the exact
    // databaseURL shown in Firebase Console → Realtime Database here.
    const firebaseConfig = {
        apiKey: "AIzaSyBoW791sZAolr1yZizsh2ASwTVUnYbid_o",
        authDomain: "account-checker-6aa7f.firebaseapp.com",
        projectId: "account-checker-6aa7f",
        // Default RTDB endpoint. If Firebase Console shows a regional URL,
        // replace this value with the exact URL shown under Realtime Database.
        databaseURL: window.YJ_FIREBASE_DATABASE_URL || "https://account-checker-6aa7f-default-rtdb.firebaseio.com",
        storageBucket: "account-checker-6aa7f.firebasestorage.app",
        messagingSenderId: "801294791031",
        appId: "1:801294791031:web:2696780088e7929c3d3172",
        measurementId: "G-6241B9Y3WE"
    };

    try {
        if (!window.firebase || !firebase.apps) throw new Error('Firebase SDK не е зареден. Проверете интернет връзката и реда на скриптовете.');
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

        // Expose services only when their compat SDKs are present.
        window.db = typeof firebase.database === 'function' ? firebase.database() : null;
        window.auth = typeof firebase.auth === 'function' ? firebase.auth() : null;
        window.firebaseReady = Boolean(window.db && window.auth);

        if (window.auth) {
            window.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
                .catch(err => console.warn('Firebase Auth persistence:', err.code || err.message));
        }
        // Report missing SDKs only when the compat constructors are genuinely absent.
        // A missing global firebaseConfig is expected: configuration is intentionally scoped here.
        if (typeof firebase.database !== 'function') console.error('Firebase Realtime Database SDK не е зареден.');
        if (typeof firebase.auth !== 'function') console.error('Firebase Authentication SDK не е зареден.');
        window.firebaseServices = { app: firebase.app(), db: window.db, auth: window.auth };

    } catch (error) {
        window.firebaseReady = false;
        window.firebaseInitError = error;
        console.error('Firebase initialization failed:', error);
    }

    window.RUBRIC_TYPES = {
        RECIPES: 'recipes', INTERESTING: 'interesting', JOKES: 'jokes',
        BEHIND_THE_BELL: 'behind_the_bell', FACE_OF_ISSUE: 'face_of_issue', OUR_CHAMPIONS: 'our_champions',
        FIVE_QUESTIONS: 'five_questions', DID_YOU_KNOW: 'did_you_know', WORD_OF_ISSUE: 'word_of_issue',
        PEN_AND_IMAGINATION: 'pen_and_imagination', COMIC_PAGE: 'comic_page',
        TRENDOMETER: 'trendometer', ECO_PATROL: 'eco_patrol', TRAVEL_WITH_US: 'travel_with_us',
        HALLWAY_POLL: 'hallway_poll', HUNDRED_SECONDS: 'hundred_seconds', SECRET_REPORTER: 'secret_reporter',
        FROM_THE_FIRST_DESK: 'from_the_first_desk', PERSON_BEHIND_SUCCESS: 'person_behind_success'
    };
})();
