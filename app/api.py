from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models import db, StockActual, Movimiento
import logging

# Configurar logging
logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__, url_prefix='/api')


def safe_int(value, default=10, min_val=1, max_val=1000):
    """Convertir valor a entero de forma segura con validación"""
    try:
        result = int(value)
        if result < min_val or result > max_val:
            return None
        return result
    except (ValueError, TypeError):
        return default


def safe_datetime(value):
    """Convertir string a datetime de forma segura"""
    if not value:
        return None
    try:
        # Soportar múltiples formatos
        for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%Y-%m-%dT%H:%M:%S']:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
        return None
    except Exception as e:
        logger.error(f'Error parsing datetime: {e}')
        return None


def format_response(data, total=None, limit=None, offset=None):
    """Formatear respuesta JSON estándar"""
    response = {
        'success': True,
        'data': data,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if total is not None:
        response['pagination'] = {
            'total': total,
            'limit': limit,
            'offset': offset,
            'returned': len(data) if isinstance(data, list) else 1
        }
    
    return response


def error_response(message, status_code=400, details=None):
    """Formatear respuesta de error"""
    response = {
        'success': False,
        'error': message,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if details:
        response['details'] = details
    
    return jsonify(response), status_code


@api_bp.route('/stock', methods=['GET'])
def get_stock():
    """
    GET /api/stock
    
    Parámetros opcionales:
    - grupo: filtrar por grupo
    - producto: filtrar por nombre de producto
    - contenedor: filtrar por contenedor
    - limit: cantidad de registros (default: 10, max: 1000)
    - offset: desplazamiento (default: 0)
    
    Retorna: JSON con stock actual ordenado por fecha_producto ascendente
    """
    try:
        # Obtener parámetros de filtro
        grupo = request.args.get('grupo', '').strip()
        producto = request.args.get('producto', '').strip()
        contenedor = request.args.get('contenedor', '').strip()
        
        # Validar paginación
        limit = request.args.get('limit', 10, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Validar límites de paginación
        if limit is None:
            return error_response('Parâmetro limit inválido. Deve ser um número entre 1 e 1000', 400)
        if limit < 1 or limit > 1000:
            return error_response('O parâmetro limit deve estar entre 1 e 1000', 400)
        
        if offset < 0:
            return error_response('O parâmetro offset não pode ser negativo', 400)
        
        # Construir consulta SQL directa contra la tabla/view stock_actual
        # Usar columnas explícitas para evitar dependencias en el modelo
        from sqlalchemy import text

        # Filtros SQL simples
        where_clauses = []
        params = {}
        if grupo:
            where_clauses.append("grupo ILIKE :grupo")
            params['grupo'] = f"%{grupo}%"
        if producto:
            # El nombre real en la tabla es 'nombre'
            where_clauses.append("nombre ILIKE :producto")
            params['producto'] = f"%{producto}%"
        if contenedor:
            where_clauses.append("contenedor ILIKE :contenedor")
            params['contenedor'] = f"%{contenedor}%"

        where_sql = ''
        if where_clauses:
            where_sql = 'WHERE ' + ' AND '.join(where_clauses)

        # Soporte para modo raw: devolver filas tal cual en stock_actual
        # Por compatibilidad con la petición del usuario, por defecto mostramos los datos crudos
        raw_flag = request.args.get('raw', 'true').lower() in ('1', 'true', 'yes')

        if raw_flag:
            # Total de filas que coinciden
            count_sql = text(f"SELECT COUNT(*) FROM stock_actual {where_sql}")
            total = db.session.execute(count_sql, params).scalar() or 0

            # Seleccionar filas raw ordenadas por fecha desc (más reciente primero)
            select_sql = text(
                f"SELECT nombre, unidade, grupo, fecha_producto, contenedor, cantidad FROM stock_actual {where_sql} ORDER BY fecha_producto DESC LIMIT :limit OFFSET :offset"
            )
            params.update({'limit': limit, 'offset': offset})
            rows = db.session.execute(select_sql, params).fetchall()

        else:
            # Obtener total de productos únicos (última fila por nombre)
            count_sql = text(f"SELECT COUNT(DISTINCT nombre) FROM stock_actual {where_sql}")
            total = db.session.execute(count_sql, params).scalar() or 0

            # Seleccionar la última fila por producto (Postgres: DISTINCT ON)
            distinct_sql = text(
                f"SELECT DISTINCT ON (nombre) nombre, unidade, grupo, fecha_producto, contenedor, cantidad FROM stock_actual {where_sql} ORDER BY nombre, fecha_producto DESC"
            )
            # Luego envolvemos y aplicamos orden final por fecha desc y paginación
            final_sql = text(
                f"SELECT nombre, unidade, grupo, fecha_producto, contenedor, cantidad FROM ({distinct_sql.text}) s ORDER BY fecha_producto DESC LIMIT :limit OFFSET :offset"
            )

            params.update({'limit': limit, 'offset': offset})
            rows = db.session.execute(final_sql, params).fetchall()

        # Convertir filas a diccionarios con la misma forma que StockActual.to_dict()
        data = []
        for r in rows:
            nombre, unidade, grupo_col, fecha_producto, contenedor_col, cantidad = r
            data.append({
                'id': hash(nombre) & 0x7fffffff,
                'nombre': nombre,
                'producto': nombre,
                'unidade': unidade,
                'grupo': grupo_col,
                'fecha_producto': fecha_producto.isoformat() if fecha_producto else None,
                'contenedor': contenedor_col,
                'cantidad': cantidad
            })
        
        return jsonify(format_response(
            data,
            total=total,
            limit=limit,
            offset=offset
        ))
    
    except Exception as e:
        logger.error(f'Error en GET /api/stock: {str(e)}')
        return error_response(f'Erro interno do servidor: {str(e)}', 500)


@api_bp.route('/movimientos', methods=['GET'])
def get_movimientos():
    """
    GET /api/movimientos
    
    Parámetros opcionales:
    - fecha_desde: formato YYYY-MM-DD o YYYY-MM-DD HH:MM:SS
    - fecha_hasta: formato YYYY-MM-DD o YYYY-MM-DD HH:MM:SS
    - tipo: filtrar por tipo (entrada, salida, ajuste)
    - grupo: filtrar por grupo
    - producto: filtrar por nombre de producto
    - limit: cantidad de registros (default: 10, max: 1000)
    - offset: desplazamiento (default: 0)
    
    Retorna: JSON con movimientos ordenados por fecha descendente
    """
    try:
        # Obtener parámetros de filtro
        fecha_desde = request.args.get('fecha_desde')
        fecha_hasta = request.args.get('fecha_hasta')
        tipo = request.args.get('tipo', '').strip()
        grupo = request.args.get('grupo', '').strip()
        producto = request.args.get('producto', '').strip()
        
        # Validar paginación
        limit = request.args.get('limit', 10, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Validar límites de paginación
        if limit is None or limit < 1 or limit > 1000:
            return error_response('O parâmetro limit deve estar entre 1 e 1000', 400)
        
        if offset < 0:
            return error_response('O parâmetro offset não pode ser negativo', 400)
        
        # Validar y convertir fechas
        fecha_desde_dt = None
        fecha_hasta_dt = None
        
        if fecha_desde:
            fecha_desde_dt = safe_datetime(fecha_desde)
            if not fecha_desde_dt:
                return error_response(
                    'Parâmetro fecha_desde inválido. Use o formato YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS',
                    400,
                    {'received': fecha_desde}
                )
        
        if fecha_hasta:
            fecha_hasta_dt = safe_datetime(fecha_hasta)
            if not fecha_hasta_dt:
                return error_response(
                    'Parâmetro fecha_hasta inválido. Use o formato YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS',
                    400,
                    {'received': fecha_hasta}
                )
        
        # Validar que fecha_desde <= fecha_hasta
        if fecha_desde_dt and fecha_hasta_dt and fecha_desde_dt > fecha_hasta_dt:
            return error_response(
                'fecha_desde não pode ser posterior a fecha_hasta',
                400
            )
        
        # Validar tipo si se proporciona
        if tipo:
            tipos_validos = ['entrada', 'salida', 'ajuste']
            if tipo not in tipos_validos:
                return error_response(
                    f'Parâmetro tipo inválido. Valores válidos: {", ".join(tipos_validos)}',
                    400
                )
        
        # Construir consulta base
        query = Movimiento.query
        
        # Aplicar filtros de fecha
        if fecha_desde_dt:
            query = query.filter(Movimiento.fecha_movimiento >= fecha_desde_dt)
        
        if fecha_hasta_dt:
            query = query.filter(Movimiento.fecha_movimiento <= fecha_hasta_dt)
        
        # Aplicar filtros de texto
        if tipo:
            query = query.filter(Movimiento.tipo == tipo)
        
        if grupo:
            query = query.filter(Movimiento.grupo.ilike(f'%{grupo}%'))
        
        if producto:
            query = query.filter(Movimiento.producto.ilike(f'%{producto}%'))
        
        # Obtener total antes de paginar
        total = query.count()
        
        # Ordenar por fecha_movimiento descendente y aplicar paginación
        results = query.order_by(Movimiento.fecha_movimiento.desc()).limit(limit).offset(offset).all()
        
        # Convertir a diccionarios
        data = [item.to_dict() for item in results]
        
        return jsonify(format_response(
            data,
            total=total,
            limit=limit,
            offset=offset
        ))
    
    except Exception as e:
        logger.error(f'Error en GET /api/movimientos: {str(e)}')
        return error_response(f'Erro interno do servidor: {str(e)}', 500)


@api_bp.errorhandler(404)
def not_found(error):
    """Manejar rutas no encontradas"""
    return error_response('Endpoint não encontrado', 404)


@api_bp.errorhandler(405)
def method_not_allowed(error):
    """Manejar métodos no permitidos"""
    return error_response('Método HTTP não permitido. Apenas solicitações GET são permitidas', 405)
