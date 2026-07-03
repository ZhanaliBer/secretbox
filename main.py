from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
import glob, re, os, json, requests, sqlite3, jwt, datetime
import bcrypt
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

# Настройка безопасности CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = "objects"
AI_TOKEN = os.environ.get("AI_TOKEN")
CACHE_FILE = "analytics_cache.json"

# Конфигурация криптографии
SECRET_KEY = "stark-industries-quantum-encryption-key"
ALGORITHM = "HS256"
DB_FILE = "users.db"

# Автономная инициализация базы данных SQL
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

def parse_to_dict(filename):
    items = {}
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line in f:
                parts = re.split(r'\s*[-—–]\s*', line.strip())
                if len(parts) >= 2: items[parts[0].strip()] = parts[-1].strip()
    except: pass
    return items

# Проверка цифрового пропуска (JWT)
def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Доступ заблокирован: требуется авторизация")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Срок действия ключа доступа истек")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Критическая ошибка: неверный ключ доступа")

# Маршрут РЕГИСТРАЦИИ (Прямое шифрование bcrypt)
@app.post("/register")
def register(data: dict):
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Логин и пароль не могут быть пустыми")
        
    # Генерируем соль и хэшируем пароль напрямую
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, hashed_password))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Этот оператор уже зарегистрирован в системе")
    finally:
        conn.close()
        
    return {"status": "success", "detail": "Оператор успешно внесен в базу данных"}

# Маршрут АВТОРИЗАЦИИ (Прямая валидация bcrypt)
@app.post("/login")
def login(data: dict):
    username = data.get("username")
    password = data.get("password")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    
    # Сравниваем введенный пароль с хэшем из базы
    if not row or not bcrypt.checkpw(password.encode('utf-8'), row[0].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Неверное имя оператора или крипто-ключ")
        
    # Создаем токен на 12 часов
    exp = datetime.datetime.utcnow() + datetime.timedelta(hours=12)
    token = jwt.encode({"sub": username, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token}

@app.get("/coffee-shops")
def get_shops(username: str = Depends(verify_token)):
    files = glob.glob(os.path.join(DATA_DIR, "*_menu.txt"))
    return {"shops": [os.path.basename(f).replace("_menu.txt", "") for f in files]}

@app.get("/menu/{shop_name}")
def get_menu(shop_name: str, username: str = Depends(verify_token)):
    data = parse_to_dict(os.path.join(DATA_DIR, f"{shop_name}_menu.txt"))
    return {"menu": data}

@app.get("/analytics/compare")
def compare_prices(username: str = Depends(verify_token)):
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
            
    files = glob.glob(os.path.join(DATA_DIR, "*_menu.txt"))
    all_menus = {os.path.basename(f).replace("_menu.txt", ""): parse_to_dict(f) for f in files}
    
    prompt = f"Нормализуй названия на русский и найди пересечения: {json.dumps(all_menus, ensure_ascii=False)}. Формат: {{\"common_items\": [{{\"item_name\": \"...\", \"prices\": {{\"Кофейня\": \"цена\"}}}}]}}"
    
    headers = {"Authorization": f"Bearer {AI_TOKEN}", "Content-Type": "application/json"}
    resp = requests.post("https://llm.alem.ai/v1/chat/completions", json={"model": "gemma4", "messages": [{"role": "user", "content": prompt}], "temperature": 0.1}, headers=headers)
    
    report = resp.json()['choices'][0]['message']['content'].replace("```json", "").replace("```", "")
    report = json.loads(report)
    
    result = []
    for item in report.get('common_items', []):
        row = {"Напиток": item["item_name"]}
        row.update(item["prices"])
        prices = [int(re.sub(r'\D', '', str(p))) for p in item["prices"].values() if re.sub(r'\D', '', str(p))]
        if prices: row["Разброс"] = max(prices) - min(prices)
        result.append(row)
        
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=4)
        
    return result