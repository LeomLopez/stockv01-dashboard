# Stockv01 Management - Aplicación de Gestión de Inventario

Una aplicación web moderna construida con **Flask**, **PostgreSQL** y **Bootstrap 5** para gestionar inventario de productos.

## 🚀 Características

- ✅ Gestión CRUD completa de productos
- ✅ Interfaz responsive con Bootstrap 5
- ✅ Base de datos PostgreSQL robusta con SQLAlchemy ORM
- ✅ Estructura profesional de proyecto
- ✅ Configuración separada por ambiente (desarrollo, producción, testing)
- ✅ Manejo robusto de errores
- ✅ Autenticación con usuario y contraseña
- ✅ Sesiones seguras con Flask
- ✅ Modo oscuro/claro con persistencia
- ✅ Modo debug activado para desarrollo

## 📋 Requisitos Previos

- Python 3.8+
- PostgreSQL 12+ instalado y ejecutándose
- pip o conda para gestión de paquetes

## 🛠️ Instalación

### 1. Activar el entorno virtual

**PowerShell:**

```powershell
.\venv\Scripts\Activate.ps1
```

**CMD:**

```cmd
.\venv\Scripts\activate.bat
```

**Bash/Git Bash:**

```bash
source venv/Scripts/activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar la base de datos

#### Opción A: PostgreSQL Local (Recomendado)

1. **Crear base de datos en PostgreSQL:**

```sql
-- Conectarse a PostgreSQL
psql -U postgres

-- Crear base de datos
CREATE DATABASE inventory_db;

-- Crear usuario (opcional)
CREATE USER inventory_user WITH PASSWORD 'tu_password_seguro';
ALTER ROLE inventory_user SET client_encoding TO 'utf8';
ALTER ROLE inventory_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE inventory_user SET default_transaction_deferrable TO on;
ALTER ROLE inventory_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;
```

2. **Actualizar `.env` con tus credenciales:**

```env
FLASK_ENV=development
FLASK_APP=run.py
SECRET_KEY=your-secret-key-change-in-production
DATABASE_URL=postgresql://inventory_user:tu_password_seguro@localhost:5432/inventory_db
```

#### Opción B: PostgreSQL con Docker (Alternativa)

```bash
docker run --name inventory_postgres \
  -e POSTGRES_USER=inventory_user \
  -e POSTGRES_PASSWORD=tu_password_seguro \
  -e POSTGRES_DB=inventory_db \
  -p 5432:5432 \
  -d postgres:15
```

## ▶️ Ejecución

### Iniciar la aplicación

```bash
python run.py
```

La aplicación estará disponible en: **http://localhost:5000**

### Probar la aplicación

1. **Página de inicio:** http://localhost:5000/
2. **Productos:** http://localhost:5000/products
3. **Agregar producto:** http://localhost:5000/product/add
4. **Acerca de:** http://localhost:5000/about

## 📁 Estructura del Proyecto

```
inventory_web/
├── app/
│   ├── __init__.py           # Factory pattern para crear app Flask
│   ├── models.py             # Modelo de base de datos (Product)
│   ├── routes.py             # Rutas principales
│   ├── templates/            # Plantillas HTML
│   │   ├── base.html         # Plantilla base con Bootstrap
│   │   ├── index.html        # Página de inicio
│   │   ├── products.html     # Listado de productos
│   │   ├── add_product.html  # Formulario de productos
│   │   └── about.html        # Página de información
│   └── static/
│       ├── css/
│       │   └── style.css     # Estilos personalizados
│       └── js/
│           └── script.js     # JavaScript personalizado
├── config.py                  # Configuración (dev, prod, test)
├── run.py                      # Punto de entrada
├── requirements.txt            # Dependencias del proyecto
├── .env                        # Variables de entorno
└── README.md                   # Este archivo
```

## 🔧 Configuración

El archivo `config.py` define tres ambientes:

- **development:** Debug activo, validaciones menos estrictas
- **production:** Debug desactivado, seguridad activada
- **testing:** Usa SQLite en memoria para pruebas

### Variables de entorno (`.env`)

```env
FLASK_ENV=development              # development, production o testing
FLASK_APP=run.py                   # Archivo principal
SECRET_KEY=tu-clave-secreta        # Clave para sesiones
DATABASE_URL=postgresql://...      # URL conexión PostgreSQL
```

## 💾 Modelos de Base de Datos

### Product

```python
- id: Integer (Primary Key)
- name: String (Único, Requerido)
- description: Text
- quantity: Integer
- price: Float (Requerido)
- created_at: DateTime
- updated_at: DateTime
```

## 📝 Rutas Disponibles

| Ruta                   | Método    | Descripción           |
| ---------------------- | --------- | --------------------- |
| `/`                    | GET       | Página de inicio      |
| `/products`            | GET       | Listar productos      |
| `/product/add`         | GET, POST | Agregar producto      |
| `/product/<id>/edit`   | GET, POST | Editar producto       |
| `/product/<id>/delete` | GET, POST | Eliminar producto     |
| `/about`               | GET       | Información de la app |

## 🔌 Endpoints API (Solo Lectura)

### GET /api/stock

Obtiene el stock actual de productos con filtros opcionales, ordenamiento y paginación.

**Parámetros de Query:**

- `grupo` (opcional): Filtrar por grupo de productos
- `producto` (opcional): Filtrar por nombre de producto
- `contenedor` (opcional): Filtrar por contenedor
- `limit` (opcional, default: 10, max: 1000): Cantidad de registros por página
- `offset` (opcional, default: 0): Desplazamiento de registros

**Ordenamiento:** Ascendente por `fecha_producto`

**Ejemplo de uso:**

```bash
# Sin filtros
curl http://localhost:5000/api/stock

