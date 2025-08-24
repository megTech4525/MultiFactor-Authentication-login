// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCL8wtdgmfDhGtU1waOoCEVzwn7FddWjY4",
  authDomain: "multiauth-327a7.firebaseapp.com",
  projectId: "multiauth-327a7",
  storageBucket: "multiauth-327a7.appspot.com",  
  messagingSenderId: "640723668093",
  appId: "1:640723668093:web:55bd24a1ebb1985755f514",
  measurementId: "G-43NQGFXN35"
};

// 🔹 Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔹 Setup Auth
const auth = getAuth(app);

// 🔹 Google Provider
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
