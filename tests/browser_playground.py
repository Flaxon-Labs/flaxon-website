"""Browser checks for the editor, downloads, drafts, mobile layout, and SPA."""
import functools
import http.server
import json
from pathlib import Path
import tempfile
import threading
import zipfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def main():
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
        for width in (1440,390):
            context=browser.new_context(viewport={'width':width,'height':900},accept_downloads=True)
            page=context.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(base) else route.abort())
            page.goto(base+'/playground.html');page.wait_for_selector('#pg-tabs button')
            for sample in ('api','jinax','teloce','modules'):
                page.select_option('#pg-example',sample);page.click('#pg-inspect')
                result=json.loads(page.locator('#pg-output').inner_text());assert len(result['routes'])>=1,result
                assert page.locator('.pg-token-keyword').count()>0
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),width
            page.select_option('#pg-example','api');page.locator('#pg-editor').fill('from flaxon import Flaxon\napp = Flaxon("draft")\n@app.get("/draft")\nasync def draft():\n    return {}\n')
            page.reload();page.wait_for_selector('#pg-tabs button');assert '/draft' in page.locator('#pg-editor').input_value()
            page.click('#pg-inspect');assert '/draft' in page.locator('#pg-output').inner_text()
            page.locator('#pg-editor').fill('from flaxon import Flaxon\napp=Flaxon("bad")\n@app.get(no_quote)\nasync def bad(): pass')
            page.click('#pg-inspect');assert 'app.py:3' in page.locator('#pg-output').inner_text()
            page.on('dialog',lambda dialog:dialog.accept());page.click('#pg-reset')
            page.click('#pg-theme');assert page.evaluate('document.documentElement.classList.contains("dark")')
            page.reload();page.wait_for_selector('#pg-tabs button');assert page.evaluate('document.documentElement.classList.contains("dark")')
            with page.expect_download() as info: page.click('#pg-project')
            with tempfile.TemporaryDirectory() as tmp:
                path=Path(tmp)/'project.zip';info.value.save_as(path)
                with zipfile.ZipFile(path) as archive:
                    assert archive.testzip() is None
                    assert 'app.py' in archive.namelist() and 'requirements.txt' in archive.namelist()
            with page.expect_download() as info:page.click('#pg-download')
            assert info.value.suggested_filename=='app.py'
            page.locator('#pg-tabs button').first.focus();page.keyboard.press('ArrowRight');assert page.locator('#pg-tabs button[aria-selected=true]').inner_text()=='requirements.txt'
            page.goto(base+'/docs/fullstack/11-guessing-game.html');assert page.locator('h1').count()==1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert not errors,errors
            context.close()
        browser.close()
    server.shutdown()
    print('Playground desktop/mobile checks passed: four presets, highlighting, tabs, drafts, errors, ZIP/file downloads, theme, capstone layout.')

if __name__=='__main__':main()