# Con filtros
curl "http://localhost:5000/api/stock?grupo=Electrónica&producto=Laptop&limit=10&offset=0"

# Con paginación
curl "http://localhost:5000/api/stock?limit=20&offset=10"
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "grupo": "Electrónica",
      "producto": "Laptop",
      "contenedor": "Almacén A",
      "cantidad": 45,
      "fecha_producto": "2026-02-15T10:30:00",
      "created_at": "2026-02-20T14:22:00",
      "updated_at": "2026-02-20T14:22:00"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 10,
    "offset": 0,
    "returned": 10
  },
  "timestamp": "2026-02-22T15:30:45.123456"
}
```

---

### GET /api/movimientos

Obtiene los movimientos de inventario con filtros avanzados, ordenamiento descendente y paginación.

**Parámetros de Query:**

- `fecha_desde` (opcional): Fecha inicial (YYYY-MM-DD o YYYY-MM-DD HH:MM:SS)
- `fecha_hasta` (opcional): Fecha final (YYYY-MM-DD o YYYY-MM-DD HH:MM:SS)
- `tipo` (opcional): Tipo de movimiento (entrada, salida, ajuste)
- `grupo` (opcional): Filtrar por grupo de productos
- `producto` (opcional): Filtrar por nombre de producto
- `limit` (opcional, default: 10, max: 1000): Cantidad de registros por página
- `offset` (opcional, default: 0): Desplazamiento de registros

**Ordenamiento:** Descendente por `fecha`

**Ejemplo de uso:**

```bash
# Sin filtros
curl http://localhost:5000/api/movimientos

# Por tipo de movimiento
curl "http://localhost:5000/api/movimientos?tipo=entrada"

# Por rango de fechas
curl "http://localhost:5000/api/movimientos?fecha_desde=2026-02-01&fecha_hasta=2026-02-28"

# Múltiples filtros
curl "http://localhost:5000/api/movimientos?tipo=salida&grupo=Accesorios&limit=20&offset=0"

