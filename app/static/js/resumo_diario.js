class ResumoDiarioManager {
    constructor() {
        this.filterForm = document.getElementById('resumoFilterForm');
        this.fechaFilter = document.getElementById('fechaFilter');
        this.destinoFilter = document.getElementById('destinoFilter');
        this.exportNetoBtn = document.getElementById('exportNetoBtn');

        this.saidasBrutoCard = document.getElementById('saidasBrutoCard');
        this.voltasCard = document.getElementById('voltasCard');
        this.netoConsumidoCard = document.getElementById('netoConsumidoCard');
        this.comprasFornecedorCard = document.getElementById('comprasFornecedorCard');
        this.descartesCard = document.getElementById('descartesCard');
        this.porTipoContainer = document.getElementById('porTipoContainer');
        this.saidasPorDestinoContainer = document.getElementById('saidasPorDestinoContainer');
        this.consumoPorItemBody = document.getElementById('consumoPorItemBody');
        this.errorAlert = document.getElementById('resumoErrorAlert');
        this.errorMessage = document.getElementById('resumoErrorMessage');
        this.successAlert = document.getElementById('resumoSuccessAlert');
        this.successMessage = document.getElementById('resumoSuccessMessage');

        this.normalizeDestinoOptions();
        this.attachEvents();
        this.loadResumo();
    }

    normalizeDestinoOptions() {
        const labels = {
            alm: 'Almoço',
            jan: 'Jantar',
            cof: 'Coffee',
            kit: 'Kit Lanche',
            desconocido: 'Desconocido'
        };
        Array.from(this.destinoFilter.options).forEach((opt) => {
            const key = (opt.value || '').trim().toLowerCase();
            if (labels[key]) opt.textContent = labels[key];
        });
    }

    attachEvents() {
        this.filterForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.loadResumo();
        });
        this.exportNetoBtn.addEventListener('click', () => this.exportNeto());
    }

    buildParams() {
        const params = new URLSearchParams();
        if (this.fechaFilter.value) params.append('fecha', this.fechaFilter.value);
        if (this.destinoFilter.value.trim()) params.append('destino', this.destinoFilter.value.trim());
        return params.toString();
    }

    async loadResumo() {
        this.hideSuccess();
        this.hideError();
        this.showLoading();
        try {
            const response = await fetch(`/api/dashboard/resumo-diario?${this.buildParams()}`);
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || `Erro HTTP: ${response.status}`);
            }

            this.renderSummary(payload.summary);
            this.renderPorTipo(payload.por_tipo || []);
            this.renderSaidasPorDestino(payload.saidas_por_destino || []);
            this.renderConsumoPorItem(payload.consumo_por_item || []);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async exportNeto() {
        this.hideSuccess();
        this.hideError();
        try {
            const params = new URLSearchParams();
            if (this.fechaFilter.value) params.append('fecha', this.fechaFilter.value);
            const response = await fetch(`/api/dashboard/consumo-neto-export?${params.toString()}`);
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || `Erro HTTP: ${response.status}`);
            }

            await this.copyText(payload.text || '');
            this.showSuccess('Resumo copiado para a área de transferência. Pronto para enviar no WhatsApp.');
        } catch (error) {
            this.showError(error.message);
        }
    }

    async copyText(text) {
        if (!text) {
            throw new Error('Nenhum conteúdo disponível para exportar.');
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!ok) {
            throw new Error('Não foi possível copiar automaticamente.');
        }
    }

    renderSummary(summary) {
        this.saidasBrutoCard.textContent = summary.saidas_bruto ?? 0;
        this.voltasCard.textContent = summary.voltas ?? 0;
        this.netoConsumidoCard.textContent = summary.neto_consumido ?? 0;
        this.comprasFornecedorCard.textContent = summary.compras_fornecedor ?? 0;
        this.descartesCard.textContent = summary.descartes ?? 0;
    }

    renderPorTipo(items) {
        if (!items.length) {
            this.porTipoContainer.innerHTML = '<span class="text-muted">Sem dados para os filtros selecionados.</span>';
            return;
        }

        this.porTipoContainer.innerHTML = items.map((item) => {
            const tipo = this.escapeHtml((item.tipo || 'desconocido').toString());
            const total = item.total ?? 0;
            return `<span class="badge bg-secondary me-2 mb-2">${tipo}: ${total}</span>`;
        }).join('');
    }

    renderSaidasPorDestino(items) {
        if (!items.length) {
            this.saidasPorDestinoContainer.innerHTML = '<span class="text-muted">Sem saídas para os filtros selecionados.</span>';
            return;
        }

        this.saidasPorDestinoContainer.innerHTML = items.map((item) => {
            const destino = this.escapeHtml((item.destino_label || this.formatDestino(item.destino) || 'Desconocido').toString());
            const total = item.total ?? 0;
            return `<span class="badge bg-danger me-2 mb-2">${destino}: ${total}</span>`;
        }).join('');
    }

    renderConsumoPorItem(items) {
        if (!items.length) {
            this.consumoPorItemBody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">Sem dados para os filtros selecionados.</td></tr>';
            return;
        }

        this.consumoPorItemBody.innerHTML = items.map((item) => {
            const productoBase = (item.producto || 'desconocido').toString();
            const unidade = (item.unidade || '').toString().trim();
            const producto = this.escapeHtml(unidade ? `${productoBase} (${unidade})` : productoBase);
            const destino = this.escapeHtml((item.destino_label || this.formatDestino(item.destino) || 'Desconocido').toString());
            const saidas = item.saidas ?? 0;
            const voltas = item.voltas ?? 0;
            const neto = item.neto ?? 0;
            const fechaProducto = this.formatFechaProducto(item.fecha_producto);
            return `
                <tr>
                    <td>${producto}</td>
                    <td>${destino}</td>
                    <td class="text-end">${saidas}</td>
                    <td class="text-end">${voltas}</td>
                    <td class="text-end"><strong>${neto}</strong></td>
                    <td>${fechaProducto}</td>
                </tr>
            `;
        }).join('');
    }

    showLoading() {
        this.porTipoContainer.innerHTML = '<span class="text-muted">Carregando...</span>';
        this.saidasPorDestinoContainer.innerHTML = '<span class="text-muted">Carregando...</span>';
        this.consumoPorItemBody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">Carregando...</td></tr>';
    }

    showError(message) {
        this.hideSuccess();
        this.errorMessage.textContent = message;
        this.errorAlert.classList.remove('d-none');
    }

    hideError() {
        this.errorAlert.classList.add('d-none');
    }

    showSuccess(message) {
        this.successMessage.textContent = message;
        this.successAlert.classList.remove('d-none');
        setTimeout(() => this.hideSuccess(), 3000);
    }

    hideSuccess() {
        this.successAlert.classList.add('d-none');
    }

    formatDestino(value) {
        const raw = (value || '').toString().trim().toLowerCase();
        const labels = {
            alm: 'Almoço',
            jan: 'Jantar',
            cof: 'Coffee',
            kit: 'Kit Lanche',
            desconocido: 'Desconocido'
        };
        if (!raw) return 'Desconocido';
        return labels[raw] || raw.toUpperCase();
    }

    formatFechaProducto(value) {
        if (!value) return '<span class="text-muted">-</span>';
        const raw = String(value).trim();
        const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
        const parts = datePart.split('-');
        if (parts.length !== 3) return '<span class="text-muted">-</span>';
        const [year, month, day] = parts;
        if (!year || !month || !day) return '<span class="text-muted">-</span>';
        return this.escapeHtml(`${day}/${month}/${year}`);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ResumoDiarioManager();
});
