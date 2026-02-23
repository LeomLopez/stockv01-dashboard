from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Product(db.Model):
    """Modelo para productos de inventario"""
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    quantity = db.Column(db.Integer, default=0)
    price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Product {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'quantity': self.quantity,
            'price': self.price,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class StockActual(db.Model):
    """Modelo para stock actual de productos"""
    __tablename__ = 'stock_actual'
    
    # Sin ID - es una tabla de vista/consulta
    nombre = db.Column(db.String(200), primary_key=True)
    unidade = db.Column(db.String(100), nullable=False)
    grupo = db.Column(db.String(100), nullable=False, index=True)
    fecha_producto = db.Column(db.Date, nullable=False, index=True)
    contenedor = db.Column(db.String(100), nullable=False, index=True)
    cantidad = db.Column(db.Integer, default=0)
    
    def __repr__(self):
        return f'<StockActual {self.nombre}>'
    
    def to_dict(self):
        return {
            'id': hash(self.nombre) & 0x7fffffff,  # Generar ID pseudo-único
            'nombre': self.nombre,
            'unidade': self.unidade,
            'grupo': self.grupo,
            'fecha_producto': self.fecha_producto.isoformat() if self.fecha_producto else None,
            'contenedor': self.contenedor,
            'cantidad': self.cantidad,
            'producto': self.nombre  # Compatibilidad con API
        }


class Movimiento(db.Model):
    """Modelo para movimientos de inventario"""
    __tablename__ = 'movimientos'
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False, index=True)
    cantidad = db.Column(db.Integer, nullable=False)
    tipo = db.Column(db.Text, index=True)
    fecha_producto = db.Column(db.Date, index=True)
    unidade = db.Column(db.String(100))
    grupo = db.Column(db.String(100), nullable=False, index=True)
    fecha_movimiento = db.Column(db.DateTime, index=True)
    contenedor = db.Column(db.String(100), index=True)
    
    def __repr__(self):
        return f'<Movimiento {self.tipo} {self.nombre}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'tipo': self.tipo or 'ajuste',
            'grupo': self.grupo,
            'producto': self.nombre,
            'cantidad': self.cantidad,
            'descripcion': f'{self.unidade} de {self.nombre}',
            'fecha': self.fecha_movimiento.isoformat() if self.fecha_movimiento else None,
            'usuario': 'Sistema',
            'referencia': str(self.id),
            'created_at': self.fecha_movimiento.isoformat() if self.fecha_movimiento else None
        }
