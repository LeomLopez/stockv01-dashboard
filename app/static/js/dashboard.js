/**
 * Script do Dashboard
 * Carrega estatísticas e alertas do inventário
 */

class Dashboard {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.loadDashboard();
    }
    
    /**
     * Inicializar referências a elementos DOM
     */
    initializeElements() {
        this.statsCards = document.getElementById('statsCards');
        this.alertsSection = document.getElementById('alertsSection');
        this.movimentosResumo = document.getElementById('movimentosResumo');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.errorAlert = document.getElementById('errorAlert');
        this.errorMessage = document.getElementById('errorMessage');
    }
    
    /**
     * Adicionar event listeners
     */
    attachEventListeners() {
        this.refreshBtn.addEventListener('click', () => this.loadDashboard());
    }
    
    /**
     * Carregar todos os dados do dashboard
     */
    async loadDashboard() {
        try {
            this.hideError();

            // Carregar primeiro o essencial (stats + alertas)
            const statsData = await this.fetchStats();
            this.renderStats(statsData);
            this.renderAlerts(statsData);

            // Carregar resumo de movimentos depois (carga diferida)
            this.loadMovementsDeferred();
        } catch (error) {
            console.error('Erro:', error);
            this.showError(error.message);
        }
    }

    loadMovementsDeferred() {
        const run = async () => {
            try {
                const movimentosData = await this.fetchMovimientos();
                this.renderMovimientos(movimentosData);
            } catch (error) {
                console.error('Erro ao carregar resumo de movimentos:', error);
                if (this.movimentosResumo) {
                    this.movimentosResumo.innerHTML = `
                        <div class="alert alert-warning mb-0">
                            Não foi possível carregar o resumo de movimentações.
                        </div>
                    `;
                }
            }
        };

        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => run(), { timeout: 1000 });
        } else {
            setTimeout(run, 0);
        }
    }
    
    /**
     * Obter estatísticas da API
     */
    async fetchStats() {
        const response = await fetch('/api/dashboard/stats');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Erro ao carregar estatísticas');
        }
        
        return data;
    }
    
    /**
     * Obter movimentos recentes da API
     */
    async fetchMovimientos() {
        const response = await fetch('/api/dashboard/movimientos-recientes');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Erro ao carregar movimentos');
        }
        
        return data;
    }
    
    /**
     * Renderizar cards de estatísticas
     */
    renderStats(data) {
        const stats = data.stats;
        
        const html = `
            <div class="col-md-3 mb-3">
                <div class="card border-primary shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="card-title text-muted">📦 Total em Estoque</h6>
                        <h2 class="mb-0 text-primary">${stats.total_stock}</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card border-info shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="card-title text-muted">❄️ Congelados</h6>
                        <h2 class="mb-0 text-info">${stats.congelados}</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card border-success shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="card-title text-muted">🥗 Hortifruti</h6>
                        <h2 class="mb-0 text-success">${stats.hortifruti}</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card border-warning shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="card-title text-muted">🌾 Secos</h6>
                        <h2 class="mb-0 text-warning">${stats.secos}</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card border-danger shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="card-title text-muted">🍎 Frutais</h6>
                        <h2 class="mb-0 text-danger">${stats.frutales}</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card border-secondary shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="card-title text-muted">🥛 Laticínios</h6>
                        <h2 class="mb-0 text-secondary">${stats.lacteos}</h2>
                    </div>
                </div>
            </div>
        `;
        
        this.statsCards.innerHTML = html;
    }
    
    /**
     * Renderizar alertas
     */
    renderAlerts(data) {
        const alerts = data.alerts;
        let alertsHtml = '';
        
        // Alerta de vencidos
        if (alerts.vencidos > 0) {
            alertsHtml += this.renderAlertCard(
                '🚨 PRODUTOS VENCIDOS',
                `${alerts.vencidos} produto(s) vencido(s)`,
                alerts.vencidos_lista,
                'danger'
            );
        }
        
        // Alerta: vencem em 3 dias
        if (alerts.vencen_3_dias > 0) {
            alertsHtml += this.renderAlertCard(
                '⚠️ VENCEM EM 3 DIAS',
                `${alerts.vencen_3_dias} produto(s) próximos de vencer`,
                alerts.vencen_3_dias_lista,
                'warning'
            );
        }
        
        // Alerta: vencem em 7 dias
        if (alerts.vencen_7_dias > 0) {
            alertsHtml += this.renderAlertCard(
                '⏰ VENCEM EM 7 DIAS',
                `${alerts.vencen_7_dias} produto(s) próximos de vencer`,
                alerts.vencen_7_dias_lista,
                'info'
            );
        }
        
        // Se não houver alertas
        if (alertsHtml === '') {
            alertsHtml = `
                <div class="col-md-12 mb-3">
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        <strong>✅ Excelente!</strong> Não há produtos vencidos ou próximos de vencer.
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                </div>
            `;
        }
        
        this.alertsSection.innerHTML = alertsHtml;
    }
    
    /**
     * Renderizar um card de alerta
     */
    renderAlertCard(titulo, subtitulo, productos, tipo) {
        const borderClass = `border-${tipo}`;
        
        const productosHtml = productos.map(p => `
            <div class="alert alert-${tipo} mb-2 py-2 px-3">
                <strong>${this.escapeHtml(p.nombre)}</strong>
                <br>
                <small>Grupo: ${this.escapeHtml(p.grupo)} | Quantidade: ${p.cantidad}</small>
            </div>
        `).join('');
        
        return `
            <div class="col-md-12 mb-3">
                <div class="card ${borderClass} shadow-sm">
                    <div class="card-header bg-${tipo} text-white">
                        <h5 class="mb-0">${titulo}</h5>
                    </div>
                    <div class="card-body">
                        <p class="text-muted mb-3">${subtitulo}</p>
                        ${productosHtml}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Renderizar últimos movimentos
     */
    renderMovimientos(data) {
        if (!data.data || data.data.length === 0) {
            this.movimentosResumo.innerHTML = '<div class="text-center py-3 text-muted">Sem movimentações recentes.</div>';
            return;
        }

        const items = data.data.slice(0, 5);

        this.movimentosResumo.innerHTML = items.map(mov => {
            const fecha = new Date(mov.fecha).toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const tipoColor = this.getTipoColor(mov.tipo);
            const quantidadeClass = mov.cantidad < 0 ? 'text-danger' : 'text-success';
            const sinal = mov.cantidad < 0 ? '' : '+';
            
            return `
                <div class="d-flex justify-content-between align-items-center border rounded px-3 py-2 mb-2">
                    <div class="me-3">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="badge bg-${tipoColor}">${this.escapeHtml(mov.tipo.toUpperCase())}</span>
                            <span class="badge bg-light text-dark">${this.escapeHtml(mov.grupo)}</span>
                        </div>
                        <div><strong>${this.escapeHtml(mov.producto)}</strong></div>
                        <small class="text-muted">${fecha}</small>
                    </div>
                    <div class="text-end">
                        <strong class="${quantidadeClass}">${sinal}${mov.cantidad}</strong>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Obter cor por tipo de movimento
     */
    getTipoColor(tipo) {
        const colors = {
            'entrada': 'success',
            'saida': 'danger',
            'descarte': 'warning',
            'ajuste': 'primary'
        };
        return colors[tipo] || 'secondary';
    }
    
    /**
     * Mostrar erro
     */
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorAlert.classList.remove('d-none');
        
        setTimeout(() => {
            this.errorAlert.classList.add('d-none');
        }, 5000);
    }
    
    /**
     * Ocultar erro
     */
    hideError() {
        this.errorAlert.classList.add('d-none');
    }
    
    /**
     * Escapar HTML para evitar XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Inicializar quando o DOM estiver pronto
 */
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
