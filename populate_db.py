"""
Script para poblador de base de datos con datos de ejemplo
Ejecutar: python populate_db.py
"""

import os
import sys
from datetime import datetime, timedelta
import random

# Agregar el directorio del proyecto al path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.models import db, StockActual, Movimiento, Product

def populate_db():
    """Poblar base de datos con datos de ejemplo"""
    app = create_app('development')
    
    with app.app_context():
        # Limpiar tablas existentes (solo para desarrollo)
        print('🗑️  Limpiando tablas existentes...')
        db.drop_all()
        db.create_all()
        
        # Crear productos
        print('🛍️  Creando productos...')
        productos = [
            Product(name='Laptop', description='Laptop gaming', quantity=10, price=1500.00),
            Product(name='Mouse', description='Mouse inalámbrico', quantity=50, price=25.00),
            Product(name='Teclado', description='Teclado mecánico', quantity=30, price=80.00),
            Product(name='Monitor', description='Monitor 27 pulgadas', quantity=15, price=300.00),
            Product(name='Cable USB', description='Cable USB tipo C', quantity=100, price=5.00),
        ]
        db.session.add_all(productos)
        db.session.commit()
        print(f'✅ {len(productos)} productos creados')
        
        # Crear stock actual
        print('📦 Creando stock actual...')
        grupos = ['Electrónica', 'Accesorios', 'Periféricos']
        productos_nombres = [p.name for p in productos]
        contenedores = ['Almacén A', 'Almacén B', 'Vitrina 1', 'Vitrina 2']
        
        stock_items = []
        for _ in range(15):
            item = StockActual(
                grupo=random.choice(grupos),
                producto=random.choice(productos_nombres),
                contenedor=random.choice(contenedores),
                cantidad=random.randint(1, 100),
                fecha_producto=datetime.utcnow() - timedelta(days=random.randint(0, 30))
            )
            stock_items.append(item)
        
        db.session.add_all(stock_items)
        db.session.commit()
        print(f'✅ {len(stock_items)} registros de stock creados')
        
        # Crear movimientos
        print('📝 Creando movimientos...')
        tipos_movimiento = ['entrada', 'salida', 'ajuste']
        
        movimientos = []
        for _ in range(20):
            mov = Movimiento(
                tipo=random.choice(tipos_movimiento),
                grupo=random.choice(grupos),
                producto=random.choice(productos_nombres),
                cantidad=random.randint(1, 50),
                descripcion=f'Movimiento de ejemplo',
                fecha=datetime.utcnow() - timedelta(days=random.randint(0, 60)),
                usuario='admin',
                referencia=f'REF{random.randint(1000, 9999)}'
            )
            movimientos.append(mov)
        
        db.session.add_all(movimientos)
        db.session.commit()
        print(f'✅ {len(movimientos)} movimientos creados')
        
        print('\n✨ Base de datos poblada exitosamente!')
        print(f'\nTotal de registros:')
        print(f'  - Productos: {Product.query.count()}')
        print(f'  - Stock Actual: {StockActual.query.count()}')
        print(f'  - Movimientos: {Movimiento.query.count()}')


if __name__ == '__main__':
    try:
        populate_db()
    except Exception as e:
        print(f'❌ Error: {str(e)}')
        sys.exit(1)
