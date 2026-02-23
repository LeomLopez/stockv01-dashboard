"""
Blueprint para endpoints del Dashboard
"""

from flask import Blueprint, jsonify
from datetime import datetime, timedelta
from app.models import db, StockActual, Movimiento
import logging

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


@dashboard_bp.route('/stats', methods=['GET'])
def get_stats():
    """
    GET /api/dashboard/stats
    Obtiene estadísticas del dashboard
    """
    try:
        # Contar por grupo
        total_stock = StockActual.query.count()
        congelados = StockActual.query.filter_by(grupo='CON').count()
        hortifruti = StockActual.query.filter_by(grupo='HOR').count()
        frutales = StockActual.query.filter_by(grupo='FRU').count()
        secos = StockActual.query.filter_by(grupo='SEC').count()
        lacteos = StockActual.query.filter_by(grupo='LAC').count()
        
        # Calcular alertas por fecha_producto
        hoy = datetime.now().date()
        vencidos = []
        vencen_3_dias = []
        vencen_7_dias = []
        
        # Obtener todos los productos
        productos = StockActual.query.all()
        
        for producto in productos:
            if not producto.fecha_producto:
                continue
            
            # Convertir a date si es datetime
            fecha = producto.fecha_producto
            if isinstance(fecha, datetime):
                fecha = fecha.date()
            
            dias_diferencia = (fecha - hoy).days
            
            if dias_diferencia < 0:
                # Vencido
                vencidos.append({
                    'nombre': producto.nombre,
                    'fecha_producto': fecha.isoformat(),
                    'grupo': producto.grupo,
                    'cantidad': producto.cantidad,
                    'dias_vencido': abs(dias_diferencia)
                })
            elif dias_diferencia <= 3:
                # Vence en 3 días
                vencen_3_dias.append({
                    'nombre': producto.nombre,
                    'fecha_producto': fecha.isoformat(),
                    'grupo': producto.grupo,
                    'cantidad': producto.cantidad,
                    'dias_restantes': dias_diferencia
                })
            elif dias_diferencia <= 7:
                # Vence en 7 días
                vencen_7_dias.append({
                    'nombre': producto.nombre,
                    'fecha_producto': fecha.isoformat(),
                    'grupo': producto.grupo,
                    'cantidad': producto.cantidad,
                    'dias_restantes': dias_diferencia
                })
        
        return jsonify({
            'success': True,
            'stats': {
                'total_stock': total_stock,
                'congelados': congelados,
                'hortifruti': hortifruti,
                'frutales': frutales,
                'secos': secos,
                'lacteos': lacteos
            },
            'alerts': {
                'vencidos': len(vencidos),
                'vencidos_lista': vencidos[:5],  # Top 5
                'vencen_3_dias': len(vencen_3_dias),
                'vencen_3_dias_lista': vencen_3_dias[:5],
                'vencen_7_dias': len(vencen_7_dias),
                'vencen_7_dias_lista': vencen_7_dias[:5]
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        logger.error(f'Error en GET /api/dashboard/stats: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Error interno del servidor: {str(e)}'
        }), 500


@dashboard_bp.route('/movimientos-recientes', methods=['GET'])
def get_movimientos_recientes():
    """
    GET /api/dashboard/movimientos-recientes
    Obtiene los últimos 10 movimientos
    """
    try:
        movimientos = Movimiento.query.order_by(
            Movimiento.fecha_movimiento.desc()
        ).limit(10).all()
        
        data = [m.to_dict() for m in movimientos]
        
        return jsonify({
            'success': True,
            'data': data,
            'total': len(data),
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        logger.error(f'Error en GET /api/dashboard/movimientos-recientes: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Error interno del servidor: {str(e)}'
        }), 500
