"""Play the real capstone SPA against its Flaxon ASGI application."""
import os
from pathlib import Path
import socket
import sys
import tempfile
import threading
import time
import uvicorn
from playwright.sync_api import sync_playwright

def main():
    with tempfile.TemporaryDirectory() as directory:
        os.environ['DATA_DIR']=directory
        os.environ.pop('APP_ENV',None)
        sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'examples/guessing-game'))
        import database
        import app
        database.migrate()
        sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        server=uvicorn.Server(uvicorn.Config(app.app,log_level='error'))
        thread=threading.Thread(target=lambda:server.run(sockets=[sock]),daemon=True);thread.start()
        for _ in range(100):
            if server.started:break
            time.sleep(.05)
        assert server.started
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
                for width in (1440,390):
                    context=browser.new_context(viewport={'width':width,'height':850})
                    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                    base=f'http://127.0.0.1:{port}'
                    page.goto(base+'/play');page.click('#start');page.wait_for_selector('#guess-form:not([hidden])')
                    game_id=page.evaluate('JSON.parse(sessionStorage.getItem("guessing-game.rounds"))[0].id')
                    with database.connect() as db:secret=db.execute('SELECT secret FROM games WHERE id=?',(game_id,)).fetchone()[0]
                    page.fill('#guess',str(secret));page.click('#guess-form button');page.wait_for_function('document.getElementById("message").textContent.includes("You won")')
                    page.click('a[href="/results"]');assert game_id
                    assert 'Won in 1 guesses' in page.locator('#results-list').inner_text()
                    page.reload();assert 'Won in 1 guesses' in page.locator('#results-list').inner_text()
                    page.click('a[href="/play"]');page.go_back();assert page.locator('#results-view').is_visible()
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    response=page.goto(base+'/admin/game_results');assert response.status in (401,403) or '/admin/login' in page.url
                    assert not errors,errors
                    context.close()
                browser.close()
        finally:
            server.should_exit=True;thread.join(timeout=5);sock.close()
    print('Real SPA desktop/mobile checks passed: create, win, results, deep-link refresh, history navigation, protected Admin.')

if __name__=='__main__':main()
