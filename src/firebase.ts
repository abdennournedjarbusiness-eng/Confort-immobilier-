import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
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
