import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase, ref, update } from "firebase/database"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyAmX_0zW98U4P2sk_pdp9Stqr8Zv5IxZc0",
  authDomain: "crypto-78b68.firebaseapp.com",
  databaseURL: "https://crypto-78b68-default-rtdb.firebaseio.com",
  projectId: "crypto-78b68",
  storageBucket: "crypto-78b68.firebasestorage.app",
  messagingSenderId: "506662617204",
  appId: "1:506662617204:web:85110d4e4fa11a53a51121",
  measurementId: "G-VTPTEFE8H0",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const database = getDatabase(app)
export const storage = getStorage(app)

// Add this function to create an admin user directly
// This is a helper function to set a user as admin
export const setUserAsAdmin = async (userId: string) => {
  const userRef = ref(database, `users/${userId}`)
  await update(userRef, {
    role: "admin",
  })
  return true
}

export default app

