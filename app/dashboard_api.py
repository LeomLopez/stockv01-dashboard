"""
Blueprint para endpoints del Dashboard
"""

from flask import Blueprint, jsonify
from datetime import datetime, timedelta
from app.models import db, StockActual, Movimiento
import logging
from sqlalchemy import func

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

_CACHE_TTL_SECONDS = 10
_dashboard_cache = {
    'stats': {'expires_at': None, 'payload': None},
    'movimientos_recientes': {'expires_at': None, 'payload': None},
}


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
