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
