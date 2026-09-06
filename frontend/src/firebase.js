// Firebase initialization wrapper with lazy dynamic imports.
// To enable Firebase, set these env vars in a .env file:
// REACT_APP_FIREBASE_API_KEY, REACT_APP_FIREBASE_AUTH_DOMAIN, REACT_APP_FIREBASE_PROJECT_ID, REACT_APP_FIREBASE_APP_ID

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const firebaseAvailable = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);

// Returns { auth, googleProvider } or { auth: null, googleProvider: null }
export async function initFirebase() {
  if (!firebaseAvailable) return { auth: null, googleProvider: null };

  const { initializeApp } = await import('firebase/app');
  const { getAuth, GoogleAuthProvider } = await import('firebase/auth');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();

  return { auth, googleProvider };
}

export { firebaseAvailable };
