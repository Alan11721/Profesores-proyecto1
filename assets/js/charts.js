import { db, handleFirebaseError } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

let currentChart = null;
let teachersData = [];

// Configuración de gráficas disponibles
const chartConfigs = {
    age: {
        title: 'Edad Promedio',
        type: 'bar',
        getData: () => {
            const ageData = teachersData.map(t => t.edad || 0);
            const avg = ageData.reduce((a, b) => a + b, 0) / ageData.length;
            return {
                labels: ['Edad Promedio'],
                datasets: [{
                    label: 'Años',
                    data: [avg],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)'
                }]
            };
        }
    },
    gender: {
        title: 'Distribución por Género',
        type: 'pie',
        getData: () => {
            const genderData = teachersData.reduce((acc, t) => {
                const key = t.genero || 'No especificado';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            
            return {
                labels: Object.keys(genderData),
                datasets: [{
                    data: Object.values(genderData),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)'
                    ]
                }]
            };
        }
    },
    studies: {
        title: 'Grado de Estudios',
        type: 'doughnut',
        getData: () => {
            const studiesData = teachersData.reduce((acc, t) => {
                const key = t.grado_estudios || 'No especificado';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            
            return {
                labels: Object.keys(studiesData),
                datasets: [{
                    data: Object.values(studiesData),
                    backgroundColor: [
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 99, 132, 0.7)'
                    ]
                }]
            };
        }
    },
    antiquity: {
        title: 'Antigüedad',
        type: 'line',
        getData: () => {
            return {
                labels: teachersData.map((_, i) => `Prof. ${i+1}`),
                datasets: [{
                    label: 'Años de antigüedad',
                    data: teachersData.map(t => t.antiguedad || 0),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true
                }]
            };
        }
    }
};

// Renderizar gráfica seleccionada
export function renderCharts(data) {
    teachersData = data;
    
    // Inicializar el selector de gráficas
    initChartSelector();
    
    // Mostrar la primera gráfica por defecto
    if (teachersData.length > 0) {
        renderChart('age');
    }
}

function initChartSelector() {
    const selector = document.getElementById('chartSelector');
    if (!selector) return;
    
    selector.innerHTML = Object.keys(chartConfigs).map(key => `
        <option value="${key}">${chartConfigs[key].title}</option>
    `).join('');
    
    selector.addEventListener('change', (e) => {
        renderChart(e.target.value);
    });
}

function renderChart(chartType) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const config = chartConfigs[chartType];
    
    // Destruir gráfica anterior si existe
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Actualizar título
    document.getElementById('chartTitle').textContent = config.title;
    
    // Crear nueva gráfica
    currentChart = new Chart(ctx, {
        type: config.type,
        data: config.getData(),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: config.title,
                    font: { size: 18 }
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Cargar datos iniciales
if (document.getElementById('mainChart')) {
    (async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'profesores'));
            renderCharts(querySnapshot.docs.map(doc => doc.data()));
        } catch (error) {
            console.error("Error al cargar datos:", error);
        }
    })();
}