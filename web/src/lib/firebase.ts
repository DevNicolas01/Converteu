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
// Por padrão o SDK insiste por até 2min num upload que está falhando (ex: CORS mal configurado)
// antes de desistir — a pessoa fica olhando "Salvando..." esse tempo todo. 15s já é generoso
// pra uma rede normal e dá feedback rápido quando algo está errado de verdade.
storage.maxUploadRetryTime = 15000;
export { firebaseConfig };
