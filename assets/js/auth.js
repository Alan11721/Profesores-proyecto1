import {  
    auth,
    db,  
    signInWithEmailAndPassword,  
    signOut,  
    onAuthStateChanged,  
    doc,  
    getDoc,  
    handleFirebaseError  
} from './firebase-config.js';

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const appContent = document.getElementById('appContent');
const loginSection = document.getElementById('loginSection');
const userEmailSpan = document.getElementById('userEmail');
const userRoleBadge = document.getElementById('userRoleBadge');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');

// Configuración inicial de UI
if (loginSection) loginSection.style.display = 'block';
if (appContent) appContent.style.display = 'none';
if (loginError) loginError.style.display = 'none';

// Manejo de Login
const handleLogin = async (e) => {
    if (e) e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Usuario autenticado:", userCredential.user);
        
        if (loginError) loginError.style.display = 'none';
        return true;
    } catch (error) {
        console.error("Error de autenticación:", error);
        
        if (loginError) {
            loginError.textContent = handleFirebaseError(error);
            loginError.style.display = 'block';
        }
        return false;
    }
};

// Manejo de Logout
const handleLogout = async () => {
    try {
        await signOut(auth);
        console.log("Sesión cerrada correctamente");
        return true;
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        return false;
    }
};

// Verificar y actualizar estado de autenticación
const checkAuthState = async (user) => {
    if (user) {
        console.log("Usuario autenticado:", user.email);
        
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        if (loginSection) loginSection.style.display = 'none';
        if (appContent) appContent.style.display = 'block';
        if (loginError) loginError.style.display = 'none';

        await setUserRole(user.uid);
        return true;
    } else {
        console.log("No hay usuario autenticado");
        
        if (loginSection) loginSection.style.display = 'block';
        if (appContent) appContent.style.display = 'none';
        return false;
    }
};

// Obtener y establecer rol del usuario
const setUserRole = async (uid) => {
    try {
        const userRef = doc(db, 'usuarios', uid);
        const userSnap = await getDoc(userRef);

        window.userRole = userSnap.exists() ? userSnap.data().role || 'lectura' : 'lectura';
        console.log("Rol del usuario:", window.userRole);

        if (userRoleBadge) {
            userRoleBadge.textContent = window.userRole;
            userRoleBadge.className = window.userRole === 'admin' ? 'badge bg-danger' : 'badge bg-primary';
        }

        setUIForRole(window.userRole);
    } catch (error) {
        console.error("Error al obtener rol:", error);
        window.userRole = 'lectura'; // Rol por defecto en caso de error
    }
};

// Configurar UI según el rol
const setUIForRole = (role) => {
    console.log("Configurando UI para rol:", role);
    
    const adminActions = document.getElementById('adminActions');
    if (adminActions) {
        adminActions.style.display = role === 'admin' ? 'block' : 'none';
    }
};

// Event Listeners
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

// Observador de estado de autenticación
onAuthStateChanged(auth, checkAuthState);

// Exportar funciones si es necesario
export { handleLogin, handleLogout, checkAuthState, setUserRole };