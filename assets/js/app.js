import { auth, db, handleFirebaseError } from './firebase-config.js';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, getDocs, query, where, setDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Elementos de la interfaz
const loginSection = document.getElementById("loginSection");
const appContent = document.getElementById("appContent");
const loginForm = document.getElementById("loginForm");
const userEmailSpan = document.getElementById("userEmail");
const userRoleBadge = document.getElementById("userRoleBadge");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");
const adminActions = document.getElementById("adminActions");
const csvUpload = document.getElementById("csvUpload");
const importCsvBtn = document.getElementById("importCsv");
const showChartBtn = document.getElementById("showChart");
const addTeacherBtn = document.getElementById("addTeacher");
const exportExcelBtn = document.getElementById("exportExcel");
const createUserBtn = document.getElementById("createUser");
const chartModal = new bootstrap.Modal(document.getElementById('chartModal'));
const teacherFormModal = new bootstrap.Modal(document.getElementById('teacherForm'));

let chartInstance = null;
let currentUser = null;

// Observador de estado de autenticación
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (loginSection) loginSection.style.display = "block";
        if (appContent) appContent.style.display = "none";
        currentUser = null;
        return;
    }

    currentUser = user;
    const userRef = doc(db, "usuarios", user.uid);
    const userSnap = await getDoc(userRef);
    
    // Verificación mejorada de roles
    if (userSnap.exists()) {
        window.userRole = userSnap.data().role || "lectura";
    } else {
        window.userRole = "lectura";
        await setDoc(userRef, {
            email: user.email,
            role: "lectura",
            createdAt: new Date().toISOString()
        });
    }

    // Actualizar UI
    if (loginSection) loginSection.style.display = "none";
    if (appContent) appContent.style.display = "block";
    if (userEmailSpan) userEmailSpan.textContent = user.email;
    
    if (userRoleBadge) {
        userRoleBadge.textContent = window.userRole;
        userRoleBadge.className = window.userRole === 'admin' ? 'badge bg-danger' : 'badge bg-primary';
    }
    
    setUIForRole(window.userRole);
    initializeApp();
});

// Configurar UI según el rol
function setUIForRole(role) {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.style.display = role === 'admin' ? 'block' : 'none';
    });
}

// Verificar permisos de admin
function verifyAdminAccess() {
    if (window.userRole !== 'admin') {
        alert('❌ Acción restringida: Se requieren privilegios de administrador');
        return false;
    }
    return true;
}

// Manejo de autenticación
loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        if (loginError) loginError.style.display = "none";
    } catch (error) {
        if (loginError) {
            loginError.innerText = "Error de autenticación: " + handleFirebaseError(error);
            loginError.style.display = "block";
        }
    }
});

logoutBtn?.addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.reload();
    }).catch(handleFirebaseError);
});

// Inicialización de la aplicación
function initializeApp() {
    const form = document.getElementById('form');
    const searchInput = document.getElementById('searchInput');

    // Configurar select de género en el formulario
    const genderSelect = document.querySelector('[name="genero"]');
    if (genderSelect) {
        genderSelect.innerHTML = `
            <option value="">Seleccione...</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Otro">Otro</option>
            <option value="Prefiero no decir">Prefiero no decir</option>
        `;
    }

    // Configurar botón de agregar profesor
    addTeacherBtn?.addEventListener('click', () => {
        if (!verifyAdminAccess()) return;
        
        document.getElementById('formTitle').textContent = 'Nuevo Profesor';
        document.getElementById('teacherId').value = '';
        form.reset();
        teacherFormModal.show();
    });

    form?.addEventListener('submit', handleFormSubmit);
    searchInput?.addEventListener('input', (e) => loadTeachers(e.target.value));
    showChartBtn?.addEventListener('click', () => chartModal.show());
    
    loadTeachers();
}

