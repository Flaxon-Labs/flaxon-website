# Full-stack capstone: a guessing-game SPA

Finish the course by building and deploying a complete application: a single-page guessing game, a Python API, SQLite persistence, and protected Flaxon Admin for managing completed results.

This capstone uses **Flaxon + Jinax + browser JavaScript**. Jinax renders the initial HTML document; JavaScript handles navigation and API calls without reloading the page. No Node.js build is required. The earlier Teloce lessons remain available if you prefer compiled components. Backend-only users can reuse the API and replace the frontend.

## What you will build

- `/play`: start a round and guess a number from 1 to 100 in ten attempts.
- `/results`: see completed rounds played in the current browser tab.
- `/api/games`: create rounds; token-protected endpoints read state and accept guesses.
- `/admin/game_results`: authenticated result browsing and deletion. Scores cannot be manually created or edited.
- `/healthz`: Render's health check.

The server stores the secret number, hashes the access token, and calculates every score. The browser never receives an unfinished round's answer. Completed results and Admin users survive restarts using SQLite on persistent storage.

[Download the complete project](../../downloads/flaxon-guessing-game.zip). All required files are also included below, with their exact paths.

## 1. Set up locally

Use Python 3.11 or newer and Git. Extract the download into `guessing-game/`, then open a terminal there:

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:

```bash
source .venv/bin/activate
```

Install and initialize:

```bash
python -m pip install -r requirements.txt
python management.py migrate
python management.py createsuperuser
flaxon run app:app --reload
```

Enter your own Admin username, email, and strong password when prompted. Password input is hidden. There are no default credentials. Open <http://127.0.0.1:8000/play>. You can also start with `python -m flaxon run app:app --reload`.

The `.python-version` file selects Python 3.12 on Render and allows its latest available security patch. Keep your local Python installation updated as well.

The requirements pin the exact framework Git commit used to verify this tutorial, rather than assuming that a PyPI package with the same version number contains these APIs. Upgrade the pin deliberately after running the tests.

## 2. Understand the SPA and API

Jinax serves the same document at `/`, `/play`, and `/results`, so opening or refreshing a deep link works. JavaScript intercepts ordinary navigation clicks and uses `history.pushState()`; the browser Back button updates the visible view. API requests go to the same origin.

`POST /api/games` returns a random round ID and a one-time access token. Store that token only with the player's round in `sessionStorage`. Send it as `X-Game-Token` when reading or guessing. The public round ID alone cannot authorize access. Keep the token out of URLs and logs.

`POST /api/games/{id}/guesses` accepts `{"value": 50}`. The response includes `higher`, `lower`, or `correct`, the server's attempt count, and the round outcome. The number is revealed only when a round ends. A round expires after one hour. A SQLite transaction ensures concurrent guesses cannot overwrite the attempt count.

Mutation requests require `X-Game-Client: flaxon-spa` and reject foreign browser origins. Do not add permissive CORS to this app. The custom header causes cross-origin browser requests to preflight, which this application does not permit.

## 3. Complete project files

Create each file at the path shown. The download already contains this exact structure.

### `requirements.txt`

```text
flaxon[standard] @ git+https://github.com/Flaxon-Labs/flaxon.git@0c411ded6340a8f95deb8cc6ebba6ddd7d29ee34
```

### `.python-version`

```text
3.12
```

### `.gitignore`

```text
.venv/
__pycache__/
data/
backups/
.env
.pytest_cache/
```

### `database.py`

