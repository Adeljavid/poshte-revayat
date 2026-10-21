const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');
const { makeCase } = require('./cases');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const TEST_MODE = process.env.TEST_MODE === '1';
const MIN_PLAYERS = TEST_MODE ? 2 : 4;
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const makeCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const makeToken = () => crypto.randomBytes(12).toString('hex');
const shuffle = a => { for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
function publicRoom(room) {
  return {code:room.code, narrator:room.narratorName, players:room.players.map(p=>({id:p.id,name:p.name,ready:p.ready,connected:p.connected})), started:room.started, caseTitle:room.caseData?.title, intro:room.caseData?.intro, victim:room.caseData?.victim, timeline:room.caseData?.timeline || [], clues:room.visibleClues || [], stage:room.stage, maxPlayers:room.maxPlayers, testMode:TEST_MODE, minPlayers:MIN_PLAYERS, totalClues:room.caseData?.clues.length||0};
}
function sendRoom(room) { io.to(room.code).emit('room-update', publicRoom(room)); }
function error(socket,msg){socket.emit('notice',{type:'error',message:msg});}

io.on('connection', socket => {
  socket.on('create-room', ({name,maxPlayers}) => {
    name=(name||'راوی').trim().slice(0,24); maxPlayers=Number(maxPlayers);
    if (![4,5,6].includes(maxPlayers)) return error(socket,'تعداد بازیکنان باید ۴، ۵ یا ۶ نفر باشد.');
    let code; do { code=makeCode(); } while(rooms.has(code));
    const narratorToken=makeToken(); const room={code,narratorId:socket.id,narratorToken,deleteTimer:null,narratorName:name, maxPlayers, players:[], started:false, caseData:null, visibleClues:[],stage:0, secrets:{}};
    rooms.set(code,room); socket.join(code); socket.data.room=code; socket.data.kind='narrator';
    socket.emit('room-created',{code, token:narratorToken, inviteUrl:`${getBaseUrl(socket)}/?room=${code}`}); sendRoom(room);
  });
  socket.on('join-room', ({code,name}) => {
    code=(code||'').trim().toUpperCase(); name=(name||'بازیکن').trim().slice(0,24);
    const room=rooms.get(code); if(!room) return error(socket,'این اتاق پیدا نشد یا بسته شده است.');
    if(room.started) return error(socket,'این بازی شروع شده و ورود بازیکن جدید بسته است.');
    if(room.players.length>=room.maxPlayers) return error(socket,'ظرفیت اتاق تکمیل است.');
    if(room.players.some(p=>p.name.toLowerCase()===name.toLowerCase())) return error(socket,'این نام قبلاً انتخاب شده؛ نام دیگری وارد کن.');
    const player={id:socket.id,token:makeToken(),name,ready:true,connected:true}; room.players.push(player); socket.join(code); socket.data.room=code; socket.data.kind='player';
    socket.emit('joined-room',{code,playerId:socket.id,token:player.token}); sendRoom(room);
  });
  socket.on('start-game', () => {
    const room=rooms.get(socket.data.room); if(!room || socket.id!==room.narratorId) return error(socket,'فقط راوی می‌تواند بازی را شروع کند.');
    if(room.started) return error(socket,'بازی قبلاً شروع شده است.');
    if(room.players.length<MIN_PLAYERS) return error(socket,`برای شروع حداقل ${MIN_PLAYERS} بازیکن لازم است.`);
    const n=room.players.length, order=shuffle([...Array(n).keys()]), roles=Array(n).fill('مظنون');
    roles[order[0]]='کارآگاه'; if(n>1) roles[order[1]]='قاتل';
    const chosen=makeCase(n,roles); room.caseData=chosen; room.visibleClues=[]; room.stage=1; room.started=true; room.secrets={};
    room.players.forEach((p,i)=>{ room.secrets[p.token]={role:roles[i],...chosen.cards[i]}; io.to(p.id).emit('private-card',{...room.secrets[p.token],playerName:p.name,caseTitle:chosen.title}); });
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
    const killer=room.players.find(p=>room.secrets[p.token]?.role==='قاتل');
    io.to(room.code).emit('game-over',{killer:killer?.name||'نامشخص',caseTitle:room.caseData?.title}); room.started=false;
  });
  socket.on('resume', ({token,code}) => {
    const room=rooms.get((code||'').toUpperCase()); if(!room||!token) return socket.emit('resume-failed');
    if(room.narratorToken===token){
      clearTimeout(room.deleteTimer); room.narratorId=socket.id; socket.join(room.code); socket.data.room=room.code; socket.data.kind='narrator';
      socket.emit('resumed',{kind:'narrator',code:room.code,inviteUrl:`${getBaseUrl(socket)}/?room=${room.code}`}); sendRoom(room); return;
    }
    const p=room.players.find(x=>x.token===token); if(!p) return socket.emit('resume-failed');
    p.id=socket.id; p.connected=true; socket.join(room.code); socket.data.room=room.code; socket.data.kind='player';
    socket.emit('resumed',{kind:'player',code:room.code,playerId:socket.id});
    if(room.secrets[p.token]) socket.emit('private-card',{...room.secrets[p.token],playerName:p.name,caseTitle:room.caseData?.title});
    sendRoom(room);
  });
  socket.on('add-bot', () => {
    const room=rooms.get(socket.data.room);
    if(!TEST_MODE||!room||socket.id!==room.narratorId||room.started) return error(socket,'حالت آزمایشی فعال نیست.');
    if(room.players.length>=room.maxPlayers) return error(socket,'ظرفیت اتاق تکمیل است.');
    const n=room.players.length+1, id='bot-'+room.code+n;
    room.players.push({id,token:id,name:'بازیکن آزمایشی '+n,ready:true,connected:true,bot:true}); sendRoom(room);
  });
  socket.on('disconnect',()=>{
    const code=socket.data.room, room=rooms.get(code); if(!room)return;
    if(socket.id===room.narratorId){io.to(code).emit('notice',{type:'error',message:'اتصال راوی قطع شد؛ تا ۱۰ دقیقه فرصت بازگشت دارد.'}); clearTimeout(room.deleteTimer); room.deleteTimer=setTimeout(()=>{ if(rooms.get(code)===room) rooms.delete(code); },10*60*1000); return;}
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
