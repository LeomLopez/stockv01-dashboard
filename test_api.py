"""
Script de pruebas para los endpoints API
Ejecutar: python test_api.py
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:5000'

def print_response(response, title):
    """Imprimir respuesta formateada"""
    print(f'\n{"=" * 80}')
    print(f'📋 {title}')
    print(f'{"=" * 80}')
    print(f'Status Code: {response.status_code}')
    try:
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    except:
        print(response.text)


def test_endpoints():
    """Probar endpoints API"""
    print('🧪 Iniciando pruebas de API...\n')
    
    try:
        # Test 1: Endpoint raíz
        print('✓ Test 1: GET /')
        r = requests.get(f'{BASE_URL}/')
        print_response(r, 'Endpoint raíz - App funcionando')
        
        # Test 2: GET /api/stock sin filtros
        print('\n✓ Test 2: GET /api/stock (sin filtros)')
        r = requests.get(f'{BASE_URL}/api/stock')
        print_response(r, 'Stock actual - Sin filtros')
        
        # Test 3: GET /api/stock con filtro grupo
        print('\n✓ Test 3: GET /api/stock?grupo=Electrónica')
        r = requests.get(f'{BASE_URL}/api/stock?grupo=Electrónica')
        print_response(r, 'Stock actual - Filtrado por grupo')
        
        # Test 4: GET /api/stock con paginación
        print('\n✓ Test 4: GET /api/stock?limit=5&offset=0')
        r = requests.get(f'{BASE_URL}/api/stock?limit=5&offset=0')
        print_response(r, 'Stock actual - Con paginación')
        
        # Test 5: GET /api/stock con múltiples filtros
        print('\n✓ Test 5: GET /api/stock?grupo=Periféricos&producto=Mouse&limit=10')
        r = requests.get(f'{BASE_URL}/api/stock?grupo=Periféricos&producto=Mouse&limit=10')
        print_response(r, 'Stock actual - Múltiples filtros')
        
        # Test 6: GET /api/movimientos sin filtros
        print('\n✓ Test 6: GET /api/movimientos (sin filtros)')
        r = requests.get(f'{BASE_URL}/api/movimientos')
        print_response(r, 'Movimientos - Sin filtros')
        
        # Test 7: GET /api/movimientos con tipo
        print('\n✓ Test 7: GET /api/movimientos?tipo=entrada')
        r = requests.get(f'{BASE_URL}/api/movimientos?tipo=entrada')
        print_response(r, 'Movimientos - Filtrados por tipo')
        
        # Test 8: GET /api/movimientos con rango de fechas
        fecha_desde = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        fecha_hasta = datetime.now().strftime('%Y-%m-%d')
        print(f'\n✓ Test 8: GET /api/movimientos?fecha_desde={fecha_desde}&fecha_hasta={fecha_hasta}')
        r = requests.get(f'{BASE_URL}/api/movimientos?fecha_desde={fecha_desde}&fecha_hasta={fecha_hasta}')
        print_response(r, 'Movimientos - Rango de fechas')
        
        # Test 9: GET /api/movimientos con múltiples filtros
        print('\n✓ Test 9: GET /api/movimientos?tipo=salida&grupo=Accesorios&limit=5')
        r = requests.get(f'{BASE_URL}/api/movimientos?tipo=salida&grupo=Accesorios&limit=5')
        print_response(r, 'Movimientos - Múltiples filtros')
        
        # Test 10: Error - parámetro limit inválido
        print('\n✓ Test 10: GET /api/stock?limit=2000 (error esperado)')
        r = requests.get(f'{BASE_URL}/api/stock?limit=2000')
        print_response(r, 'Error - Limit fuera de rango')
        
        # Test 11: Error - tipo de movimiento inválido
        print('\n✓ Test 11: GET /api/movimientos?tipo=invalido (error esperado)')
        r = requests.get(f'{BASE_URL}/api/movimientos?tipo=invalido')
        print_response(r, 'Error - Tipo de movimiento inválido')
        
        # Test 12: Error - fechas en orden incorrecto
        print('\n✓ Test 12: GET /api/movimientos?fecha_desde=2025-12-01&fecha_hasta=2025-01-01 (error esperado)')
        r = requests.get(f'{BASE_URL}/api/movimientos?fecha_desde=2025-12-01&fecha_hasta=2025-01-01')
        print_response(r, 'Error - Fechas en orden incorrecto')
        
        # Test 13: Ruta no encontrada
        print('\n✓ Test 13: GET /api/inexistente (404 esperado)')
        r = requests.get(f'{BASE_URL}/api/inexistente')
        print_response(r, 'Error - Ruta no encontrada')
        
        # Test 14: Método no permitido
        print('\n✓ Test 14: POST /api/stock (405 esperado)')
        r = requests.post(f'{BASE_URL}/api/stock', json={})
        print_response(r, 'Error - Método no permitido')
        
        print('\n\n✨ Pruebas completadas!\n')
        
    except requests.exceptions.ConnectionError:
        print('❌ Error: No se puede conectar al servidor.')
        print('   Asegúrate de que la aplicación está ejecutándose en http://localhost:5000')
    except Exception as e:
        print(f'❌ Error durante las pruebas: {str(e)}')


if __name__ == '__main__':
    test_endpoints()
