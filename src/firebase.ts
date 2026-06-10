import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Enable Firestore Multi-Tab Offline Persistence for immediate offline functionality
enableMultiTabIndexedDbPersistence(db)
  .then(() => {
    console.log("Firestore Multi-Tab Persistence Enabled Successfully");
  })
  .catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Firestore offline persistence: multiple tabs open");
    } else if (err.code === "unimplemented") {
      console.warn("Firestore offline persistence: unimplemented browser support");
    } else {
      console.error("Firestore offline persistence error:", err);
    }
  });

export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInAnonymous = () => signInAnonymously(auth);
export const signOut = () => auth.signOut();

export const verifySerial = async (serial: string) => {
  const serialDoc = await getDoc(doc(db, "serials", serial));
  if (serialDoc.exists()) {
    const data = serialDoc.data();
    return data.active === true;
  }
  return false;
};

export const addSerial = async (serial: string, label: string = "Admin Created") => {
  await setDoc(doc(db, "serials", serial), {
    active: true,
    label,
    createdAt: new Date().toISOString()
  });
};
