import { 
  auth, 
  db,
  createUserWithEmailAndPassword,
  doc,
  setDoc
} from './firebase-config.js';

async function createInitialUsers() {
  try {
    // 1. Crear usuario admin
    const adminUser = await createUserWithEmailAndPassword(
      auth,
      "admin@profesores.com",  // Cambia este email
      "Admin123!"             // Cambia esta contraseña
    );
    
    // 2. Crear usuario de solo lectura
    const readUser = await createUserWithEmailAndPassword(
      auth,
      "lectura@profesores.com",  // Cambia este email
      "Lectura123!"             // Cambia esta contraseña
    );
    
    // 3. Asignar roles en Firestore
    await setDoc(doc(db, "usuarios", adminUser.user.uid), {
      role: "admin",
      email: adminUser.user.email,
      createdAt: new Date()
    });
    
    await setDoc(doc(db, "usuarios", readUser.user.uid), {
      role: "lectura",
      email: readUser.user.email,
      createdAt: new Date()
    });
    
    console.log("Usuarios creados exitosamente!");
    alert("Usuarios creados:\nAdmin: admin@profesores.com\nLectura: lectura@profesores.com");
  } catch (error) {
    console.error("Error creando usuarios:", error);
    alert("Error creando usuarios: " + error.message);
  }
}

createInitialUsers();