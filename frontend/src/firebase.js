import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// Configuration Firebase copiée depuis Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDmsBxMpC14iMr-ArokXeu9zLUDTvX7zf8",
  authDomain: "faceattendacerealtime-573bc.firebaseapp.com",
  databaseURL: "https://faceattendacerealtime-573bc-default-rtdb.firebaseio.com",
  projectId: "faceattendacerealtime-573bc",
  storageBucket: "faceattendacerealtime-573bc.appspot.com",
  messagingSenderId: "848766178198",
  appId: "1:848766178198:web:c877dc695c552d174c43b7",
  measurementId: "G-REMRVDKJRK"  
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app); // Pour l'upload d'images

export { storage };
