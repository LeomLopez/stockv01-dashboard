/**
 * Script para la página de Movimientos
 * Maneja filtros, fetch de API y actualización dinámica de tabla
 */

class MovimientosManager {
    constructor() {
        this.currentPage = 0;
        this.limit = 10;
        this.totalRecords = 0;
        
        this.tipoColors = {
            'entrada': 'success',
            'saida': 'danger',
            'descarte': 'warning',
            'ajuste': 'primary'
        };
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadMovimientos();
    }
    
    /**
     * Inicializar referencias a elementos DOM
     */
    initializeElements() {
        // Filtros
        this.fechaDesdeFilter = document.getElementById('fechaDesdeFilter');
        this.fechaHastaFilter = document.getElementById('fechaHastaFilter');
        this.tipoFilter = document.getElementById('tipoFilter');
        this.grupoFilter = document.getElementById('grupoFilter');
        
        // Botones
        this.filterBtn = document.getElementById('filterBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        
        // Tabla
        this.movimientosTableBody = document.getElementById('movimientosTableBody');
        
        // Indicadores
        this.totalCount = document.getElementById('totalCount');
        this.entradaCount = document.getElementById('entradaCount');
        this.saidaCount = document.getElementById('saidaCount');
        this.descarteCount = document.getElementById('descarteCount');
        this.ajusteCount = document.getElementById('ajusteCount');
        this.shownCount = document.getElementById('shownCount');
        
        // Alertas
        this.errorAlert = document.getElementById('errorAlert');
        this.errorMessage = document.getElementById('errorMessage');
        this.noResultsAlert = document.getElementById('noResultsAlert');
        
        // Paginación
        this.paginationInfo = document.getElementById('paginationInfo');
    }
    
    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        this.filterBtn.addEventListener('click', () => this.onFilterClick());
        this.resetBtn.addEventListener('click', () => this.onResetClick());
        this.prevBtn.addEventListener('click', () => this.previousPage());
        this.nextBtn.addEventListener('click', () => this.nextPage());
    }
    
    /**
     * Construir parámetros de filtro
     */
    buildFilterParams() {
        const params = new URLSearchParams();
        
        const fechaDesde = this.fechaDesdeFilter.value;
        const fechaHasta = this.fechaHastaFilter.value;
        const tipo = this.tipoFilter.value.trim();
        const grupo = this.grupoFilter.value.trim();
        
        if (fechaDesde) params.append('fecha_desde', fechaDesde);
        if (fechaHasta) params.append('fecha_hasta', fechaHasta);
        if (tipo) params.append('tipo', tipo);
        if (grupo) params.append('grupo', grupo);
        
        params.append('limit', this.limit);
        params.append('offset', this.currentPage * this.limit);
        
        return params.toString();
    }
    
    /**
     * Cargar datos de movimientos desde API
     */
    async loadMovimientos() {
        try {
            this.showLoading();
            this.hideError();
            this.hideNoResults();
            
            const params = this.buildFilterParams();
            const response = await fetch(`/api/movimientos?${params}`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Error al cargar movimientos');
            }
            
            this.totalRecords = data.pagination.total;
            this.renderMovimientos(data.data);
            this.updateIndicators(data.data);
            this.updatePagination();
            
            if (data.data.length === 0) {
                this.showNoResults();
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
            this.movimientosTableBody.innerHTML = '';
            this.updateIndicators([]);
        }
    }
    
    /**
     * Renderizar tabla de movimientos
     */
    renderMovimientos(items) {
        if (items.length === 0) {
            this.movimientosTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Sin datos</td></tr>';
            return;
        }
        
        this.movimientosTableBody.innerHTML = items.map(item => {
            const fecha = new Date(item.fecha).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const tipoColor = this.tipoColors[item.tipo] || 'secondary';
            const cantidadClass = item.cantidad < 0 ? 'text-danger' : 'text-success';
            const cantidadSign = item.cantidad < 0 ? '' : '+';
            
            return `
                <tr>
                    <td>
                        <small class="text-muted">${fecha}</small>
                    </td>
                    <td>
                        <span class="badge bg-${tipoColor}">${this.escapeHtml(item.tipo.toUpperCase())}</span>
                    </td>
                    <td>
                        <span class="badge bg-light text-dark">${this.escapeHtml(item.grupo)}</span>
                    </td>
                    <td>${this.escapeHtml(item.producto)}</td>
                    <td class="text-end">
                        <strong class="${cantidadClass}">${cantidadSign}${item.cantidad}</strong>
                    </td>
                    <td>
                        <small>${this.escapeHtml(item.descripcion || '-')}</small>
                    </td>
                    <td>
                        <small class="text-muted">${this.escapeHtml(item.usuario || 'Sistema')}</small>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * Actualizar indicadores
     */
    updateIndicators(items) {
        const entradas = items.filter(i => i.tipo === 'entrada').length;
        const saidas = items.filter(i => i.tipo === 'saida').length;
        const descartes = items.filter(i => i.tipo === 'descarte').length;
        const ajustes = items.filter(i => i.tipo === 'ajuste').length;
        
        this.totalCount.textContent = this.totalRecords;
        this.entradaCount.textContent = entradas;
        this.saidaCount.textContent = saidas;
        this.descarteCount.textContent = descartes;
        this.ajusteCount.textContent = ajustes;
        this.shownCount.textContent = items.length;
    }
    
    /**
     * Actualizar controles de paginación
     */
    updatePagination() {
        const totalPages = Math.ceil(this.totalRecords / this.limit);
        const currentPage = this.currentPage + 1;
        
        this.paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        this.prevBtn.disabled = this.currentPage === 0;
        this.nextBtn.disabled = this.currentPage >= totalPages - 1 || totalPages === 0;
    }
    
    /**
     * Cuando se hace click en filtrar
     */
    onFilterClick() {
        this.currentPage = 0;
        this.loadMovimientos();
    }
    
    /**
     * Limpiar filtros
     */
    onResetClick() {
        this.fechaDesdeFilter.value = '';
        this.fechaHastaFilter.value = '';
        this.tipoFilter.value = '';
        this.grupoFilter.value = '';
        this.currentPage = 0;
        this.loadMovimientos();
    }
    
    /**
     * Página anterior
     */
    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.loadMovimientos();
        }
    }
    
    /**
     * Página siguiente
     */
    nextPage() {
        const totalPages = Math.ceil(this.totalRecords / this.limit);
        if (this.currentPage < totalPages - 1) {
            this.currentPage++;
            this.loadMovimientos();
        }
    }
    
    /**
     * Mostrar indicador de carga
     */
    showLoading() {
        this.movimientosTableBody.innerHTML = `
            <tr class="text-center">
                <td colspan="7" class="py-4">
                    <div class="spinner-border text-info" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                </td>
            </tr>
        `;
    }
    
    /**
     * Mostrar error
     */
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorAlert.classList.remove('d-none');
        
        setTimeout(() => {
            this.errorAlert.classList.add('d-none');
        }, 5000);
    }
    
    /**
     * Ocultar error
     */
    hideError() {
        this.errorAlert.classList.add('d-none');
    }
    
    /**
     * Mostrar "sin resultados"
     */
    showNoResults() {
        this.noResultsAlert.classList.remove('d-none');
    }
    
    /**
     * Ocultar "sin resultados"
     */
    hideNoResults() {
        this.noResultsAlert.classList.add('d-none');
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
 * Inicializar cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', () => {
    new MovimientosManager();
});
