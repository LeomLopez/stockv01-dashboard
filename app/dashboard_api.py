"""
Blueprint para endpoints del Dashboard
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta, time, timezone
from app.models import db, StockActual, Movimiento
import logging
from sqlalchemy import func, case
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

_CACHE_TTL_SECONDS = 10
_dashboard_cache = {
    'stats': {'expires_at': None, 'payload': None},
    'movimientos_recientes': {'expires_at': None, 'payload': None},
}


def _sao_paulo_tz():
    try:
        return ZoneInfo('America/Sao_Paulo')
    except ZoneInfoNotFoundError:
        # Fallback para ambientes sem base de timezone disponível.
        return timezone(timedelta(hours=-3))


def _destino_display(destino_value):
    mapping = {
        'alm': 'Almoço',
        'jan': 'Jantar',
        'cof': 'Coffee',
        'kit': 'Kit Lanche',
        'desconocido': 'Desconocido'
    }
    key = (destino_value or '').strip().lower()
    if not key:
        key = 'desconocido'
    return mapping.get(key, key.upper())


SERVICE_CONCEPTS = ('alm', 'jan', 'kit', 'cof')


def _service_header(service_key):
    headers = {
        'alm': '🍽 Almoço',
        'jan': '🌙 Jantar',
        'kit': '🥪 Kit Lanche',
        'cof': '☕ Coffee'
    }
    return headers.get(service_key, _destino_display(service_key))


def _format_qty(value):
    qty = float(value or 0)
    if qty.is_integer():
        return str(int(qty))
    return f'{qty:.2f}'.rstrip('0').rstrip('.')


def _build_whatsapp_export_text(fecha_obj, grouped_data):
    lines = [
        '📊 Consumo Neto por Serviço',
        f"📅 {fecha_obj.strftime('%d/%m/%Y')}",
        ''
    ]

    for service in ('alm', 'jan', 'kit', 'cof'):
        items = grouped_data.get(service, [])
        if not items:
            continue

        lines.append(_service_header(service))
        for item in items:
            neto = item['neto']
            lines.append(f"• {item['producto']} - {_format_qty(neto)}")
        lines.append('')

    # Evita newline final extra
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(lines)


def _get_cached_payload(cache_key):
    entry = _dashboard_cache.get(cache_key)
    if not entry or not entry['payload'] or not entry['expires_at']:
        return None
    if datetime.utcnow() >= entry['expires_at']:
        return None
    return entry['payload']


def _set_cached_payload(cache_key, payload, ttl_seconds=_CACHE_TTL_SECONDS):
    _dashboard_cache[cache_key] = {
        'payload': payload,
        'expires_at': datetime.utcnow() + timedelta(seconds=ttl_seconds)
    }


def _serialize_alert_rows(rows, hoy, expired=False):
    items = []
    for nombre, fecha_producto, grupo, cantidad in rows:
        if not fecha_producto:
            continue

        item = {
            'nombre': nombre,
            'fecha_producto': fecha_producto.isoformat(),
            'grupo': grupo,
            'cantidad': cantidad,
        }
        if expired:
            item['dias_vencido'] = (hoy - fecha_producto).days
        else:
            item['dias_restantes'] = (fecha_producto - hoy).days
        items.append(item)
    return items


@dashboard_bp.route('/stats', methods=['GET'])
def get_stats():
    """
    GET /api/dashboard/stats
    Obtiene estadísticas del dashboard
    """
    try:
        cached = _get_cached_payload('stats')
        if cached:
            return jsonify(cached)

        hoy = datetime.now().date()

        # Una sola consulta para conteos por grupo (en vez de count() por cada grupo)
        group_counts_rows = (
            db.session.query(StockActual.grupo, func.count())
            .group_by(StockActual.grupo)
            .all()
        )
        group_counts = {grupo: int(total) for grupo, total in group_counts_rows}
        total_stock = sum(group_counts.values())

        # Alertas usando filtros por rango (evita cargar toda la tabla en memoria)
        alert_columns = (
            StockActual.nombre,
            StockActual.fecha_producto,
            StockActual.grupo,
            StockActual.cantidad,
        )
        alert_base = db.session.query(*alert_columns).filter(StockActual.fecha_producto.isnot(None))

        hoy_mas_3 = hoy + timedelta(days=3)
        hoy_mas_4 = hoy + timedelta(days=4)
        hoy_mas_7 = hoy + timedelta(days=7)

        q_vencidos = alert_base.filter(StockActual.fecha_producto < hoy)
        q_vencen_3 = alert_base.filter(
            StockActual.fecha_producto >= hoy,
            StockActual.fecha_producto <= hoy_mas_3
        )
        q_vencen_7 = alert_base.filter(
            StockActual.fecha_producto >= hoy_mas_4,
            StockActual.fecha_producto <= hoy_mas_7
        )

        vencidos_count = q_vencidos.count()
        vencen_3_count = q_vencen_3.count()
        vencen_7_count = q_vencen_7.count()

        vencidos_lista = _serialize_alert_rows(
            q_vencidos.order_by(StockActual.fecha_producto.asc()).limit(5).all(),
            hoy,
            expired=True
        )
        vencen_3_dias_lista = _serialize_alert_rows(
            q_vencen_3.order_by(StockActual.fecha_producto.asc()).limit(5).all(),
            hoy
        )
        vencen_7_dias_lista = _serialize_alert_rows(
            q_vencen_7.order_by(StockActual.fecha_producto.asc()).limit(5).all(),
            hoy
        )

        payload = {
            'success': True,
            'stats': {
                'total_stock': total_stock,
                'congelados': group_counts.get('CON', 0),
                'hortifruti': group_counts.get('HOR', 0),
                'frutales': group_counts.get('FRU', 0),
                'secos': group_counts.get('SEC', 0),
                'lacteos': group_counts.get('LAC', 0)
            },
            'alerts': {
                'vencidos': vencidos_count,
                'vencidos_lista': vencidos_lista,
                'vencen_3_dias': vencen_3_count,
                'vencen_3_dias_lista': vencen_3_dias_lista,
                'vencen_7_dias': vencen_7_count,
                'vencen_7_dias_lista': vencen_7_dias_lista
            },
            'timestamp': datetime.utcnow().isoformat()
        }

        _set_cached_payload('stats', payload)
        return jsonify(payload)
    
    except Exception as e:
        logger.error(f'Error en GET /api/dashboard/stats: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Erro interno do servidor: {str(e)}'
        }), 500


@dashboard_bp.route('/movimientos-recientes', methods=['GET'])
def get_movimientos_recientes():
    """
    GET /api/dashboard/movimientos-recientes
    Obtiene los últimos 10 movimientos
    """
    try:
        cached = _get_cached_payload('movimientos_recientes')
        if cached:
            return jsonify(cached)

        movimientos = Movimiento.query.order_by(
            Movimiento.fecha_movimiento.desc()
        ).limit(10).all()
        
        data = [m.to_dict() for m in movimientos]
        
        payload = {
            'success': True,
            'data': data,
            'total': len(data),
            'timestamp': datetime.utcnow().isoformat()
        }

        _set_cached_payload('movimientos_recientes', payload, ttl_seconds=5)
        return jsonify(payload)
    
    except Exception as e:
        logger.error(f'Error en GET /api/dashboard/movimientos-recientes: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Erro interno do servidor: {str(e)}'
        }), 500


@dashboard_bp.route('/resumo-diario', methods=['GET'])
def get_resumo_diario():
    """
    GET /api/dashboard/resumo-diario

    Parámetros:
    - fecha: YYYY-MM-DD (default: hoy en America/Sao_Paulo)
    - destino: concepto de servicio (opcional): alm|jan|kit|cof
    """
    try:
        tz_sp = _sao_paulo_tz()
        fecha_raw = (request.args.get('fecha') or '').strip()
        destino_raw = (request.args.get('destino') or '').strip()
        destino_norm = destino_raw.lower()

        if fecha_raw:
            try:
                fecha_obj = datetime.strptime(fecha_raw, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'error': 'Parâmetro fecha inválido. Use YYYY-MM-DD'}), 400
        else:
            fecha_obj = datetime.now(tz_sp).date()

        if destino_norm and destino_norm not in SERVICE_CONCEPTS:
            return jsonify({'success': False, 'error': 'Parâmetro destino inválido. Use alm, jan, kit, cof ou vazio'}), 400

        day_start = datetime.combine(fecha_obj, time.min)
        day_end = day_start + timedelta(days=1)

        concepto_norm = func.lower(func.trim(func.coalesce(Movimiento.concepto, '')))
        tipo_norm = func.lower(func.trim(func.coalesce(Movimiento.tipo, '')))
        is_service_concept = concepto_norm.in_(SERVICE_CONCEPTS)
        in_day = (
            Movimiento.fecha_movimiento >= day_start,
            Movimiento.fecha_movimiento < day_end
        )

        base_query = Movimiento.query.filter(
            *in_day
        )

        if destino_norm:
            base_query = base_query.filter(concepto_norm == destino_norm)

        consumo_query = base_query.filter(
            is_service_concept,
            tipo_norm.in_(('saida', 'entrada'))
        )
        summary_row = base_query.with_entities(
            func.coalesce(func.sum(case(((is_service_concept & (tipo_norm == 'saida')), Movimiento.cantidad), else_=0)), 0),
            func.coalesce(func.sum(case(((is_service_concept & (tipo_norm == 'entrada')), Movimiento.cantidad), else_=0)), 0),
            func.coalesce(func.sum(case((tipo_norm == 'descarte', Movimiento.cantidad), else_=0)), 0),
            func.coalesce(func.sum(case((((tipo_norm == 'entrada') & (concepto_norm == 'fornecedor')), Movimiento.cantidad), else_=0)), 0)
        ).first()

        saidas_bruto = int(summary_row[0] or 0)
        voltas = int(summary_row[1] or 0)
        descartes = int(summary_row[2] or 0)
        compras_fornecedor = int(summary_row[3] or 0)
        neto_consumido = saidas_bruto - voltas

        por_tipo = [
            {'tipo': 'saida', 'total': saidas_bruto},
            {'tipo': 'entrada', 'total': voltas}
        ]

        destino_label = concepto_norm
        saidas_por_destino_rows = (
            consumo_query.with_entities(
                destino_label.label('destino'),
                func.coalesce(func.sum(case((tipo_norm == 'saida', Movimiento.cantidad), else_=0)), 0).label('total')
            )
            .group_by(destino_label)
            .order_by(func.coalesce(func.sum(case((tipo_norm == 'saida', Movimiento.cantidad), else_=0)), 0).desc(), destino_label.asc())
            .all()
        )
        saidas_por_destino = []
        for row in saidas_por_destino_rows:
            destino = (row.destino or '').strip() or 'desconocido'
            saidas_por_destino.append({
                'destino': destino,
                'destino_label': _destino_display(destino),
                'total': int(row.total or 0)
            })

        # Consumo neto por producto + destino:
        # neto = sum(saidas) - sum(voltas) para o mesmo par (produto, destino)
        consumo_rows = (
            consumo_query.with_entities(
                Movimiento.nombre.label('producto'),
                destino_label.label('destino'),
                func.coalesce(func.sum(case((tipo_norm == 'saida', Movimiento.cantidad), else_=0)), 0).label('saidas'),
                func.coalesce(func.sum(case((tipo_norm == 'entrada', Movimiento.cantidad), else_=0)), 0).label('voltas'),
                func.max(case((tipo_norm == 'saida', Movimiento.fecha_movimiento), else_=None)).label('ultima_liberacao')
            )
            .group_by(Movimiento.nombre, destino_label)
            .order_by(Movimiento.nombre.asc(), destino_label.asc())
            .all()
        )
        consumo_por_item = []
        for row in consumo_rows:
            destino = row.destino or 'desconocido'
            saidas_item = int(row.saidas or 0)
            voltas_item = int(row.voltas or 0)
            consumo_por_item.append({
                'producto': row.producto or 'desconocido',
                'destino': destino,
                'destino_label': _destino_display(destino),
                'saidas': saidas_item,
                'voltas': voltas_item,
                'neto': saidas_item - voltas_item,
                'fecha_liberacao': row.ultima_liberacao.isoformat() if row.ultima_liberacao else None
            })

        return jsonify({
            'success': True,
            'filters': {
                'fecha': fecha_obj.isoformat(),
                'destino': destino_raw or '',
                'timezone': 'America/Sao_Paulo'
            },
            'summary': {
                'saidas_bruto': saidas_bruto,
                'voltas': voltas,
                'neto_consumido': neto_consumido,
                'descartes': descartes,
                'compras_fornecedor': compras_fornecedor
            },
            'por_tipo': por_tipo,
            'saidas_por_destino': saidas_por_destino,
            'consumo_por_item': consumo_por_item,
            'total_listado': len(consumo_por_item),
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f'Error en GET /api/dashboard/resumo-diario: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Erro interno do servidor: {str(e)}'
        }), 500


@dashboard_bp.route('/consumo-neto-export', methods=['GET'])
def export_consumo_neto_por_servico():
    """
    GET /api/dashboard/consumo-neto-export

    Parámetros:
    - fecha: YYYY-MM-DD (default: hoy en America/Sao_Paulo)

    Reglas:
    - Saídas: tipo='saida' y concepto de servicio (alm, jan, kit, cof)
    - Voltas: tipo='entrada' y concepto de servicio (alm, jan, kit, cof)
    - Neto: saidas - voltas
    - Excluir descarte, ajuste y entradas de fornecedor
    - Mostrar solo neto > 0
    """
    try:
        tz_sp = _sao_paulo_tz()
        fecha_raw = (request.args.get('fecha') or '').strip()
        if fecha_raw:
            try:
                fecha_obj = datetime.strptime(fecha_raw, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'error': 'Parâmetro fecha inválido. Use YYYY-MM-DD'}), 400
        else:
            fecha_obj = datetime.now(tz_sp).date()

        day_start = datetime.combine(fecha_obj, time.min)
        day_end = day_start + timedelta(days=1)

        concepto_norm = func.lower(func.trim(func.coalesce(Movimiento.concepto, '')))
        tipo_norm = func.lower(func.trim(func.coalesce(Movimiento.tipo, '')))

        rows = (
            db.session.query(
                Movimiento.nombre.label('producto'),
                concepto_norm.label('servicio'),
                func.coalesce(func.sum(case((tipo_norm == 'saida', Movimiento.cantidad), else_=0)), 0).label('liberado'),
                func.coalesce(func.sum(case((tipo_norm == 'entrada', Movimiento.cantidad), else_=0)), 0).label('voltas')
            )
            .filter(
                Movimiento.fecha_movimiento >= day_start,
                Movimiento.fecha_movimiento < day_end,
                concepto_norm.in_(SERVICE_CONCEPTS),
                tipo_norm.in_(('saida', 'entrada'))
            )
            .group_by(Movimiento.nombre, concepto_norm)
            .all()
        )

        grouped = {k: [] for k in SERVICE_CONCEPTS}
        totals = {k: 0 for k in SERVICE_CONCEPTS}

        for row in rows:
            service = (row.servicio or '').strip().lower()
            if service not in grouped:
                continue
            liberado = float(row.liberado or 0)
            voltas = float(row.voltas or 0)
            neto = liberado - voltas
            if neto <= 0:
                continue
            item = {
                'producto': row.producto or 'desconocido',
                'liberado': liberado,
                'voltas': voltas,
                'neto': neto
            }
            grouped[service].append(item)
            totals[service] += neto

        for service in grouped:
            grouped[service].sort(key=lambda x: x['neto'], reverse=True)

        text = _build_whatsapp_export_text(fecha_obj, grouped)

        return jsonify({
            'success': True,
            'fecha': fecha_obj.isoformat(),
            'timezone': 'America/Sao_Paulo',
            'services': grouped,
            'service_totals': totals,
            'text': text
        })
    except Exception as e:
        logger.error(f'Error en GET /api/dashboard/consumo-neto-export: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Erro interno do servidor: {str(e)}'
        }), 500
