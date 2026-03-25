import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyD3B2doTyDYeM4fvfZE-VzKbQLNDI8OL28",
  authDomain: "listro-mobile-921d3.firebaseapp.com",
  projectId: "listro-mobile-921d3",
  storageBucket: "listro-mobile-921d3.firebasestorage.app",
  messagingSenderId: "100852910616",
  appId: "1:100852910616:web:159441c0ef6b109fbfd16d",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/* 🔥 THIS WAS MISSING */
export const functions = getFunctions(app, "us-central1");
