// Script principal da aplicação

document.addEventListener('DOMContentLoaded', function () {
    // Auto-fechar alerts depois de 5 segundos
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });

    // Validações de formulário
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function (e) {
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
 * Inicializar e gerenciar Dark Mode
 */
function initializeDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    // Carregar preferência salva ou usar preferência do sistema
    const savedDarkMode = localStorage.getItem('darkMode');
    let isDarkMode = false;

    if (savedDarkMode !== null) {
        isDarkMode = savedDarkMode === 'true';
    } else {
        // Usar preferência do sistema
        isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Aplicar modo inicial
    if (isDarkMode) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }

    // Event listener do botão
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function (e) {
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
 * Ativar Dark Mode
 */
function enableDarkMode() {
    const body = document.body;
    const darkModeToggle = document.getElementById('darkModeToggle');

    body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'true');

    if (darkModeToggle) {
        darkModeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
        darkModeToggle.title = 'Mudar para modo claro';
    }
}

/**
 * Desativar Dark Mode
 */
function disableDarkMode() {
    const body = document.body;
    const darkModeToggle = document.getElementById('darkModeToggle');

    body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'false');

    if (darkModeToggle) {
        darkModeToggle.innerHTML = '<i class="bi bi-moon-stars"></i>';
        darkModeToggle.title = 'Mudar para modo escuro';
    }
}

// Função para confirmar exclusão
function confirmDelete(productName) {
    return confirm(`Tem certeza que deseja excluir "${productName}"?`);
}
