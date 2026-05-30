import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  const serials = [
    { key: "CONFORT-2024-PREMIUM", label: "Premier License" },
    { key: "APP-DEV-TEST-001", label: "Test Key 1" },
    { key: "LICENSE-MASTER-KJ23", label: "Master License" }
  ];

  for (const s of serials) {
    console.log(`Adding serial: ${s.key}`);
    await setDoc(doc(db, "serials", s.key), {
      active: true,
      label: s.label,
      createdAt: new Date().toISOString()
    });
  }
  console.log("Done!");
}

seed().catch(console.error);