```python
"""SQLite persistence; each mutation is an atomic transaction."""
from contextlib import contextmanager
import hashlib
import os
from pathlib import Path
import secrets
import sqlite3
import time

DATA = Path(os.environ.get('DATA_DIR', 'data')).resolve()
DATA.mkdir(parents=True, exist_ok=True)
DB = DATA / 'games.sqlite3'

@contextmanager
def connect():
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()

def migrate():
    with connect() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('''CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, secret INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0, outcome TEXT NOT NULL DEFAULT 'playing',
            created_at INTEGER NOT NULL, completed_at INTEGER)''')

def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()

def public(row):
    return {key: row[key] for key in ('id', 'attempts', 'outcome', 'created_at', 'completed_at')}

def create():
    game_id, token = secrets.token_hex(16), secrets.token_urlsafe(32)
    with connect() as db:
        # Bound stale data growth. Finished results remain available in Admin.
        db.execute("DELETE FROM games WHERE outcome='playing' AND created_at < ?", (int(time.time()) - 3600,))
        db.execute('INSERT INTO games (id,token_hash,secret,created_at) VALUES (?,?,?,?)',
                   (game_id, token_hash(token), secrets.randbelow(100) + 1, int(time.time())))
        row = db.execute('SELECT * FROM games WHERE id=?', (game_id,)).fetchone()
    return {**public(row), 'token': token}

def access(db, game_id, token):
    row = db.execute('SELECT * FROM games WHERE id=?', (game_id,)).fetchone()
    if not row or not secrets.compare_digest(row['token_hash'], token_hash(token)):
        raise LookupError('Game not found or token invalid.')
    return row

def read(game_id, token):
    with connect() as db:
        return public(access(db, game_id, token))

def guess(game_id, token, value):
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        row = access(db, game_id, token)
        if row['outcome'] != 'playing':
            raise ValueError('This round is finished. Start a new game.')
        if row['created_at'] < int(time.time()) - 3600:
            raise ValueError('This round expired. Start a new game.')
        attempts = row['attempts'] + 1
        outcome = 'won' if value == row['secret'] else 'lost' if attempts >= 10 else 'playing'
        completed = int(time.time()) if outcome != 'playing' else None
        db.execute('UPDATE games SET attempts=?,outcome=?,completed_at=? WHERE id=?',
                   (attempts, outcome, completed, game_id))
        result = public(db.execute('SELECT * FROM games WHERE id=?', (game_id,)).fetchone())
        result['hint'] = 'correct' if value == row['secret'] else 'higher' if value < row['secret'] else 'lower'
        if outcome != 'playing':
            result['answer'] = row['secret']
        return result

class GameResult:
    """Admin adapter exposes completed scores, never tokens or secret numbers."""
    @classmethod
    async def get_instances(cls):
        with connect() as db:
            return [public(row) for row in db.execute("SELECT * FROM games WHERE outcome != 'playing' ORDER BY completed_at DESC")]

    @classmethod
    async def get_instance(cls, id):
        with connect() as db:
            row = db.execute("SELECT * FROM games WHERE id=? AND outcome != 'playing'", (str(id),)).fetchone()
            return public(row) if row else None

    @classmethod
    async def delete_instance(cls, id):
        with connect() as db:
            return db.execute("DELETE FROM games WHERE id=? AND outcome != 'playing'", (str(id),)).rowcount > 0

    @classmethod
    async def create_instance(cls, data):
        raise PermissionError('Results are produced by gameplay only.')

    @classmethod
    async def update_instance(cls, id, data):
        raise PermissionError('Scores cannot be edited.')
```

### `app.py`

