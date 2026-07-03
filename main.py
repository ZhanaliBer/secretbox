from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import glob, re, os, json, requests
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

# Разрешаем фронтенду общаться с бэкендом
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

def parse_to_dict(filename):
    items = {}
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line in f:
                parts = re.split(r'\s*[-—–]\s*', line.strip())
                if len(parts) >= 2: items[parts[0].strip()] = parts[-1].strip()
    except: pass
    return items

@app.get("/coffee-shops")
def get_shops():
    files = glob.glob(os.path.join(DATA_DIR, "*_menu.txt"))
    return {"shops": [os.path.basename(f).replace("_menu.txt", "") for f in files]}

@app.get("/menu/{shop_name}")
def get_menu(shop_name: str):
    data = parse_to_dict(os.path.join(DATA_DIR, f"{shop_name}_menu.txt"))
    return {"menu": data}

@app.get("/analytics/compare")
def compare_prices():
    # 1. Проверяем наличие закэшированной аналитики
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
            
    # 2. Если кэша нет, инициируем запрос к нейросети
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
        
    # 3. Сохраняем результат для будущих запросов
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=4)
        
    return result