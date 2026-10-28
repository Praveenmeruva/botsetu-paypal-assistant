import os, time, re
from playwright.sync_api import sync_playwright
env = dict(l.strip().split('=',1) for l in open('.sandbox-buyer-us') if '=' in l)
S='video/shots/'; n=[0]
def shot(p,name):
    n[0]+=1; p.screenshot(path=f'{S}{n[0]:02d}_{name}.png'); print('shot',name)
def wait_reply(p,count):
    p.wait_for_function(f"document.querySelectorAll('.m.b').length>={count}", timeout=200000); time.sleep(0.5)
with sync_playwright() as pw:
    b=pw.chromium.launch(channel='chrome', headless=True)
    ctx=b.new_context(viewport={'width':1280,'height':720}, device_scale_factor=1.5, locale='en-US')
    p=ctx.new_page(); p.goto('http://localhost:3123/'); time.sleep(1.5)
    def say(t,c):
        p.fill('#q',t); time.sleep(0.4); shot(p,'typing'); p.press('#q','Enter'); wait_reply(p,c); shot(p,'reply')
    shot(p,'empty')
    say('నమస్కారం, నాకు జనరల్ డాక్టర్ అపాయింట్‌మెంట్ కావాలి',1)
    say('ఈరోజు 11:00 కి, నా పేరు రవి',2)
    link=p.locator('a.pp').last.get_attribute('href'); print('link',link)
    # PayPal checkout in new tab
    pp=ctx.new_page(); pp.goto(link); pp.wait_for_load_state('load'); time.sleep(2)
    shot(pp,'paypal_login')  # email empty here
    pp.wait_for_selector('#email',state='visible',timeout=60000); pp.fill('#email',env['PAYPAL_BUYER_EMAIL'])
    if pp.locator('#btnNext').is_visible(): pp.click('#btnNext')
    pp.wait_for_selector('#password',state='visible'); pp.fill('#password',env['PAYPAL_BUYER_PASSWORD']); pp.click('#btnLogin')
    pp.wait_for_load_state('load'); time.sleep(6)
    shot(pp,'paypal_review')
    btn=pp.locator('#payment-submit-btn, button[data-id="payment-submit-btn"], button:has-text("Complete Purchase"), button:has-text("Pay")').first
    btn.click(); pp.wait_for_url(re.compile('localhost:3123/paypal/return'), timeout=90000); time.sleep(2)
    shot(pp,'success'); pp.close()
    time.sleep(3); shot(p,'chat_confirm')
    p.select_option('#biz','vidya-coaching'); time.sleep(0.5)
    say('मुझे ट्रायल क्लास चाहिए, शाम 5:30 बजे, मेरा नाम अनीता है',4)
    say('मैं बाद में पैसे दूँगी, इनवॉइस भेज दो',5)
    d=ctx.new_page(); d.goto('http://localhost:3123/dashboard'); time.sleep(2); shot(d,'dashboard')
    b.close()
