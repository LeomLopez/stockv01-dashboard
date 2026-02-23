// Script principal de la aplicación

document.addEventListener('DOMContentLoaded', function() {
    // Auto-cerrar alerts después de 5 segundos
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
    
    // Validaciones de formulario
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
    
    // Inicializar Dark Mode
    initializeDarkMode();
});

/**
 * Inicializar y manejar Dark Mode
 */
function initializeDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const html = document.documentElement;
    const body = document.body;
    
    // Cargar preferencia guardada o usar preferencia del sistema
    const savedDarkMode = localStorage.getItem('darkMode');
    let isDarkMode = false;
    
    if (savedDarkMode !== null) {
        isDarkMode = savedDarkMode === 'true';
    } else {
        // Usar preferencia del sistema
        isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Aplicar modo inicial
    if (isDarkMode) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
    
    // Event listener para el botón
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            isDarkMode = body.classList.contains('dark-mode');
            
            if (isDarkMode) {
                disableDarkMode();
            } else {
                enableDarkMode();
            }
        });
    }
}

/**
 * Habilitar Dark Mode
 */
function enableDarkMode() {
    const body = document.body;
    const html = document.documentElement;
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'true');
    
    if (darkModeToggle) {
        darkModeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
        darkModeToggle.title = 'Cambiar a modo claro';
    }
}

/**
 * Deshabilitar Dark Mode
 */
function disableDarkMode() {
    const body = document.body;
    const html = document.documentElement;
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'false');
    
    if (darkModeToggle) {
        darkModeToggle.innerHTML = '<i class="bi bi-moon-stars"></i>';
        darkModeToggle.title = 'Cambiar a modo oscuro';
    }
}

// Función para confirmar eliminación
function confirmDelete(productName) {
    return confirm(`¿Estás seguro de que quieres eliminar "${productName}"?`);
}
