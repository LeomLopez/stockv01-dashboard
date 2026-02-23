"""
Script para inspeccionar la estructura de la base de datos
"""

import psycopg2
from psycopg2 import sql
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

def inspect_database():
    """Inspeccionar tablas y columnas de la base de datos"""
    
    # Conexión directa a la BD
    db_url = 'postgresql://neondb_owner:npg_a6LcC7FHKsAQ@ep-odd-tooth-acgdk6ac-pooler.sa-east-1.aws.neon.tech/horti_db?sslmode=require&channel_binding=require'
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Obtener lista de tablas
        cur.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        tables = cur.fetchall()
        print('📊 Tablas en la base de datos:\n')
        
        for (table_name,) in tables:
            print(f'\n🔹 Tabla: {table_name}')
            print('-' * 50)
            
            # Obtener columnas de la tabla
            cur.execute(f"""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = '{table_name}'
                ORDER BY ordinal_position
            """)
            
            columns = cur.fetchall()
            for col_name, col_type, nullable in columns:
                nullable_str = '✓' if nullable == 'YES' else '✗'
                print(f'   • {col_name:<20} {col_type:<15} (nullable: {nullable_str})')
            
            # Contar registros
            cur.execute(f'SELECT COUNT(*) FROM {table_name}')
            count = cur.fetchone()[0]
            print(f'\n   {count} registros')
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f'❌ Error: {str(e)}')
        sys.exit(1)


if __name__ == '__main__':
    inspect_database()
