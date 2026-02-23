from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from functools import wraps
from app.models import db, Product, StockActual
from app.auth import verify_credentials

main_bp = Blueprint('main', __name__)


def login_required(f):
    """Decorador para proteger rutas que requieren autenticación"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            flash('Debes iniciar sesión para acceder a esta página', 'warning')
            return redirect(url_for('main.login'))
        return f(*args, **kwargs)
    return decorated_function


@main_bp.route('/')
def index():
    """Página de inicio - redirige a login o dashboard"""
    if 'user' in session:
        return redirect(url_for('main.dashboard'))
    return redirect(url_for('main.login'))


@main_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Página de login"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('Usuario y contraseña son requeridos', 'error')
            return render_template('login.html')
        
        user = verify_credentials(username, password)
        
        if user:
            session['user'] = user
            session.permanent = True
            flash(f'Bienvenido {username}', 'success')
            return redirect(url_for('main.dashboard'))
        else:
            flash('Usuario o contraseña incorrectos', 'error')
            return render_template('login.html')
    
    return render_template('login.html')


@main_bp.route('/logout')
def logout():
    """Cerrar sesión"""
    session.clear()
    flash('Has cerrado sesión', 'info')
    return redirect(url_for('main.login'))


@main_bp.route('/dashboard')
@login_required
def dashboard():
    """Página de dashboard con estadísticas"""
    return render_template('dashboard.html')


@main_bp.route('/stock')
@login_required
def stock():
    """Página de stock con filtros dinámicos"""
    # Obtener lista de grupos existentes en la base de datos
    grupos_q = db.session.query(StockActual.grupo).distinct().order_by(StockActual.grupo).all()
    grupos = [g[0] for g in grupos_q if g and g[0]]
    return render_template('stock.html', grupos=grupos)


@main_bp.route('/movimientos')
@login_required
def movimientos():
    """Página de movimientos con filtros"""
    return render_template('movimientos.html')

@main_bp.route('/products')
def products():
    """Listar todos los productos"""
    products = Product.query.all()
    return render_template('products.html', products=products)

@main_bp.route('/product/add', methods=['GET', 'POST'])
def add_product():
    """Agregar un nuevo producto"""
    if request.method == 'POST':
        try:
            name = request.form.get('name')
            description = request.form.get('description')
            quantity = int(request.form.get('quantity', 0))
            price = float(request.form.get('price'))
            
            # Validar que el nombre no esté vacío
            if not name:
                flash('El nombre del producto es requerido', 'error')
                return render_template('add_product.html', is_edit=False, product=None)
            
            # Verificar si el producto ya existe
            existing = Product.query.filter_by(name=name).first()
            if existing:
                flash('Un producto con ese nombre ya existe', 'error')
                return render_template('add_product.html', is_edit=False, product=None)
            
            # Crear nuevo producto
            product = Product(
                name=name,
                description=description,
                quantity=quantity,
                price=price
            )
            
            db.session.add(product)
            db.session.commit()
            
            flash(f'Producto "{name}" creado exitosamente', 'success')
            return redirect(url_for('main.products'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error al crear producto: {str(e)}', 'error')
            return render_template('add_product.html', is_edit=False, product=None)
    
    return render_template('add_product.html', is_edit=False, product=None)

@main_bp.route('/product/<int:id>/edit', methods=['GET', 'POST'])
def edit_product(id):
    """Editar un producto existente"""
    product = Product.query.get_or_404(id)
    
    if request.method == 'POST':
        try:
            product.name = request.form.get('name')
            product.description = request.form.get('description')
            product.quantity = int(request.form.get('quantity', 0))
            product.price = float(request.form.get('price'))
            
            db.session.commit()
            
            flash(f'Producto "{product.name}" actualizado exitosamente', 'success')
            return redirect(url_for('main.products'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error al editar producto: {str(e)}', 'error')
    
    return render_template('add_product.html', is_edit=True, product=product)

@main_bp.route('/product/<int:id>/delete', methods=['POST', 'GET'])
def delete_product(id):
    """Eliminar un producto"""
    product = Product.query.get_or_404(id)
    
    try:
        db.session.delete(product)
        db.session.commit()
        flash(f'Producto "{product.name}" eliminado exitosamente', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error al eliminar producto: {str(e)}', 'error')
    
    return redirect(url_for('main.products'))

@main_bp.route('/about')
def about():
    """Página de información"""
    return render_template('about.html')
