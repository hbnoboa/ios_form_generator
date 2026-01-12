import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Copie do Console do Firebase > Configurações do projeto > Seus apps > Config do app Web
const firebaseConfig = {
  apiKey: "AIzaSyBmOvrfhGWa5R0PAsp7JqbWtaracw0nunE",
  authDomain: "ios-forms-299fb.firebaseapp.com",
  projectId: "ios-forms-299fb",
  storageBucket: "ios-forms-299fb.firebasestorage.app",
  messagingSenderId: "35661851099",
  appId: "1:35661851099:web:73310909d31909232b1ffe",
  measurementId: "G-MB0GMEQDB1",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { auth, db, storage, analytics };