```python
import asyncio
import os
from pathlib import Path
from flaxon import Flaxon, Request
from flaxon.http import JSONResponse
from flaxon.jinax import Jinax
from flaxon.admin import AdminConfig, AdminDashboard
from flaxon.admin.registry import Registry
from flaxon.middleware.trusted_hosts import TrustedHostsMiddleware
from flaxon.validation import Schema, fields
from flaxon.security.rate_limit import RateLimitMiddleware
import database

ROOT = Path(__file__).resolve().parent
PRODUCTION = os.environ.get('APP_ENV') == 'production'
SECRET = os.environ.get('FLAXON_SECRET_KEY')
if PRODUCTION and (not SECRET or len(SECRET) < 32):
    raise RuntimeError('Set FLAXON_SECRET_KEY to at least 32 random characters.')
app = Flaxon('Guess the number', debug=not PRODUCTION, config={'SECRET_KEY': SECRET})
hosts = ['localhost', '127.0.0.1', 'testserver'] if not PRODUCTION else []
hosts += [h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()]
if os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
    hosts.append(os.environ['RENDER_EXTERNAL_HOSTNAME'])
if not hosts:
    raise RuntimeError('Set ALLOWED_HOSTS for the production hostname.')
app.add_middleware(TrustedHostsMiddleware, allowed_hosts=hosts)
app.add_middleware(RateLimitMiddleware, requests=120, window_seconds=60)
app.use_templates(Jinax(str(ROOT / 'templates'), auto_reload=not PRODUCTION))
app.mount_static('/static', str(ROOT / 'static'))
registry = Registry()
registry.register(database.GameResult, name='game_results',
    list_display=['id', 'attempts', 'outcome', 'completed_at'],
    list_filter=['outcome'], search_fields=['id'],
    fields=['id', 'attempts', 'outcome', 'created_at', 'completed_at'],
    readonly_fields=['id', 'attempts', 'outcome', 'created_at', 'completed_at'],
    can_add=lambda *args: False, can_change=lambda *args: False)
admin = AdminDashboard(app, config=AdminConfig(site_title='Guessing Game Admin'),
    registry=registry, storage_path=str(database.DATA / 'admin.sqlite3'),
    upload_dir=str(database.DATA / 'uploads'), users=[], strict_permissions=True,
    cookie_secure=PRODUCTION, microservices=False)

class GuessInput(Schema):
    value = fields.IntField(required=True, minimum=1, maximum=100)

# Mutation requests need a same-origin custom header. No permissive CORS middleware.
def allowed_request(request):
    if request.headers.get('x-game-client') != 'flaxon-spa':
        return False
    origin = request.headers.get('origin')
    if origin:
        from urllib.parse import urlsplit
        parsed = urlsplit(origin)
        return parsed.netloc == request.headers.get('host') and parsed.scheme in ({'https'} if PRODUCTION else {'http','https'})
    return True

@app.get('/')
@app.get('/play')
@app.get('/results')
async def home(request: Request):
    return await request.render('index.html', {})

@app.get('/healthz')
async def health():
    return {'status': 'ok'}

@app.post('/api/games')
async def new_game(request: Request):
    if not allowed_request(request):
        return JSONResponse({'error': 'Same-origin game client required.'}, status_code=403)
    # In production, also configure edge rate limits (see the capstone guide).
    return JSONResponse(await asyncio.to_thread(database.create), status_code=201, headers={'Cache-Control': 'no-store'})

@app.get('/api/games/<game_id>')
async def game(request: Request, game_id: str):
    try:
        return JSONResponse(await asyncio.to_thread(database.read, game_id, request.headers.get('x-game-token', '')),
                            headers={'Cache-Control': 'no-store'})
    except LookupError as error:
        return JSONResponse({'error': str(error)}, status_code=404)

@app.post('/api/games/<game_id>/guesses')
async def submit_guess(request: Request, game_id: str, data: GuessInput):
    if not allowed_request(request):
        return JSONResponse({'error': 'Same-origin game client required.'}, status_code=403)
    try:
        result = await asyncio.to_thread(database.guess, game_id, request.headers.get('x-game-token', ''), data.to_dict()['value'])
        return JSONResponse(result, headers={'Cache-Control': 'no-store'})
    except LookupError as error:
        return JSONResponse({'error': str(error)}, status_code=404)
    except ValueError as error:
        return JSONResponse({'error': str(error)}, status_code=409)
```

### `management.py`

```python
"""Run migrations, bootstrap Admin, and back up SQLite safely."""
import argparse
import getpass
from pathlib import Path
import sqlite3
import database

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['migrate', 'createsuperuser', 'backup'])
    parser.add_argument('--destination', default='backups')
    args = parser.parse_args()
    if args.command == 'migrate':
        database.migrate()
        print('Game schema ready. Admin initializes its own store on startup.')
    elif args.command == 'createsuperuser':
        from flaxon.admin.services import AdminAuth, AdminStore
        store = AdminStore(str(database.DATA / 'admin.sqlite3'))
        username = input('Username: ').strip()
        if username in store.list('users'):
            raise SystemExit('User already exists; use Admin to manage this account.')
        email = input('Email: ').strip()
        password = getpass.getpass('Password: ')
        if password != getpass.getpass('Confirm password: '):
            raise SystemExit('Passwords do not match.')
        auth = AdminAuth(strict_permissions=True)
        user = auth.add_user({'username': username, 'email': email, 'password': password,
                             'roles': ['administrator'], 'email_verified': True})
        store.set('users', username, user)
        print('Admin created. Sign in at /admin/login. Enable MFA in your profile.')
    else:
        directory = Path(args.destination).resolve()
        directory.mkdir(parents=True, exist_ok=True)
        from datetime import datetime, timezone
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        for name in ('games.sqlite3', 'admin.sqlite3'):
            source = database.DATA / name
            if source.exists():
                with sqlite3.connect(source) as src, sqlite3.connect(directory / f'{stamp}-{name}') as dst:
                    src.backup(dst)
        print(f'Backups saved in {directory}. Copy them to separate durable storage.')

if __name__ == '__main__':
    main()
```

