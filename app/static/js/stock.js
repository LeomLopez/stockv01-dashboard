/**
 * Script para a página de Estoque
 * Gerencia filtros, fetch da API e atualização dinâmica da tabela
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
     * Inicializar referências aos elementos do DOM
     */
    initializeElements() {
        // Filtros
        this.grupoFilter = document.getElementById('grupoFilter');
        this.productoFilter = document.getElementById('productoFilter');
        this.contenedorFilter = document.getElementById('contenedorFilter');

        // Botões
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

        // Paginação
        this.paginationInfo = document.getElementById('paginationInfo');
    }

    /**
     * Anexar event listeners
     */
    attachEventListeners() {
        this.filterBtn.addEventListener('click', () => this.onFilterClick());
        this.prevBtn.addEventListener('click', () => this.previousPage());
        this.nextBtn.addEventListener('click', () => this.nextPage());

        // Permitir Enter no input de produto
        this.productoFilter.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.onFilterClick();
            }
        });
    }

    /**
     * Construir parâmetros de filtro
     */
    buildFilterParams() {
        const params = new URLSearchParams();

        const grupo = this.grupoFilter.value.trim();
        const produto = this.productoFilter.value.trim();
        const contenedor = this.contenedorFilter.value.trim();

        if (grupo) params.append('grupo', grupo);
        if (produto) params.append('producto', produto);
        if (contenedor) params.append('contenedor', contenedor);

        // Pedir sempre raw=true para mostrar exatamente o que há no banco de dados
        params.append('raw', 'true');
        params.append('limit', this.limit);
        params.append('offset', this.currentPage * this.limit);

        return params.toString();
    }

    /**
     * Carregar dados de estoque a partir da API
     */
    async loadStock() {
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

            this.totalRecords = data.pagination.total;
            this.renderStock(data.data);
            this.updateIndicators(data.data);
            this.updatePagination();

            if (data.data.length === 0) {
                this.showNoResults();
            }

        } catch (error) {
            console.error('Erro:', error);
            this.showError(error.message);
            this.stockTableBody.innerHTML = '';
            this.updateIndicators([]);
        }
    }

    /**
     * Renderizar tabela de estoque
     */
    renderStock(items) {
        if (items.length === 0) {
            this.stockTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Sem dados</td></tr>';
            return;
        }

        this.stockTableBody.innerHTML = items.map(item => {
            const rowClass = item.cantidad <= 0 ? 'bg-danger-light' : '';
            const contenedor = item.grupo === 'CON' ? item.contenedor : 'N/A';
            const quantidade = item.cantidad;
            const quantidadeClass =
                quantidade <= 0 ? 'text-danger fw-bold' :
                quantidade < 10 ? 'text-warning fw-bold' : '';

            const dataProduto = new Date(item.fecha_producto).toLocaleDateString('pt-BR', {
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
                        <span class="${quantidadeClass}">${quantidade}</span>
                        ${quantidade <= 0 ? '<span class="badge bg-danger ms-2">SEM ESTOQUE</span>' : ''}
                    </td>
                    <td>
                        <code>${this.escapeHtml(contenedor)}</code>
                    </td>
                    <td>
                        <small class="text-muted">${dataProduto}</small>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Atualizar indicadores
     */
    updateIndicators(items) {
        const lowStock = items.filter(i => i.cantidad > 0 && i.cantidad < 10).length;
        const noStock = items.filter(i => i.cantidad <= 0).length;

        this.totalCount.textContent = this.totalRecords;
        this.shownCount.textContent = items.length;
        this.lowStockCount.textContent = lowStock;
        this.noStockCount.textContent = noStock;
    }