# Con paginación
curl "http://localhost:5000/api/movimientos?limit=50&offset=100"
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tipo": "entrada",
      "grupo": "Electrónica",
      "producto": "Laptop",
      "cantidad": 10,
      "descripcion": "Entrada de compra",
      "fecha": "2026-02-20T09:15:30",
      "usuario": "admin",
      "referencia": "PO-2026-001",
      "created_at": "2026-02-20T09:16:00"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "returned": 10
  },
  "timestamp": "2026-02-22T15:30:45.123456"
}
```

---

## 🚨 Manejo de Errores

### Error 400 - Bad Request

Se devuelve cuando los parámetros son inválidos.

**Ejemplo:**

```json
{
  "success": false,
  "error": "Parámetro limit debe estar entre 1 y 1000",
  "timestamp": "2026-02-22T15:30:45.123456"
}
```

### Error 404 - Not Found

Se devuelve cuando la ruta no existe.

```json
{
  "success": false,
  "error": "Endpoint no encontrado",
  "timestamp": "2026-02-22T15:30:45.123456"
}
```

### Error 405 - Method Not Allowed

Se devuelve cuando se intenta usar POST, PUT, DELETE, etc. en endpoints de solo lectura.

```json
{
  "success": false,
  "error": "Método HTTP no permitido. Solo se permiten solicitudes GET",
  "timestamp": "2026-02-22T15:30:45.123456"
}
```

### Error 500 - Internal Server Error

Se devuelve en caso de error no manejado.

```json
{
  "success": false,
  "error": "Error interno del servidor: [mensaje de error]",
  "timestamp": "2026-02-22T15:30:45.123456"
}
```

## 🐛 Manejo de Errores

La aplicación incluye:

- ✅ Validación de formularios HTML5
- ✅ Validación de servidor
- ✅ Rollback automático en errores de BD
- ✅ Mensajes de error/éxito con Flash
- ✅ Páginas 404 para recursos no encontrados
- ✅ Try-catch en operaciones críticas

## 🚨 Troubleshooting

### Error: "no existe el módulo psycopg2"

```bash
pip install psycopg2-binary
```

### Error: "No se puede conectar a PostgreSQL"

1. Verifica que PostgreSQL está ejecutándose
2. Revisa credenciales en `.env`
3. Intenta conectar manualmente: `psql -U usuario -h localhost`

### Error: "Base de datos no existe"

```sql
CREATE DATABASE inventory_db;
```

### Error: Puerto 5000 en uso

```bash
python run.py --port 5001
```

## 🔒 Seguridad (Importante para Producción)

## 🔐 Autenticación

La aplicación ahora incluye autenticación simple con sesiones de Flask.

### Credenciales de Prueba

Por defecto, la aplicación viene con un usuario administrativo preconfigurado:

- **Usuario:** `admin`
- **Contraseña:** `admin123`

### Cómo Usar

1. Al iniciar la aplicación, serás redirigido automáticamente a la página de login
2. Ingresa las credenciales de prueba
3. Una vez autenticado, podrás acceder al dashboard, stock y movimientos
4. Usa el botón "Cerrar Sesión" en la esquina superior derecha para cerrar tu sesión

### Rutas Protegidas

Las siguientes rutas requieren autenticación:

- `/dashboard` - Panel de control
- `/stock` - Gestión de stock
- `/movimientos` - Registro de movimientos
- `/products` - Gestión de productos

### Seguridad

- Las contraseñas se hashean con `werkzeug.security`
- Las sesiones son HTTPOnly y seguras
- CSRF protection habilitado

Antes de desplegar a producción:

1. Cambiar `SECRET_KEY` en `.env`
2. Cambiar `DEBUG = False` en config.py
3. Usar HTTPS
4. Configurar CORS adecuadamente
5. Validar y sanitizar todas las entradas
6. Usar restricciones de CSRF

## 📚 Próximas Mejoras

- [x] Autenticación de usuarios
- [ ] Sistema de reportes
- [ ] Exportar a CSV/Excel
- [ ] Búsqueda y filtrado avanzado
- [ ] API REST
- [ ] Validación con WTForms
- [ ] Pruebas unitarias
- [ ] Dockerización

## 💡 Comandos Útiles

```bash
# Ver versión de Flask
pip show flask

# Actualizar dependencias
pip install --upgrade -r requirements.txt

# Generar requirements.txt (si lo necesitas actualizar)
pip freeze > requirements.txt

# Ejecutar con puerto específico
FLASK_ENV=production python run.py
```

## 📞 Soporte

Para reportar problemas o sugerencias, crea un issue en el repositorio.

---

**Creado con ❤️ Febrero 2026**
#   s t o c k v 0 1 - d a s h b o a r d  
 