import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

DREAMS_FILE = os.path.join(DATA_DIR, 'dreams.json')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
COMMENTS_FILE = os.path.join(DATA_DIR, 'comments.json')

ADMIN_PASSWORD = 'admin123'
INITIAL_COINS = 1000
INCUBATE_COST = 200
INVESTMENT_THRESHOLD = 3
