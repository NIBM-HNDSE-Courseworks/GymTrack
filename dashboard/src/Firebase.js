import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { getDatabase, ref, set, get, remove } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";

// 1️⃣ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDqzB125_DD0slXXpaBfVBgKoGgRNO5LM0",
  authDomain: "smartgymtracker-4123b.firebaseapp.com",
  databaseURL: "https://smartgymtracker-4123b-default-rtdb.firebaseio.com",
  projectId: "smartgymtracker-4123b",
  storageBucket: "smartgymtracker-4123b.firebasestorage.app",
  messagingSenderId: "704061624974",
  appId: "1:704061624974:web:9341b391a4df198f492fdf",
  measurementId: "G-KSV8CNB599",
};

// 2️⃣ Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
const functions = getFunctions(app);

// 4️⃣ CREATE STAFF ACCOUNT
export async function createStaffAccount({ name, email, password }) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential.user;

  await updateProfile(user, { displayName: name });

  await set(ref(db, "staff_users/" + user.uid), {
    uid: user.uid,
    name,
    email,
    role: "staff",
    createdAt: new Date().toISOString(),
  });

  return user;
}

// 5️⃣ GET STAFF LIST
export async function getStaffList() {
  const snapshot = await get(ref(db, "staff_users"));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data).map((uid) => ({ id: uid, ...data[uid] }));
}

// 6️⃣ DELETE STAFF
export const deleteStaff = async (uid) => {
  await remove(ref(db, "staff_users/" + uid));
};