### `templates/index.html`

```html
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guess the number — Flaxon</title><link rel="stylesheet" href="/static/game.css"><script defer src="/static/game.js"></script></head><body><main><p class="eyebrow">FLAXON FULL-STACK CAPSTONE</p><h1>Guess the number</h1><p>A number from 1 to 100. Ten guesses. Can you find it?</p><nav aria-label="Game navigation"><a href="/play" data-route>Play</a><a href="/results" data-route>Your results</a><a href="/admin/login">Admin</a></nav><section id="play-view"><button id="start" type="button">Start new game</button><form id="guess-form" hidden><label for="guess">Your guess</label><input id="guess" type="number" min="1" max="100" required inputmode="numeric"><button type="submit">Guess</button></form><p id="message" role="status" aria-live="polite">Start a game to play.</p></section><section id="results-view" hidden><h2>Your results</h2><p>Only rounds played in this browser tab appear here. Admin keeps all completed results.</p><ul id="results-list"></ul></section><p class="note">Powered by Flaxon, Jinax, and a small browser JavaScript SPA.</p></main></body></html>
```

### `static/game.js`

```javascript
(() => {'use strict';
const $=id=>document.getElementById(id);let current, rounds=[];
try{rounds=JSON.parse(sessionStorage.getItem('guessing-game.rounds')||'[]');if(!Array.isArray(rounds))rounds=[];current=rounds.find(r=>r.outcome==='playing');}catch{}
function persist(){try{sessionStorage.setItem('guessing-game.rounds',JSON.stringify(rounds.slice(0,50)));}catch{$('message').textContent='Storage unavailable; keep this page open to finish your round.';}}
async function api(path,method='GET',body,token){const response=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Game-Client':'flaxon-spa',...(token?{'X-Game-Token':token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw Error(data.error||`Request failed (${response.status}).`);return data;}
function route(){const results=location.pathname==='/results';$('play-view').hidden=results;$('results-view').hidden=!results;$('results-list').replaceChildren();for(const r of rounds.filter(r=>r.outcome!=='playing')){const li=document.createElement('li');li.textContent=`${r.outcome==='won'?'Won':'Lost'} in ${r.attempts} guesses — ${new Date(r.completed_at*1000).toLocaleString()}`;$('results-list').append(li);}if(!$('results-list').children.length){const li=document.createElement('li');li.textContent='No completed rounds yet.';$('results-list').append(li);}}
document.querySelectorAll('[data-route]').forEach(a=>a.addEventListener('click',e=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();history.pushState({},'',a.getAttribute('href'));route();}));addEventListener('popstate',route);
$('start').addEventListener('click',async()=>{$('start').disabled=true;try{current=await api('/api/games','POST');rounds=rounds.filter(r=>r.outcome!=='playing');rounds.unshift(current);persist();$('guess-form').hidden=false;$('message').textContent='Your number is ready. You have 10 guesses.';$('guess').value='';$('guess').focus();}catch(e){$('message').textContent=e.message;}finally{$('start').disabled=false;}});
$('guess-form').addEventListener('submit',async e=>{e.preventDefault();if(!current)return;const button=e.target.querySelector('button');button.disabled=true;try{const result=await api(`/api/games/${current.id}/guesses`,'POST',{value:Number($('guess').value)},current.token);Object.assign(current,result);persist();$('message').textContent=result.outcome==='won'?`You won in ${result.attempts} guesses!`:result.outcome==='lost'?`Round finished. The answer was ${result.answer}.`:`Try ${result.hint}. ${10-result.attempts} guesses left.`;$('guess-form').hidden=result.outcome!=='playing';$('guess').value='';$('guess').focus();}catch(error){$('message').textContent=error.message;}finally{button.disabled=false;}});
if(current){$('guess-form').hidden=false;$('message').textContent=`Round restored. ${10-current.attempts} guesses left.`;}route();
})();
```

### `static/game.css`

