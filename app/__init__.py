from flask import Flask
from config import config
from app.models import db

def create_app(config_name='development'):
    """Factory function para crear la aplicación Flask"""
    app = Flask(__name__, 
                template_folder='templates',
                static_folder='static')
    
    # Cargar configuración
    app.config.from_object(config[config_name])
    
    # Inicializar extensiones
    db.init_app(app)
    
    # Registrar blueprints
    with app.app_context():
        from app.routes import main_bp
        from app.api import api_bp
        from app.dashboard_api import dashboard_bp
        
        app.register_blueprint(main_bp)
        app.register_blueprint(api_bp)
        app.register_blueprint(dashboard_bp)
    
    # Crear tablas
    with app.app_context():
        db.create_all()
    
    return app
