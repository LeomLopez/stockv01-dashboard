/**
 * Script para la página de Stock
 * Maneja filtros, fetch de API y actualización dinámica de tabla
 */

class StockManager {
    constructor() {
        this.currentPage = 0;
        this.limit = 10;
        this.totalRecords = 0;
        this.currentFilters = {};
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadStock();
    }
    
    /**
     * Inicializar referencias a elementos DOM
     */
    initializeElements() {
        // Filtros
        this.grupoFilter = document.getElementById('grupoFilter');
        this.productoFilter = document.getElementById('productoFilter');
        this.contenedorFilter = document.getElementById('contenedorFilter');
        
        // Botones
        this.filterBtn = document.getElementById('filterBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        
        // Tabla
        this.stockTableBody = document.getElementById('stockTableBody');
        
        // Indicadores
        this.totalCount = document.getElementById('totalCount');
        this.shownCount = document.getElementById('shownCount');
        this.lowStockCount = document.getElementById('lowStockCount');
        this.noStockCount = document.getElementById('noStockCount');
        
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
        this.prevBtn.addEventListener('click', () => this.previousPage());
        this.nextBtn.addEventListener('click', () => this.nextPage());
        
        // Permitir Enter en input de producto
        this.productoFilter.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.onFilterClick();
            }
        });
    }
    
    /**
     * Construir parámetros de filtro
     */
    buildFilterParams() {
        const params = new URLSearchParams();
        
        const grupo = this.grupoFilter.value.trim();
        const producto = this.productoFilter.value.trim();
        const contenedor = this.contenedorFilter.value.trim();
        
        if (grupo) params.append('grupo', grupo);
        if (producto) params.append('producto', producto);
        if (contenedor) params.append('contenedor', contenedor);
        // Pedir siempre raw=true para mostrar exactamente lo que hay en la base de datos
        params.append('raw', 'true');
        params.append('limit', this.limit);
        params.append('offset', this.currentPage * this.limit);
        
        return params.toString();
    }
    
    /**
     * Cargar datos de stock desde API
     */
    async loadStock() {
        try {
            this.showLoading();
            this.hideError();
            this.hideNoResults();
            
            const params = this.buildFilterParams();
            const response = await fetch(`/api/stock?${params}`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Error al cargar stock');
            }
            
            this.totalRecords = data.pagination.total;
            this.renderStock(data.data);
            this.updateIndicators(data.data);
            this.updatePagination();
            
            if (data.data.length === 0) {
                this.showNoResults();
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
            this.stockTableBody.innerHTML = '';
            this.updateIndicators([]);
        }
    }
    
    /**
     * Renderizar tabla de stock
     */
    renderStock(items) {
        if (items.length === 0) {
            this.stockTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Sin datos</td></tr>';
            return;
        }
        
        this.stockTableBody.innerHTML = items.map(item => {
            const rowClass = item.cantidad <= 0 ? 'bg-danger-light' : '';
            const contenedor = item.grupo === 'CON' ? item.contenedor : 'N/A';
            const cantidad = item.cantidad;
            const cantidadClass = cantidad <= 0 ? 'text-danger fw-bold' : cantidad < 10 ? 'text-warning fw-bold' : '';
            
            const fecha = new Date(item.fecha_producto).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            return `
                <tr class="${rowClass}">
                    <td>
                        <span class="badge bg-info">${this.escapeHtml(item.grupo)}</span>
                    </td>
                    <td>${this.escapeHtml(item.producto)}</td>
                    <td class="text-end">
                        <span class="${cantidadClass}">${cantidad}</span>
                        ${cantidad <= 0 ? '<span class="badge bg-danger ms-2">SIN STOCK</span>' : ''}
                    </td>
                    <td>
                        <code>${this.escapeHtml(contenedor)}</code>
                    </td>
                    <td>
                        <small class="text-muted">${fecha}</small>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * Actualizar indicadores
     */
    updateIndicators(items) {
        const lowStock = items.filter(i => i.cantidad > 0 && i.cantidad < 10).length;
        const noStock = items.filter(i => i.cantidad <= 0).length;
        
        this.totalCount.textContent = this.totalRecords;
        this.shownCount.textContent = items.length;
        this.lowStockCount.textContent = lowStock;
        this.noStockCount.textContent = noStock;
    }
    
    /**
     * Actualizar controles de paginación
     */
    updatePagination() {
        const totalPages = Math.ceil(this.totalRecords / this.limit);
        const currentPage = this.currentPage + 1;
        
        this.paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        this.prevBtn.disabled = this.currentPage === 0;
        this.nextBtn.disabled = this.currentPage >= totalPages - 1;
    }
    
    /**
     * Cuando se hace click en filtrar
     */
    onFilterClick() {
        this.currentPage = 0;
        this.loadStock();
    }
    
    /**
     * Página anterior
     */
    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.loadStock();
        }
    }
    
    /**
     * Página siguiente
     */
    nextPage() {
        const totalPages = Math.ceil(this.totalRecords / this.limit);
        if (this.currentPage < totalPages - 1) {
            this.currentPage++;
            this.loadStock();
        }
    }
    
    /**
     * Mostrar indicador de carga
     */
    showLoading() {
        this.stockTableBody.innerHTML = `
            <tr class="text-center">
                <td colspan="5" class="py-4">
                    <div class="spinner-border text-primary" role="status">
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
    new StockManager();
});