```css
:root{color-scheme:light dark;font-family:system-ui,sans-serif;background:#f3f7fc;color:#172338}body{margin:0}main{max-width:46rem;margin:5vh auto;padding:clamp(1rem,5vw,3rem);background:#fff;border:1px solid #cbd5e1;border-radius:1.5rem;box-shadow:0 20px 70px #173b5c15}h1{font-size:clamp(2rem,8vw,3.8rem);line-height:1.1}.eyebrow{font-size:.75rem;letter-spacing:.15em;color:#17638a;font-weight:700}nav{display:flex;flex-wrap:wrap;gap:1rem;margin:2rem 0}a{color:#17638a}button{background:#17638a;color:#fff;border:0;border-radius:.6rem;padding:.8rem 1.2rem;font:inherit;cursor:pointer}button:disabled{opacity:.65}form{margin-top:1.5rem;display:flex;align-items:center;gap:.8rem;flex-wrap:wrap}input{padding:.7rem;font:inherit;width:6rem;border:1px solid #64748b;border-radius:.5rem}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #0ea5e9;outline-offset:3px}[hidden]{display:none!important}#message{min-height:3rem;font-weight:600}.note{font-size:.85rem;color:#596779}li{padding:.7rem 0}@media(prefers-color-scheme:dark){:root{background:#0b1220;color:#e2e8f0}main{background:#132139;border-color:#475569}a,.eyebrow{color:#7dd3fc}.note{color:#b0bfd3}}
```

### `render.yaml`

```yaml
services:
  - type: web
    name: flaxon-guessing-game
    runtime: python
    plan: starter
    numInstances: 1
    buildCommand: pip install -r requirements.txt
    startCommand: python management.py migrate && uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --no-proxy-headers
    healthCheckPath: /healthz
    envVars:
      - key: APP_ENV
        value: production
      - key: DATA_DIR
        value: /var/data
      - key: FLAXON_SECRET_KEY
        generateValue: true
    disk:
      name: game-data
      mountPath: /var/data
      sizeGB: 1
```

### `test_game.py`

