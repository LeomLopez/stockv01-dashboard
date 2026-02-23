/**
 * Script da página de Movimentos
 * Gerencia filtros, fetch da API e atualização dinâmica da tabela
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
     * Inicializar referências aos elementos do DOM
     */
    initializeElements() {
        // Filtros
        this.fechaDesdeFilter = document.getElementById('fechaDesdeFilter');
        this.fechaHastaFilter = document.getElementById('fechaHastaFilter');
        this.tipoFilter = document.getElementById('tipoFilter');
        this.grupoFilter = document.getElementById('grupoFilter');

        // Botões
        this.filterBtn = document.getElementById('filterBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');

        // Tabela
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

        // Paginação
        this.paginationInfo = document.getElementById('paginationInfo');
    }

    /**
     * Adicionar event listeners
     */
    attachEventListeners() {
        this.filterBtn.addEventListener('click', () => this.onFilterClick());
        this.resetBtn.addEventListener('click', () => this.onResetClick());
        this.prevBtn.addEventListener('click', () => this.previousPage());
        this.nextBtn.addEventListener('click', () => this.nextPage());
    }

    /**
     * Construir parâmetros de filtro
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
     * Carregar dados de movimentos pela API
     */
    async loadMovimientos() {
        try {
            this.showLoading();
            this.hideError();
            this.hideNoResults();

            const params = this.buildFilterParams();
            const response = await fetch(`/api/movimientos?${params}`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Erro ao carregar movimentos');
            }

            this.totalRecords = data.pagination.total;
            this.renderMovimientos(data.data);
            this.updateIndicators(data.data);
            this.updatePagination();

            if (data.data.length === 0) {
                this.showNoResults();
            }

        } catch (error) {
            console.error('Erro:', error);
            this.showError(error.message);
            this.movimientosTableBody.innerHTML = '';
            this.updateIndicators([]);
        }
    }

    /**
     * Renderizar tabela de movimentos
     */
    renderMovimientos(items) {
        if (items.length === 0) {
            this.movimientosTableBody.innerHTML =
                '<tr><td colspan="7" class="text-center py-4">Sem dados</td></tr>';
            return;
        }

        this.movimientosTableBody.innerHTML = items.map(item => {
            const fecha = new Date(item.fecha).toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            const tipoColor = this.tipoColors[item.tipo] || 'secondary';
            const quantidadeClass = item.cantidad < 0 ? 'text-danger' : 'text-success';
            const sinal = item.cantidad < 0 ? '' : '+';

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
                        <strong class="${quantidadeClass}">${sinal}${item.cantidad}</strong>
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
     * Atualizar indicadores
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
     * Atualizar controles de paginação
     */
    updatePagination() {
        const totalPages = Math.ceil(this.totalRecords / this.limit);
        const currentPage = this.currentPage + 1;

        this.paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        this.prevBtn.disabled = this.currentPage === 0;
        this.nextBtn.disabled = this.currentPage >= totalPages - 1 || totalPages === 0;
    }

    /**
     * Ao clicar em Filtrar
     */
    onFilterClick() {
        this.currentPage = 0;
        this.loadMovimientos();
    }

    /**
     * Limpar filtros
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
     * Próxima página
     */
    nextPage() {
        const totalPages = Math.ceil(this.totalRecords / this.limit);
        if (this.currentPage < totalPages - 1) {
            this.currentPage++;
            this.loadMovimientos();
        }
    }

    /**
     * Mostrar indicador de carregamento
     */
    showLoading() {
        this.movimientosTableBody.innerHTML = `
            <tr class="text-center">
                <td colspan="7" class="py-4">
                    <div class="spinner-border text-info" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                </td>
            </tr>
        `;
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
     * Mostrar "sem resultados"
     */
    showNoResults() {
        this.noResultsAlert.classList.remove('d-none');
    }

    /**
     * Ocultar "sem resultados"
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
 * Inicializar quando o DOM estiver pronto
 */
document.addEventListener('DOMContentLoaded', () => {
    new MovimientosManager();
});
```0
