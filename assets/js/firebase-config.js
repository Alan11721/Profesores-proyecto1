import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-FsaxFAo2NlBW_w-2BzhEY1EEQSZzFqg",
  authDomain: "profesores-proyecto.firebaseapp.com",
  projectId: "profesores-proyecto",
  storageBucket: "profesores-proyecto.appspot.com",
  messagingSenderId: "919737017560",
  appId: "1:919737017560:web:69ee68776db58e0bf323ad",
  measurementId: "G-WKV4ZBF3NS"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Verificar conexión a Firebase
console.log("Firebase inicializado correctamente:", app.name);

// Manejo de errores mejorado
export const handleFirebaseError = (error) => {
  const errorMap = {
    "auth/user-not-found": "Usuario no encontrado",
    "auth/wrong-password": "Contraseña incorrecta",
    "auth/email-already-in-use": "El correo ya está registrado",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
    "auth/too-many-requests": "Demasiados intentos. Intente más tarde",
    "auth/network-request-failed": "Error de conexión. Verifique su internet",
    "permission-denied": "No tiene permisos para esta acción",
    "firestore/not-found": "Documento no encontrado"
  };

  return errorMap[error.code] || error.message || "Error desconocido";
};

// Función para registrar nuevos usuarios (solo admins)
export const registerNewUser = async (adminUid, newEmail, newPassword, role = "lectura") => {
  try {
    // Verificar si el usuario actual es admin
    const adminRef = doc(db, "usuarios", adminUid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists() || adminSnap.data().role !== "admin") {
      throw new Error("No tienes permisos para crear usuarios");
    }

    // Validar rol
    if (!["admin", "lectura"].includes(role)) {
      throw new Error("Rol inválido. Debe ser 'admin' o 'lectura'");
    }

    // Crear nuevo usuario
    const userCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
    
    // Guardar datos adicionales en Firestore
    await setDoc(doc(db, "usuarios", userCredential.user.uid), {
      email: newEmail,
      role: role,
      createdAt: new Date().toISOString()
    });

    return { success: true, userId: userCredential.user.uid };
  } catch (error) {
    console.error("Error al crear usuario:", error);
    throw new Error(handleFirebaseError(error));
  }
};

// Exportar todas las funciones necesarias
export { 
  app, 
  auth, 
  db, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs
};