```python
import asyncio
import importlib
import sys
from pathlib import Path
import pytest
import httpx

@pytest.fixture
def game(tmp_path, monkeypatch):
    monkeypatch.setenv('DATA_DIR', str(tmp_path))
    monkeypatch.delenv('APP_ENV', raising=False)
    sys.path.insert(0, str(Path(__file__).parent))
    import database
    importlib.reload(database)
    database.migrate()
    import app
    importlib.reload(app)
    return database, app

def test_score_and_authorization(game):
    db, module = game
    async def scenario():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=module.app), base_url='http://testserver') as client:
            assert (await client.post('/api/games')).status_code == 403
            headers={'X-Game-Client':'flaxon-spa'}
            response=await client.post('/api/games', headers=headers)
            assert response.status_code == 201, response.text
            data=response.json(); url=f"/api/games/{data['id']}/guesses"
            assert 'secret' not in data and 'token_hash' not in data
            assert (await client.post(url,headers=headers,json={'value':50})).status_code==404
            headers['X-Game-Token']=data['token']
            assert (await client.post(url,headers=headers,json={'value':101})).status_code==422
            with db.connect() as conn:
                secret=conn.execute('SELECT secret FROM games WHERE id=?',(data['id'],)).fetchone()[0]
            response=await client.post(url,headers=headers,json={'value':secret,'attempts':0})
            assert response.status_code==200, response.text
            assert response.json()['outcome']=='won' and response.json()['attempts']==1
            assert (await client.post(url,headers=headers,json={'value':secret})).status_code==409
            assert (await client.post('/api/games',headers={**headers,'Origin':'https://evil.example'})).status_code==403
            assert (await client.get('/admin/game_results')).status_code in (302,303,307,401,403)
            for path in ('/','/play','/results','/static/game.js','/healthz'):
                assert (await client.get(path)).status_code==200
            results=await db.GameResult.get_instances()
            assert len(results)==1 and results[0]['attempts']==1
            assert not {'token_hash','secret'} & results[0].keys()
            with pytest.raises(PermissionError): await db.GameResult.update_instance(data['id'],{'attempts':0})
            assert await db.GameResult.delete_instance(data['id'])
    asyncio.run(scenario())

def test_ten_attempts_and_expiry(game):
    db,_=game
    item=db.create()
    with db.connect() as conn: conn.execute('UPDATE games SET secret=100 WHERE id=?',(item['id'],))
    for _ in range(10): result=db.guess(item['id'],item['token'],1)
    assert result['outcome']=='lost' and result['attempts']==10
    with pytest.raises(ValueError): db.guess(item['id'],item['token'],100)
    item=db.create()
    with db.connect() as conn: conn.execute('UPDATE games SET created_at=0 WHERE id=?',(item['id'],))
    with pytest.raises(ValueError): db.guess(item['id'],item['token'],50)

def test_concurrent_guesses_atomic(game):
    db,_=game
    item=db.create()
    with db.connect() as conn: conn.execute('UPDATE games SET secret=100 WHERE id=?',(item['id'],))
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lambda _: db.guess(item['id'],item['token'],1),range(8)))
    assert db.read(item['id'],item['token'])['attempts']==8

def test_admin_login_and_result_permissions(game):
    db,module=game
    user=module.admin.auth.add_user({'username':'owner','password':'UniqueStrongPass!842','roles':['administrator'],'email_verified':True})
    module.admin.store.set('users','owner',user)
    item=db.create()
    with db.connect() as conn: conn.execute('UPDATE games SET secret=50 WHERE id=?',(item['id'],))
    db.guess(item['id'],item['token'],50)
    async def scenario():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=module.app),base_url='http://testserver') as client:
            response=await client.post('/admin/login',data={'username':'owner','password':'UniqueStrongPass!842','_csrf':module.admin.csrf_token()})
            assert response.status_code in (302,303),response.text
            response=await client.get('/admin/game_results')
            assert response.status_code==200,response.text
            assert item['id'] in response.text
            assert (await client.get('/admin/game_results/add')).status_code==403
            assert (await client.get(f"/admin/game_results/{item['id']}/edit")).status_code==403
            response=await client.post(f"/admin/game_results/{item['id']}/delete",data={'_csrf':module.admin.csrf_token()})
            assert response.status_code in (302,303),response.text
            assert await db.GameResult.get_instance(item['id']) is None
    asyncio.run(scenario())

def test_management_bootstrap_persists_hashed_user(game, monkeypatch):
    db,module=game
    import management
    answers=iter(['newowner','owner@example.com'])
    monkeypatch.setattr('builtins.input',lambda prompt:next(answers))
    monkeypatch.setattr('getpass.getpass',lambda prompt:'BootstrapStrongPass!482')
    monkeypatch.setattr(sys,'argv',['management.py','createsuperuser'])
    management.main()
    stored=module.admin.store.list('users')['newowner']
    assert 'password' not in stored and stored['password_hash']!='BootstrapStrongPass!482'
    importlib.reload(module)
    assert 'newowner' in module.admin.auth.users


def test_production_fails_without_secret(game, monkeypatch):
    _,module=game
    monkeypatch.setenv('APP_ENV','production')
    monkeypatch.delenv('FLAXON_SECRET_KEY',raising=False)
    with pytest.raises(RuntimeError,match='FLAXON_SECRET_KEY'):
        importlib.reload(module)
```

## 4. Manage results with Admin

1. Visit `/admin/login` and sign in with the account created by `management.py createsuperuser`.
2. Enable MFA from the profile page and keep recovery codes somewhere secure.
3. Open **GameResult** (the `game_results` registry entry). Browse completed rounds, filter by outcome, and search by round ID.
4. Delete a result when needed. Creation and editing are disabled by permission hooks and by the model adapter, so the dashboard cannot manufacture or rewrite a score.
5. Use Admin's users and roles screens to manage staff. Grant only the permissions they need; do not share the administrator account.

The adapter exposes no secret numbers, token hashes, or active rounds. Admin sessions and users are stored in `DATA_DIR/admin.sqlite3`. Gameplay resides in `DATA_DIR/games.sqlite3`.

If you create another Admin while the application is running, restart the process so it loads the updated user store. Do not commit the data directory or passwords.

## 5. Run the tests

```bash
python -m pip install pytest httpx
python -m pytest test_game.py -q
```

The tests cover access tokens, validation, server-owned scores, foreign-origin rejection, protected Admin, deep links, static assets, ten-attempt losses, expiration, concurrent guesses, and the read/delete Admin adapter.

