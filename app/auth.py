"""
Módulo de autenticación
"""

from werkzeug.security import generate_password_hash, check_password_hash

# Usuario admin hardcodeado
ADMIN_USER = {
    'username': 'admin',
    'password': generate_password_hash('admin123')
}


def verify_credentials(username, password):
    """
    Verificar credenciales del usuario
    
    Args:
        username: nombre de usuario
        password: contraseña en texto plano
    
    Returns:
        dict con datos del usuario si es válido, None si no
    """
    if username == ADMIN_USER['username']:
        if check_password_hash(ADMIN_USER['password'], password):
            return {
                'username': ADMIN_USER['username'],
                'role': 'admin'
            }
    return None