// Manejar envío del formulario de profesor
async function handleFormSubmit(e) {
    e.preventDefault();
    if (!verifyAdminAccess()) return;

    const form = e.target;
    const teacherId = document.getElementById('teacherId').value;
    const formData = new FormData(form);
    
    // Validación de CURP flexible
    const curp = formData.get('curp');
    if (!/^[A-Z]{4}[0-9]{6}[A-Z]{6}[0-9A-Z]{2}$/.test(curp)) {
        alert('❌ El CURP debe tener 18 caracteres alfanuméricos (4 letras + 6 números + 6 letras + 2 caracteres)');
        return;
    }

    const teacherData = {
        nombre: formData.get('nombre'),
        apellido_paterno: formData.get('apellido_paterno'),
        apellido_materno: formData.get('apellido_materno'),
        genero: formData.get('genero'),
        curp: curp,
        direccion: formData.get('direccion'),
        edad: parseInt(formData.get('edad')) || 0,
        rfc: formData.get('rfc'),
        grado_estudios: formData.get('grado_estudios'),
        antiguedad: parseInt(formData.get('antiguedad')) || 0,
        fecha_creacion: new Date().toISOString(),
        creado_por: currentUser?.email || 'admin'
    };

    try {
        if (teacherId) {
            await updateDoc(doc(db, 'profesores', teacherId), teacherData);
        } else {
            await addDoc(collection(db, 'profesores'), teacherData);
        }
        
        form.reset();
        teacherFormModal.hide();
        loadTeachers();
    } catch (error) {
        alert("❌ Error al guardar profesor: " + handleFirebaseError(error));
    }
}

// Cargar profesores desde Firebase
async function loadTeachers(searchTerm = '') {
    try {
        const teachersList = document.getElementById("teachersList");
        teachersList.innerHTML = `
            <div class="d-flex justify-content-center my-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
            </div>
        `;

        let querySnapshot;
        if (searchTerm) {
            const q = query(
                collection(db, 'profesores'),
                where('nombre', '>=', searchTerm),
                where('nombre', '<=', searchTerm + '\uf8ff')
            );
            querySnapshot = await getDocs(q);
        } else {
            querySnapshot = await getDocs(collection(db, 'profesores'));
        }

        renderTeachersTable(querySnapshot);
        updateCharts(querySnapshot.docs.map(doc => doc.data()));
    } catch (error) {
        console.error("Error al cargar profesores:", error);
        document.getElementById("teachersList").innerHTML = `
            <div class="alert alert-danger">
                Error al cargar profesores: ${handleFirebaseError(error)}
            </div>
        `;
    }
}

// formato tabla 

function renderTeachersTable(querySnapshot) {
    const teachersList = document.getElementById('teachersList');
    
    if (querySnapshot.empty) {
        teachersList.innerHTML = `
            <div class="alert alert-info">
                No se encontraron profesores registrados
            </div>
        `;
        return;
    }

    teachersList.innerHTML = `
        <div class="table-responsive">
            <table class="table table-striped table-hover align-middle">
                <thead class="table-dark">
                    <tr>
                        <th>Nombre</th>
                        <th>Apellidos</th>
                        <th>Género</th>
                        <th>Edad</th>
                        <th>CURP</th>
                        <th>RFC</th>
                        <th>Grado Estudios</th>
                        <th>Antigüedad</th>
                        ${window.userRole === 'admin' ? '<th class="text-center">Acciones</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${querySnapshot.docs.map(doc => {
                        const t = doc.data();
                        return `
                            <tr>
                                <td>${t.nombre}</td>
                                <td>${t.apellido_paterno} ${t.apellido_materno}</td>
                                <td>${t.genero || 'No especificado'}</td>
                                <td>${t.edad}</td>
                                <td>${t.curp}</td>
                                <td>${t.rfc || 'No especificado'}</td>
                                <td>${t.grado_estudios}</td>
                                <td>${t.antiguedad} años</td>
                                ${window.userRole === 'admin' ? `
                                <td class="text-center">
                                    <div class="d-flex justify-content-center gap-2">
                                        <button class="btn btn-sm btn-primary edit-btn" data-id="${doc.id}" title="Editar">
                                            <i class="bi bi-pencil-fill"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger delete-btn" data-id="${doc.id}" title="Eliminar">
                                            <i class="bi bi-trash-fill"></i>
                                        </button>
                                    </div>
                                </td>
                                ` : ''}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    
}