Play through a round yourself. Switch between Play and Your results, use Back/Forward, refresh `/results`, and verify that Admin shows the completed result. Opening a new browser tab intentionally starts a separate local history.

## 6. Deploy to Render

This example uses a **paid web service with a persistent disk**, one instance, and one Uvicorn worker. Render's free filesystem does not persist these SQLite files across redeploys. Review current pricing before creating a service.

1. Copy this project into the root of your own GitHub repository. Commit the application files and `render.yaml`, excluding `.venv`, `data`, secrets, and backups.
2. In Render, choose **New → Blueprint**, connect that repository, and select the supplied `render.yaml`. If you keep the example inside a larger repository, set the service's root directory to its folder instead.
3. Review the Starter service and 1 GB disk before applying the Blueprint. `DATA_DIR=/var/data` stores both databases and uploads under the persistent mount.
4. Render generates `FLAXON_SECRET_KEY`. `APP_ENV=production` disables debug mode and makes Admin cookies Secure. Render's `RENDER_EXTERNAL_HOSTNAME` supplies the trusted hostname. For a custom domain, add it to `ALLOWED_HOSTS` as a comma-separated hostname list, with no scheme or path.
5. The build installs dependencies. The **start command** runs migrations before Uvicorn listens on `0.0.0.0:$PORT`. Persistent disks are unavailable during build and pre-deploy commands, so do not move SQLite migration there.
6. Wait for `/healthz` to become healthy, then open `https://YOUR-SERVICE.onrender.com/play`.
7. In the running service's **Shell**, run `python management.py createsuperuser`. The shell can access the mounted disk. Restart the service after creating the account, then log in through the HTTPS URL at `/admin/login`.
8. Play a round, inspect its completed result in Admin, redeploy, and verify that the result and account remain available.

The start command disables proxy-header trust. This avoids trusting arbitrary forwarded client IPs; the included rate limiter may therefore group requests by the proxy's address. Before public traffic, configure rate limiting at your trusted edge, or configure Uvicorn's forwarded-header allowlist for the actual trusted proxy network. Do not use an unrestricted forwarded-header allowlist as a shortcut.

Persistent disks limit this deployment to a single instance and introduce a short interruption during redeployment. To scale horizontally, migrate gameplay and Admin persistence to shared database/session infrastructure and test the new topology.

Official references: [Render persistent disks](https://render.com/docs/disks), [Blueprint configuration](https://render.com/docs/blueprint-spec), and [deployment commands](https://render.com/docs/deploys).

## 7. Production operations

- Keep production debug disabled, use HTTPS, restrict trusted hosts, and keep same-origin API requests.
- Configure edge request limits and monitor 429 responses. The example's in-process limiter resets on restart and is not a distributed abuse-prevention system.
- Set a result-retention policy and delete old results through Admin or an audited maintenance command. Expired unfinished games are pruned when a new round is created; finished results remain until deleted.
- Back up both databases using `python management.py backup --destination /var/data/backups`. This uses SQLite's backup API rather than copying live WAL files. Move the backup files to separate durable storage; a copy on the same disk is not sufficient disaster recovery.
- Test restoration in a separate environment, monitor disk usage, and review Admin users and MFA periodically.
- Keep dependencies and the framework pin updated after testing. Add logging, alerts, and load tests for your expected traffic before a public launch.

## Troubleshooting

**Missing table:** run `python management.py migrate` in the same environment and `DATA_DIR` as the application.

**Admin login fails after bootstrap:** restart the process; verify the command ran against the persistent disk, not a local or build environment.

**403 from gameplay:** include `X-Game-Client: flaxon-spa`, keep the frontend and API on the same origin, and verify the deployment hostname. Use HTTPS in production.

**404 from a round:** its token is missing/incorrect, or an expired unfinished round has been pruned. Start a new game.

**Results vanish after redeploy:** check that both SQLite files are under `/var/data` and that the persistent disk is attached.

**Deep links fail:** deploy as the Python web service, not as a static site. Flaxon serves `/play` and `/results`.

You now have a complete SPA with a protected administration interface and a reproducible deployment. Continue improving it with Teloce components, account-based history, accessibility tests, or a shared production database when those features fit your application.
