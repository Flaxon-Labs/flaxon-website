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
