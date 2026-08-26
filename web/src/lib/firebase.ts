import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Mesmo app Web registrado no Firebase (converteu-dec78) usado pela versão anterior do site.
const firebaseConfig = {
  apiKey: "AIzaSyBuPf42fom45KZ6y3jl9i21UaKHsxobzwM",
  authDomain: "converteu-dec78.firebaseapp.com",
  projectId: "converteu-dec78",
  storageBucket: "converteu-dec78.firebasestorage.app",
  messagingSenderId: "868355267615",
  appId: "1:868355267615:web:71d4ab0a7907e81b91c92a",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { firebaseConfig };
