from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()
url = os.getenv('DATABASE_URL')
print('Using DB URL:', url[:60] + '...')
eng = create_engine(url)
with eng.connect() as conn:
    res = conn.execute(text('select count(*) from stock_actual'))
    print('count SQL:', res.scalar())
    res2 = conn.execute(text("select grupo, count(*) from stock_actual group by grupo order by grupo"))
    for row in res2:
        print(row)
