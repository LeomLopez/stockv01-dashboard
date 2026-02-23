import psycopg2

conn = psycopg2.connect('postgresql://neondb_owner:npg_a6LcC7FHKsAQ@ep-super-art-ac4lk2u9-pooler.sa-east-1.aws.neon.tech/horti_db?sslmode=require&channel_binding=require')
cur = conn.cursor()

# Buscar batata
print("=== BÚSQUEDA: productos con 'batata' ===")
cur.execute("SELECT nombre, cantidad, unidade, grupo, fecha_producto FROM stock_actual WHERE nombre ILIKE '%batata%'")
rows = cur.fetchall()
if rows:
    for row in rows:
        print(f"{row[0]} | {row[1]} {row[2]} | {row[3]} | {row[4]}")
else:
    print("No hay registros con 'batata'")

# Todos los productos
print("\n=== TODOS LOS PRODUCTOS (50 registros) ===")
cur.execute("SELECT nombre, cantidad, unidade, grupo, fecha_producto FROM stock_actual ORDER BY nombre")
rows = cur.fetchall()
for row in rows:
    print(f"{row[0]:25} | {row[1]:5.0f} {row[2]:5} | {row[3]} | {row[4]}")

cur.close()
conn.close()
