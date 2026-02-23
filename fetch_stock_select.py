import requests
from bs4 import BeautifulSoup

LOGIN_URL = 'http://localhost:5000/login'
STOCK_URL = 'http://localhost:5000/stock'

s = requests.Session()
# Get login page to initialize cookies
r = s.get(LOGIN_URL)
# Post credentials
resp = s.post(LOGIN_URL, data={'username': 'admin', 'password': 'admin123'}, allow_redirects=True)
if resp.status_code not in (200, 302):
    print('Login failed, status', resp.status_code)
    exit(1)

r = s.get(STOCK_URL)
if r.status_code != 200:
    print('Failed to fetch stock page', r.status_code)
    exit(1)

soup = BeautifulSoup(r.text, 'html.parser')
select = soup.find('select', {'id': 'grupoFilter'})
if not select:
    print('No se encontró el select grupoFilter en el HTML (es posible que la página redirija)')
    print('--- Inicio de HTML ---')
    print(r.text[:1000])
    print('--- Fin de HTML ---')
    exit(0)

options = [opt.get_text(strip=True) for opt in select.find_all('option')]
print('Options found:', options)
print('Contains Electrónica?', 'Electrónica' in options)
