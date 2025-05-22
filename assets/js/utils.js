// Importar CSV
document.getElementById('importCsv').addEventListener('click', () => {
    document.getElementById('csvInput').click();
});

document.getElementById('csvInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const teacherData = {};
            
            headers.forEach((header, index) => {
                teacherData[header] = values[index] ? values[index].trim() : '';
            });
            
            await db.collection('profesores').add(teacherData);
        }
        
        alert(`${lines.length - 1} profesores importados correctamente`);
        loadTeachers();
    } catch (error) {
        alert('Error al importar CSV: ' + error.message);
        console.error(error);
    }
});

// Exportar a Excel
document.getElementById('exportExcel').addEventListener('click', async () => {
    try {
        const snapshot = await db.collection('profesores').get();
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Encabezados
        const headers = ["Nombre", "Apellido", "Email", "Teléfono", "Departamento"];
        csvContent += headers.join(',') + "\n";
        
        // Datos
        snapshot.forEach(doc => {
            const teacher = doc.data();
            const row = headers.map(header => {
                const key = header.toLowerCase();
                return teacher[key] || '';
            });
            csvContent += row.join(',') + "\n";
        });
        
        // Descargar
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "profesores_exportados.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        handleFirebaseError(error);
    }
});