// Editar profesor
async function editTeacher(id) {
    if (!verifyAdminAccess()) return;
    
    const docRef = doc(db, 'profesores', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const teacher = docSnap.data();
        document.getElementById('formTitle').textContent = 'Editar Profesor';
        document.getElementById('teacherId').value = id;
        
        // Llenar formulario
        Object.keys(teacher).forEach(key => {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) input.value = teacher[key];
        });

        teacherFormModal.show();
    }
}

// Eliminar profesor
async function deleteTeacher(id) {
    if (!verifyAdminAccess() || !confirm('¿Estás seguro de eliminar este profesor permanentemente?')) return;
    
    try {
        await deleteDoc(doc(db, 'profesores', id));
        loadTeachers();
    } catch (error) {
        alert("❌ Error al eliminar: " + handleFirebaseError(error));
    }
}

// Importar CSV
importCsvBtn?.addEventListener('click', async () => {
    if (!verifyAdminAccess()) return;
    
    const file = csvUpload.files[0];
    if (!file) {
        alert('⚠ Seleccione un archivo CSV primero');
        return;
    }

    try {
        const teachers = await parseCSV(file);
        await importTeachers(teachers);
        alert(`✅ ${teachers.length} profesores importados correctamente`);
        loadTeachers();
    } catch (error) {
        alert("❌ Error al importar: " + error.message);
    }
});

// Procesar CSV
async function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const lines = content.split('\n').filter(line => line.trim());
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, '_'));
                
                const requiredFields = ['nombre', 'apellido_paterno', 'genero', 'curp', 'rfc','edad', 'grado_estudios', 'antiguedad'];
                const missingFields = requiredFields.filter(f => !headers.includes(f));
                
                if (missingFields.length > 0) {
                    throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
                }

                const teachers = [];
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    
                    const values = lines[i].split(',');
                    const teacher = {};
                    headers.forEach((header, index) => {
                        teacher[header] = values[index]?.trim() || '';
                    });
                    
                    // Validaciones básicas
                    if (!teacher.nombre || !teacher.apellido_paterno || !teacher.curp) {
                        continue;
                    }
                    
                    // Convertir campos numéricos
                    teacher.edad = parseInt(teacher.edad) || 0;
                    teacher.antiguedad = parseInt(teacher.antiguedad) || 0;
                    teacher.fecha_creacion = new Date().toISOString();
                    teacher.creado_por = currentUser?.email || 'csv-import';
                    
                    teachers.push(teacher);
                }
                
                if (teachers.length === 0) {
                    throw new Error('El CSV no contiene datos válidos');
                }
                
                resolve(teachers);
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsText(file);
    });
}

// Importar profesores a Firestore
async function importTeachers(teachers) {
    const batch = [];
    for (const teacher of teachers) {
        batch.push(addDoc(collection(db, 'profesores'), teacher));
    }
    await Promise.all(batch);
}

// Exportar a Excel
exportExcelBtn?.addEventListener('click', async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'profesores'));
        const teachers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (teachers.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(teachers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Profesores");
        XLSX.writeFile(wb, `profesores_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
        alert("❌ Error al exportar: " + handleFirebaseError(error));
    }
});

// Crear usuario nuevo (solo admin)
createUserBtn?.addEventListener('click', async () => {
    if (!verifyAdminAccess()) return;
    
    const email = prompt("Email del nuevo usuario:");
    if (!email) return;
    
    const password = prompt("Contraseña (mínimo 6 caracteres):");
    if (!password || password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    const role = prompt("Rol (admin/lectura):").toLowerCase();
    if (!['admin', 'lectura'].includes(role)) {
        alert('Rol inválido. Debe ser "admin" o "lectura"');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "usuarios", userCredential.user.uid), { 
            email, 
            role,
            creado_por: currentUser.email,
            fecha_creacion: new Date().toISOString()
        });
        alert('✅ Usuario creado correctamente');
    } catch (error) {
        alert('❌ Error al crear usuario: ' + handleFirebaseError(error));
    }
});

// Actualizar gráficas
function updateCharts(teachersData) {
    if (typeof renderCharts === 'function') {
        renderCharts(teachersData);
    }
}