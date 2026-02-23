import psycopg2

conn = psycopg2.connect('postgresql://neondb_owner:npg_a6LcC7FHKsAQ@ep-super-art-ac4lk2u9-pooler.sa-east-1.aws.neon.tech/horti_db?sslmode=require&channel_binding=require')
cur = conn.cursor()

# Verificar grupo HOR
print("=== GRUPO HOR (HORTALIZAS) ===")
cur.execute("SELECT nombre, cantidad, unidade, fecha_producto FROM stock_actual WHERE grupo = 'HOR' ORDER BY fecha_producto DESC LIMIT 20")
rows = cur.fetchall()
for row in rows:
    print(f"{row[0]:25} | {row[1]:5} {row[2]:5} | {row[3]}")

# Contar por grupo
print("\n=== CONTEO POR GRUPO ===")
cur.execute("SELECT grupo, COUNT(*) as cantidad FROM stock_actual GROUP BY grupo ORDER BY grupo")
rows = cur.fetchall()
for row in rows:
    print(f"{row[0]}: {row[1]} registros")

# Total
print("\n=== TOTAL GENERAL ===")
cur.execute("SELECT COUNT(*) FROM stock_actual")
total = cur.fetchone()[0]
print(f"Total de registros: {total}")

cur.close()
conn.close()
