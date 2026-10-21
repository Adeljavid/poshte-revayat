const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const makeCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const shuffle = a => { for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const cases = [
  {title:'آخرین قاب', intro:'در گالری کوچک شهر، صاحب گالری پس از یک مشاجره پیدا شده است. هر فرد بخشی از ماجرا را می‌داند؛ زمان‌ها و گفته‌ها را با هم مقایسه کنید.', victim:'کامران راد، صاحب گالری', timeline:[
    '۱۹:۱۰ — درِ گالری برای بازدید خصوصی بسته شد.',
    '۱۹:۲۰ — صدای بحث از اتاق پشتی شنیده شد.',
    '۱۹:۳۰ — برق راهرو برای دو دقیقه قطع شد.',
    '۱۹:۴۰ — یکی از کارکنان درخواست کمک کرد.'
  ], clues:['رسید خریدی در سطل کاغذ پیدا شده است.','ساعت دیواری اتاق پشتی هفت دقیقه عقب است.','دو نفر ادعا می‌کنند هنگام قطع برق در راهرو بوده‌اند.']},
  {title:'ساعت خاموش', intro:'در یک دفتر قدیمی، مدیر پس از جلسه‌ای پرتنش بی‌هوش پیدا شده است. شش نفر در ساختمان بوده‌اند و هرکدام دلیلی برای پنهان‌کردن بخشی از حقیقت دارند.', victim:'بهرام نادری، مدیر دفتر', timeline:['۱۸:۰۰ — جلسه رسمی تمام شد.','۱۸:۱۲ — پیامی از چاپگر دفتر ثبت شد.','۱۸:۲۰ — درِ اتاق بایگانی باز شد.','۱۸:۳۵ — نگهبان صدای افتادن وسیله‌ای را شنید.'], clues:['یک برگه یادداشت پاره‌شده در سطل است.','ثبت ورود بایگانی با ساعت دیواری اختلاف دارد.','یکی از پیام‌ها پیش از زمان اعلام‌شده ارسال شده است.']},
  {title:'اتاق شماره هفت', intro:'در مهمان‌خانه‌ای دورافتاده، صاحب مهمان‌خانه مرده پیدا شده است. همه مهمانان درباره علت حضورشان توضیحی دارند، اما همه توضیح‌ها کامل نیستند.', victim:'یونس شریفی، صاحب مهمان‌خانه', timeline:['۲۰:۰۰ — شام در سالن سرو شد.','۲۰:۱۵ — صدای مشاجره از طبقه بالا آمد.','۲۰:۲۵ — کلید اتاق هفت از جای خود برداشته شد.','۲۰:۴۵ — جسد پیدا شد.'], clues:['کلید یدکی در محل همیشگی نیست.','در دفتر مهمانان یک نام خط خورده است.','یک فنجان هنوز گرم است، با اینکه همه از اتاق خارج شده‌اند.']}
];
const identities = [
  ['سارا','همکار قدیمی قربانی','۱۹:۱۰ در سالن بودم؛ برای تحویل یک پرونده آمده بودم.','با قربانی درباره یک قرارداد اختلاف داشتم.'],
  ['مانی','شریک کاری قربانی','۱۹:۲۰ نزدیک راهرو بودم؛ دنبال کیفم می‌گشتم.','بدهی قدیمی میان من و قربانی وجود داشت.'],
  ['نیلوفر','عضو خانواده قربانی','۱۹:۳۰ در ورودی بودم؛ منتظر تماس بودم.','آن روز پیام تندی برای قربانی فرستاده بودم.'],
  ['آرمان','کارمند ساختمان','۱۹:۱۵ در اتاق استراحت بودم؛ شیفتم تمام شده بود.','قربانی قصد داشت درباره کارم تصمیمی بگیرد.'],
  ['رها','مهمان جلسه','۱۹:۲۵ در اتاق کناری بودم؛ برای دیدار کوتاه آمده بودم.','گفت‌وگویی خصوصی را از دیگران پنهان کرده‌ام.'],
  ['کیان','تأمین‌کننده','۱۹:۰۰ وارد ساختمان شدم؛ برای تحویل بسته آمده بودم.','قربانی از پرداخت یک فاکتور خودداری کرده بود.']
];
function publicRoom(room) {
  return {code:room.code, narrator:room.narratorName, players:room.players.map(p=>({id:p.id,name:p.name,ready:p.ready,connected:p.connected})), started:room.started, caseTitle:room.caseData?.title, intro:room.caseData?.intro, victim:room.caseData?.victim, timeline:room.caseData?.timeline || [], clues:room.visibleClues || [], stage:room.stage, maxPlayers:room.maxPlayers};
}
function sendRoom(room) { io.to(room.code).emit('room-update', publicRoom(room)); }
function error(socket,msg){socket.emit('notice',{type:'error',message:msg});}

io.on('connection', socket => {
  socket.on('create-room', ({name,maxPlayers}) => {
    name=(name||'راوی').trim().slice(0,24); maxPlayers=Number(maxPlayers);
    if (![4,5,6].includes(maxPlayers)) return error(socket,'تعداد بازیکنان باید ۴، ۵ یا ۶ نفر باشد.');
    let code; do { code=makeCode(); } while(rooms.has(code));
    const room={code,narratorId:socket.id,narratorName:name, maxPlayers, players:[], started:false, caseData:null, visibleClues:[],stage:0, secrets:{}};
    rooms.set(code,room); socket.join(code); socket.data.room=code; socket.data.kind='narrator';
    socket.emit('room-created',{code, inviteUrl:`${getBaseUrl(socket)}/?room=${code}`}); sendRoom(room);
  });
  socket.on('join-room', ({code,name}) => {
    code=(code||'').trim().toUpperCase(); name=(name||'بازیکن').trim().slice(0,24);
    const room=rooms.get(code); if(!room) return error(socket,'این اتاق پیدا نشد یا بسته شده است.');
    if(room.started) return error(socket,'این بازی شروع شده و ورود بازیکن جدید بسته است.');
    if(room.players.length>=room.maxPlayers) return error(socket,'ظرفیت اتاق تکمیل است.');
    if(room.players.some(p=>p.name.toLowerCase()===name.toLowerCase())) return error(socket,'این نام قبلاً انتخاب شده؛ نام دیگری وارد کن.');
    const player={id:socket.id,name,ready:true,connected:true}; room.players.push(player); socket.join(code); socket.data.room=code; socket.data.kind='player';
    socket.emit('joined-room',{code,playerId:socket.id}); sendRoom(room);
  });
  socket.on('start-game', () => {
    const room=rooms.get(socket.data.room); if(!room || socket.id!==room.narratorId) return error(socket,'فقط راوی می‌تواند بازی را شروع کند.');
    if(room.started) return error(socket,'بازی قبلاً شروع شده است.');
    if(room.players.length<4) return error(socket,'برای شروع حداقل ۴ بازیکن لازم است.');
    const chosen=cases[Math.floor(Math.random()*cases.length)]; room.caseData=chosen; room.visibleClues=[]; room.stage=1; room.started=true;
    const ids=shuffle(room.players.map(p=>p.id)); const roles=ids.map((id,i)=>({id,role:i===0?'کارآگاه':i===1?'قاتل':'مظنون'}));
    room.players.forEach((p,i)=>{
      const role=roles.find(r=>r.id===p.id).role; const identity=identities[i % identities.length];
      room.secrets[p.id]={role, character:identity[0], relation:identity[1], publicStatement:identity[2], privateHook:identity[3], requiredPrompt: role==='قاتل'?'موضوع اختلاف و انگیزه خود را مطرح کن، اما هویتت را فاش نکن.':'موضوع خصوصی کارت را در جریان بحث مطرح کن و برای زمان و مکان حضورت توضیح قابل دفاع بده.'};
      io.to(p.id).emit('private-card',{...room.secrets[p.id],playerName:p.name,caseTitle:chosen.title});
    });
    sendRoom(room); io.to(room.narratorId).emit('notice',{type:'success',message:'بازی شروع شد. کارت هر بازیکن فقط برای خودش ارسال شده است.'});
  });
  socket.on('reveal-clue', () => {
    const room=rooms.get(socket.data.room); if(!room || socket.id!==room.narratorId || !room.started) return error(socket,'این کار فقط برای راوی در بازی فعال است.');
    if(room.visibleClues.length>=room.caseData.clues.length) return error(socket,'سرنخ دیگری باقی نمانده است.');
    room.visibleClues.push(room.caseData.clues[room.visibleClues.length]); room.stage++; sendRoom(room);
  });
  socket.on('accuse', ({targetId}) => {
    const room=rooms.get(socket.data.room); if(!room || !room.started) return error(socket,'بازی هنوز شروع نشده است.');
    const target=room.players.find(p=>p.id===targetId); if(!target) return error(socket,'بازیکن انتخاب‌شده معتبر نیست.');
    io.to(room.narratorId).emit('accusation',{from:room.players.find(p=>p.id===socket.id)?.name||'بازیکن',target:target.name});
    socket.emit('notice',{type:'success',message:`اتهام شما علیه ${target.name} ثبت شد.`});
  });
  socket.on('end-game', () => {
    const room=rooms.get(socket.data.room); if(!room || socket.id!==room.narratorId) return error(socket,'فقط راوی می‌تواند بازی را پایان دهد.');
    const killer=room.players.find(p=>room.secrets[p.id]?.role==='قاتل');
    io.to(room.code).emit('game-over',{killer:killer?.name||'نامشخص',caseTitle:room.caseData?.title}); room.started=false;
  });
  socket.on('disconnect',()=>{
    const code=socket.data.room, room=rooms.get(code); if(!room)return;
    if(socket.id===room.narratorId){io.to(code).emit('notice',{type:'error',message:'اتصال راوی قطع شد؛ اتاق تا پایان این نشست در دسترس نمی‌ماند.'}); rooms.delete(code); return;}
    const p=room.players.find(p=>p.id===socket.id); if(p){p.connected=false;sendRoom(room);}
  });
});
function getBaseUrl(socket){
  const origin=socket.handshake.headers.origin;
  if(origin && /^https?:\/\//.test(origin)) return origin;
  const proto=socket.request.headers['x-forwarded-proto'] || 'http';
  const host=socket.request.headers['x-forwarded-host'] || socket.request.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}
server.listen(PORT,'0.0.0.0',()=>console.log(`Poshte Revayat server running on port ${PORT}`));
