import asyncio, json, os, re, subprocess
from PIL import Image, ImageDraw, ImageFont
D=os.path.dirname(os.path.abspath(__file__)); S=f'{D}/shots'; B=f'{D}/build'; os.makedirs(B,exist_ok=True)
W,H=1920,1080; F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(p,s): return ImageFont.truetype(p,s)
def slide(name,title,lines,sub=None):
    im=Image.new('RGB',(W,H),(9,94,84)); d=ImageDraw.Draw(im)
    d.text((140,150),title,font=font(FB,84),fill='white')
    if sub: d.text((140,270),sub,font=font(F,44),fill=(255,214,102))
    y=400
    for l in lines: d.text((160,y),l,font=font(F,42),fill='white'); y+=78
    im.save(f'{B}/{name}.png')
slide('title','BotSetu × PayPal',['Chat-based booking assistant for small businesses','Book in Telugu, Hindi, Tamil or English','Pay instantly via PayPal Checkout, or later via PayPal Invoice'],'Multilingual AI booking + payments')
slide('arch','How it works',['Customer chat (web / WhatsApp)  →  Node.js server','Sarvam LLM agent with tool calling (+ rules fallback)','Tools: list_services · create_booking_and_payment · send_paypal_invoice','PayPal Orders v2: create → approve → capture','PayPal Invoicing v2 for pay-later  ·  dashboard for the owner'],'Architecture')
slide('end','Try it',['github.com/Praveenmeruva/botsetu-paypal-assistant','MIT licensed · zero dependencies · Node 20','Runs in PayPal sandbox today; switch to live with one env var'],'BotSetu × PayPal')
def fit(src,name):
    im=Image.open(src).convert('RGB'); im=im.resize((W,int(im.height*W/im.width))) if abs(im.width/im.height-W/H)<0.01 else im
    c=Image.new('RGB',(W,H),(230,224,218)); im.thumbnail((W,H)); c.paste(im,((W-im.width)//2,(H-im.height)//2)); c.save(f'{B}/{name}.png')
scenes=[
('title',None,"Small clinics, coaching centres and salons in India get most bookings over chat, in many languages. Collecting payment is still manual. BotSetu fixes that with a multilingual AI assistant that books and gets paid through PayPal."),
('arch',None,"A Node server hosts the chat. A Sarvam language model calls three tools: list services, create a booking with a PayPal order, and send a PayPal invoice. PayPal Orders version two handles checkout and capture, and PayPal Invoicing handles pay later."),
('s1','01_empty',"Here is Sunrise Family Clinic in Hyderabad. Ravi, a patient, opens the chat."),
('s3','03_reply',"He greets the clinic in Telugu and asks for a general doctor. The agent lists the services, quotes the price and the open slots, all in Telugu."),
('s5','05_reply',"He picks eleven o'clock and gives his name. The agent creates the booking and a PayPal order in one tool call, and replies with a Pay with PayPal button."),
('s6','06_paypal_login',"The button opens PayPal Checkout. The customer signs in to his PayPal account. Here we use a PayPal sandbox buyer."),
('s7','07_paypal_review',"He reviews the six dollar payment and completes the purchase."),
('s8','08_success',"PayPal redirects back to BotSetu. The server captures the order, and the booking is marked paid."),
('s9','09_chat_confirm',"The confirmation, with the PayPal capture ID, also lands in the chat, so the customer has a receipt in the same conversation."),
('s11','11_reply',"Now a different business: Vidya Coaching Centre. A parent writes in Hindi, asking for a trial class at five thirty. The agent books it and sends a PayPal link, replying in Hindi."),
('s13','13_reply',"She says she will pay later and asks for an invoice. The agent calls the send invoice tool, and PayPal Invoicing creates and sends an invoice she can pay any time."),
('s14','14_dashboard',"The owner sees every booking on one dashboard: the clinic visit is paid with its capture ID, and the coaching trial is pending, waiting on the invoice."),
('end',None,"BotSetu brings PayPal to the chat where small businesses already talk to customers, in their own language. The code is open source on GitHub. Thanks for watching."),
]
for n,shot,_ in scenes:
    if shot: fit(f'{S}/{shot}.png',n)
VOICE='en-IN-NeerjaNeural'
def ts(t): h=int(t//3600); m=int(t%3600//60); s=t%60; return f'{h:02}:{m:02}:{s:06.3f}'.replace('.',',')
srt=[]; t0=0; lst=open(f'{B}/list.txt','w'); i=1
for n,_,text in scenes:
    a=f'{B}/{n}.mp3'
    subprocess.run(['/home/box/.local/bin/edge-tts','--voice',VOICE,'--rate=+5%','--text',text,'--write-media',a],check=True,capture_output=True)
    dur=float(subprocess.check_output(['ffprobe','-v','0','-show_entries','format=duration','-of','csv=p=0',a]))
    total=dur+0.8
    subprocess.run(['ffmpeg','-y','-loglevel','error','-loop','1','-i',f'{B}/{n}.png','-i',a,'-af','apad','-t',f'{total:.3f}','-r','30','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-ar','44100','-ac','2',f'{B}/{n}.mp4'],check=True)
    sents=re.split(r'(?<=[.!?])\s+',text); L=sum(len(s) for s in sents); t=t0+0.2
    for s in sents:
        d=dur*len(s)/L; srt.append(f'{i}\n{ts(t)} --> {ts(t+d)}\n{s}\n'); i+=1; t+=d
    t0+=total; lst.write(f"file '{n}.mp4'\n")
lst.close(); open(f'{B}/subs.srt','w').write('\n'.join(srt))
out=f'{D}/botsetu-paypal.mp4'
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',f'{B}/list.txt','-vf',f"subtitles={B}/subs.srt:force_style='FontName=DejaVu Sans,FontSize=11,Outline=2,BorderStyle=3,BackColour=&H80000000,MarginV=12'",'-c:v','libx264','-crf','22','-preset','medium','-c:a','aac','-b:a','128k','-movflags','+faststart',out],check=True)
print(out,t0)
