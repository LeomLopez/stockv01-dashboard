/**
 * Script para a pagina de Estoque
 * Carrega dados sob demanda (apos o usuario selecionar um grupo)
 */

class StockManager {
    constructor() {
        this.currentPage = 0;
        this.limit = 10;
        this.totalRecords = 0;
        this.hasLoaded = false;

        this.initializeElements();
        this.attachEventListeners();
        this.renderInitialState();
    }

    initializeElements() {
        // Filtros
        this.grupoFilter = document.getElementById('grupoFilter');
        this.productoFilter = document.getElementById('productoFilter');
        this.contenedorFilter = document.getElementById('contenedorFilter');

        // Botoes
        this.filterBtn = document.getElementById('filterBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');

        // Tabela
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

        // Paginacao
        this.paginationInfo = document.getElementById('paginationInfo');
    }

    attachEventListeners() {
        this.filterBtn.addEventListener('click', () => this.onFilterClick());
        this.prevBtn.addEventListener('click', () => this.previousPage());
        this.nextBtn.addEventListener('click', () => this.nextPage());

        this.productoFilter.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.onFilterClick();
            }
        });
    }

    renderInitialState() {
        this.hideError();
        this.hideNoResults();
        this.updateIndicators([]);
        this.totalRecords = 0;
        this.updatePagination();
        this.renderMessageRow('Selecione um grupo e clique em Filtrar para carregar o estoque.');
    }

    hasRequiredFilters() {
        return Boolean(this.grupoFilter.value.trim());
    }

    buildFilterParams() {
        const params = new URLSearchParams();

        const grupo = this.grupoFilter.value.trim();
        const produto = this.productoFilter.value.trim();
        const contenedor = this.contenedorFilter.value.trim();

        if (grupo) params.append('grupo', grupo);
        if (produto) params.append('producto', produto);
        if (contenedor) params.append('contenedor', contenedor);

        // Mostra exatamente os registros da fonte (sem consolidar)
        params.append('raw', 'true');
        params.append('limit', this.limit);
        params.append('offset', this.currentPage * this.limit);

        return params.toString();
    }

    async loadStock() {
        if (!this.hasRequiredFilters()) {
            this.hasLoaded = false;
            this.totalRecords = 0;
            this.hideNoResults();
            this.updateIndicators([]);
            this.updatePagination();
            this.renderMessageRow('Selecione um grupo para consultar o estoque.');
            return;
        }

        try {
            this.showLoading();
            this.hideError();
            this.hideNoResults();

            const params = this.buildFilterParams();
            const response = await fetch(`/api/stock?${params}`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Erro ao carregar estoque');
            }

            this.hasLoaded = true;
            this.totalRecords = data.pagination?.total || 0;
            this.renderStock(data.data || []);
            this.updateIndicators(data.data || []);
            this.updatePagination();

            if (!data.data || data.data.length === 0) {
                this.showNoResults();
            }
        } catch (error) {
            console.error('Erro:', error);
            this.showError(error.message);
            this.hasLoaded = false;
            this.totalRecords = 0;
            this.updateIndicators([]);
            this.updatePagination();
            this.renderMessageRow('Falha ao carregar os dados do estoque.');
        }
    }

    renderStock(items) {
        if (items.length === 0) {
            this.renderMessageRow('Nenhum dado');
            return;
        }

        this.stockTableBody.innerHTML = items.map(item => {
            const rowClass = item.cantidad <= 0 ? 'bg-danger-light' : '';
            const contenedor = item.grupo === 'CON' ? item.contenedor : 'N/A';
            const quantidade = item.cantidad;
            const quantidadeClass =
                quantidade <= 0 ? 'text-danger fw-bold' :
                quantidade < 10 ? 'text-warning fw-bold' : '';

            const dataProduto = item.fecha_producto
              ? 
            item.fecha_producto.split('-').reverse().join('/')
             : '-';

            return `
                <tr class="${rowClass}">
                    <td><span class="badge bg-info">${this.escapeHtml(item.grupo)}</span></td>
                    <td>${this.escapeHtml(item.producto)}</td>
                    <td class="text-end">
                        <span class="${quantidadeClass}">${quantidade}</span>
                        ${quantidade <= 0 ? '<span class="badge bg-danger ms-2">SEM ESTOQUE</span>' : ''}
                    </td>
                    <td><code>${this.escapeHtml(contenedor)}</code></td>
                    <td><small class="text-muted">${dataProduto}</small></td>
                </tr>
            `;
        }).join('');
    }

    renderMessageRow(message) {
        this.stockTableBody.innerHTML = `
            <tr class="text-center">
                <td colspan="5" class="py-4 text-muted">${this.escapeHtml(message)}</td>
            </tr>
        `;
    }

    updateIndicators(items) {
        const lowStock = items.filter(i => i.cantidad > 0 && i.cantidad < 10).length;
        const noStock = items.filter(i => i.cantidad <= 0).length;

        this.totalCount.textContent = this.totalRecords;
        this.shownCount.textContent = items.length;
        this.lowStockCount.textContent = lowStock;
        this.noStockCount.textContent = noStock;
    }

    updatePagination() {
        const totalPages = Math.max(1, Math.ceil(this.totalRecords / this.limit));
        const currentPage = this.currentPage + 1;

        if (!this.hasLoaded) {
            this.paginationInfo.textContent = 'Aguardando filtro';
            this.prevBtn.disabled = true;
            this.nextBtn.disabled = true;
            return;
        }

        this.paginationInfo.textContent = `Pagina ${currentPage} de ${totalPages}`;
        this.prevBtn.disabled = this.currentPage === 0;
        this.nextBtn.disabled = this.currentPage >= totalPages - 1 || this.totalRecords === 0;
    }

    onFilterClick() {
        if (!this.hasRequiredFilters()) {
            this.showError('Selecione um grupo antes de filtrar.');
            this.totalRecords = 0;
            this.hasLoaded = false;
            this.hideNoResults();
            this.updateIndicators([]);
            this.updatePagination();
            this.renderMessageRow('Selecione um grupo e clique em Filtrar para carregar o estoque.');
            return;
        }

        this.currentPage = 0;
        this.loadStock();
    }

    previousPage() {
        if (!this.hasLoaded || this.currentPage <= 0) {
            return;
        }
        this.currentPage -= 1;
        this.loadStock();
    }

    nextPage() {
        if (!this.hasLoaded) {
            return;
        }
        const totalPages = Math.ceil(this.totalRecords / this.limit);
        if (this.currentPage < totalPages - 1) {
            this.currentPage += 1;
            this.loadStock();
        }
    }

    showLoading() {
        this.stockTableBody.innerHTML = `
            <tr class="text-center">
                <td colspan="5" class="py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorAlert.classList.remove('d-none');

        setTimeout(() => {
            this.errorAlert.classList.add('d-none');
        }, 5000);
    }

    hideError() {
        this.errorAlert.classList.add('d-none');
    }

    showNoResults() {
        this.noResultsAlert.classList.remove('d-none');
    }

    hideNoResults() {
        this.noResultsAlert.classList.add('d-none');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StockManager();
});
