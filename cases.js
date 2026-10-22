// Procedural case generator: every game gets a new, internally consistent story.
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fa = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const fmt = m => fa(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));

const SETTINGS = [
  { title: 'آخرین قاب', place: 'یک گالری هنری کوچک', role: 'صاحب گالری', rooms: ['سالن اصلی', 'اتاق پشتی', 'راهرو', 'انبار تابلوها'], traces: ['ذرات گچ سفید', 'لکه‌ی رنگ روغن', 'گرد و خاک فرش', 'تکه‌های کاغذ بسته‌بندی'], open: 'درِ گالری برای بازدید خصوصی بسته شد.', cut: 'برق راهرو برای دو دقیقه قطع شد.' },
  { title: 'ساعت خاموش', place: 'یک دفتر قدیمی', role: 'مدیر دفتر', rooms: ['اتاق جلسه', 'بایگانی', 'آبدارخانه', 'پارکینگ'], traces: ['ذرات گچ تخته', 'گرد کاغذ قدیمی', 'لکه‌ی چای', 'لکه‌ی روغن'], open: 'جلسه‌ی رسمی دفتر تمام شد.', cut: 'چاپگر دفتر ناگهان خاموش شد.' },
  { title: 'اتاق شماره هفت', place: 'یک مهمان‌خانه‌ی دورافتاده', role: 'صاحب مهمان‌خانه', rooms: ['سالن شام', 'حیاط', 'طبقه‌ی بالا', 'انبار'], traces: ['لکه‌ی سس و غذا', 'خاک و برگ تازه', 'تار موی گربه', 'گرد و خاک قدیمی'], open: 'شام در سالن سرو شد.', cut: 'چراغ‌های طبقه‌ی بالا لحظه‌ای خاموش شد.' },
  { title: 'پرده‌ی آخر', place: 'یک تئاتر قدیمی', role: 'کارگردان نمایش', rooms: ['پشت صحنه', 'سالن', 'رختکن', 'بالکن'], traces: ['براده‌ی چوب', 'پودر آرایش', 'الیاف پارچه', 'خاکستر سیگار'], open: 'تمرین نهایی نمایش تمام شد.', cut: 'نور صحنه ناگهان قطع شد.' },
  { title: 'کتاب نیمه‌تمام', place: 'یک کافه‌کتاب', role: 'صاحب کافه', rooms: ['طبقه‌ی کتاب‌ها', 'آشپزخانه', 'پشت‌بام', 'انبار'], traces: ['گرد کاغذ قدیمی', 'پودر قهوه', 'دوده و خاکستر', 'گرد و خاک قدیمی'], open: 'کافه برای یک نشست خصوصی بسته شد.', cut: 'دستگاه قهوه با صدای بلندی از کار افتاد.' },
  { title: 'شب ویلا', place: 'یک ویلای باغ‌دار', role: 'صاحب ویلا', rooms: ['ایوان', 'زیرزمین', 'کنار استخر', 'گاراژ'], traces: ['خاکستر سیگار', 'بوی نم و کپک', 'لکه‌ی آب با بوی کلر', 'لکه‌ی روغن'], open: 'مهمانان برای شام دور هم جمع شدند.', cut: 'چراغ‌های حیاط چند دقیقه خاموش شد.' }
];
const TOPICS = [
  { n: 'بدهی', motive: 'قربانی مبلغ زیادی از تو طلب داشت و تهدید کرده بود اگر تا آخر هفته نپردازی، همه را باخبر می‌کند.', truth: 'رفتی از قربانی مهلت بگیری و بحثتان بالا گرفت.', obj: 'یادداشتی درباره‌ی یک بدهی' },
  { n: 'قرارداد', motive: 'قربانی می‌خواست قرارداد مشترکتان را به نفع خودش فسخ کند و تو همه‌ی سرمایه‌ات را در آن گذاشته بودی.', truth: 'برای چانه‌زنی سراغ قربانی رفتی و دست‌خالی برگشتی.', obj: 'نسخه‌ی مچاله‌ی یک قرارداد' },
  { n: 'رابطه‌ی پنهان', motive: 'قربانی از رابطه‌ی پنهان تو خبر داشت و تهدید کرده بود آن را فاش می‌کند.', truth: 'مخفیانه با کسی صحبت می‌کردی و نمی‌خواهی بگویی با که.', obj: 'پیامی نیمه‌پاک‌شده روی یک برگه' },
  { n: 'کنار گذاشته شدن', motive: 'قربانی قصد داشت فردا تو را از همه‌چیز کنار بگذارد و آینده‌ات به این کار بسته بود.', truth: 'نامه‌ی تصمیمش را دیده بودی و رفتی روبه‌رو با او بحث کنی.', obj: 'نامه‌ای درباره‌ی تغییر مسئولیت‌ها' },
  { n: 'سهم مشترک', motive: 'قربانی سهم تو را از یک شراکت کوچک کرده بود و تو به آن سهم نیاز داشتی.', truth: 'برای بازبینی سهم‌ها سراغ قربانی رفتی و قهر کردید.', obj: 'برگه‌ای با فهرست سهم‌ها' },
  { n: 'راز قدیمی', motive: 'قربانی رازی از گذشته‌ی تو می‌دانست و تهدید کرده بود فاشش می‌کند.', truth: 'رفتی قانعش کنی ساکت بماند.', obj: 'عکسی قدیمی با یک خط‌خوردگی' }
];
const NAMES = { f: ['سارا', 'نیلوفر', 'رها', 'پگاه', 'مهسا', 'لیلا', 'آتنا', 'ندا', 'شیدا'], m: ['مانی', 'آرمان', 'کیان', 'سینا', 'بابک', 'پوریا', 'فرهاد', 'امیر', 'کامران', 'بهرام'] };
const GF = ['یک انگشتر زنانه', 'یک گل‌سر ظریف', 'رد ماتیک روی یک دستمال', 'یک گوشواره‌ی کوچک'];
const GM = ['یک دکمه‌ی کت مردانه', 'یک ساعت مچی مردانه با بند چرمی', 'رد ادکلن تند مردانه روی یقه‌ی قربانی', 'یک سردکمه‌ی مردانه'];
const RELATIONS = ['همکار قدیمی قربانی', 'شریک کاری قربانی', 'آشنای خانوادگی قربانی', 'کارمند همین‌جا', 'مهمان دعوت‌شده', 'تأمین‌کننده', 'همسایه‌ی قربانی', 'حسابدار قربانی'];
const COVER = ['قدم می‌زدم و فکر می‌کردم', 'با گوشی کار داشتم', 'هوا می‌خوردم', 'وسایلم را مرتب می‌کردم'];
const ACT2 = ['منتظر یک تماس بودم', 'دنبال چیزی که گم کرده بودم می‌گشتم', 'کمی استراحت می‌کردم', 'کاری عقب‌افتاده را انجام می‌دادم'];
const SEEN = ['عصبی به نظر می‌رسید', 'داشت تلفنی با کسی بحث می‌کرد', 'خسته بود و گفت می‌خواهد کمی تنها باشد'];
const CAUSES = ['ضربه‌ای به پشت سر', 'نوشیدنی مسموم', 'خفگی'];
const LINES = ['راستش، تا آخرین لحظه فکر می‌کردم همه‌چیز عادی است...', 'یک چیز عجیب دیدم که هنوز به کسی نگفته‌ام: ...', 'قربانی همان شب به من گفت: ...', 'یک نفر زیادی آرام است؛ ...', 'اگر جای شما بودم اول از ... می‌پرسیدم.', 'آخرین باری که قربانی را دیدم، ...'];
const DET_LINES = ['آخرین بار کِی و کجا قربانی را دیدی؟', 'اگر کسی باید حرفت را تأیید کند، چه کسی است؟', 'از لحظه‌ی شروع شب تا پیدا شدن جسد دقیقاً چه کردی؟', 'با قربانی آن شب حرف زدی؟ درباره‌ی چه؟', 'چیز عجیبی دیدی که فکر می‌کردی مهم نیست؟', 'چه کسی را آن شب بیشتر از همه عصبی یا نگران دیدی؟', 'کدام‌یک از شما قربانی را از قبل می‌شناخت و چقدر؟', 'اگر ماجرای خودت را برعکس تعریف کنی، کجایش می‌لنگد؟'];
const IMPROV = ['یک خاطره‌ی کوتاه و ساختگی از قربانی بساز که با رابطه‌ات جور باشد.', 'یک جزئیات ریز از آن شب اختراع کن (بو، صدا یا نور) و در گفت‌وگو بگنجان.', 'یک سؤال غیرمنتظره از یکی از حاضران بپرس.', 'یک شک کوچک را بدون اتهام مستقیم مطرح کن.', 'گفت‌وگو را به سمت یکی از سرنخ‌های افشاشده ببر.'];
const OPENING = 'شروع پیشنهادی: از همه بخواه ادعای ساعت و مکان خود را یک‌بار بگویند و یادداشت کن چه کسی با چه کسی هم‌زمان بوده.';

function makeCase(n, roles) {
  const S = pick(SETTINGS), base = 1020 + 5 * Math.floor(Math.random() * 43);
  const k = roles.indexOf('قاتل'), det = roles.indexOf('کارآگاه');
  const pools = { f: shuffle(NAMES.f), m: shuffle(NAMES.m) };
  const victimName = pools[pick(['f', 'm'])].pop(), cause = pick(CAUSES);
  const genders = Array.from({ length: n }, () => pick(['f', 'm']));
  const rels = shuffle(RELATIONS), topics = shuffle(TOPICS);
  const scene = pick(S.rooms), open = S.rooms.filter(r => r !== scene);
  const trace = r => S.traces[S.rooms.indexOf(r)];
  const chars = Array.from({ length: n }, (_, i) => ({
    name: pools[genders[i]].pop(), g: genders[i], rel: rels[i % rels.length], topic: topics[i % topics.length],
    A: pick(open), cover: pick(COVER), act2: pick(ACT2), seen: fmt(base + 3 + Math.floor(Math.random() * 10)), lastSeen: pick(SEEN), B: null, comp: null
  }));
  const inn = shuffle(chars.map((_, i) => i).filter(i => i !== k));
  if (k >= 0 && inn.length && !inn.some(i => chars[i].A === chars[k].A)) chars[inn[0]].A = chars[k].A;
  for (let i = 0; i < inn.length; i += 2) {
    const a = inn[i], b = inn[i + 1], room = pick(open);
    chars[a].B = room; if (b !== undefined) { chars[b].B = room; chars[a].comp = b; chars[b].comp = a; }
  }
  if (k >= 0) {
    const c = inn.length ? pick(inn) : -1;
    chars[k].B = c >= 0 ? chars[c].B : pick(open); chars[k].comp = c >= 0 ? c : null; chars[k].lie = true;
  }
  const withTxt = c => c.comp !== null ? `؛ ${chars[c.comp].name} هم آنجا بود و با هم صحبت می‌کردیم` : '؛ تنها بودم';
  const claim = c => `از ساعت ${fmt(base)} تا ${fmt(base + 15)} در ${c.A} بودم؛ ${c.cover}. بعد از آن تا ${fmt(base + 30)} در ${c.B} ماندم؛ ${c.act2}${withTxt(c)}. آخرین باری که ${victimName} را دیدم حدود ${c.seen} بود و ${c.lastSeen}.`;

  const timeline = [`${fmt(base)} — ${S.open}`, `${fmt(base + 15)} — صدای بحث از ${scene} شنیده شد.`, `${fmt(base + 25)} — ${S.cut}`, `${fmt(base + 40)} — ${victimName} در ${scene} پیدا شد.`];
  const items = [];
  if (k >= 0) {
    const kg = chars[k].g === 'f';
    items.push({ kind: 'gender', text: `${pick(kg ? GF : GM)} کنار جسد پیدا شد.`, hint: `فهرست ${kg ? 'زنان' : 'مردان'} حاضر را جدا کن و درباره‌ی آن شب از آن‌ها بیشتر بپرس.` });
    items.push({ kind: 'trace', text: `روی کف ${scene} ردی از «${trace(chars[k].A)}» دیده می‌شود.`, hint: `فکر کن این اثر از کجای ${S.place} می‌آید و چه کسانی آنجا بوده‌اند؛ از آن‌ها بپرس چه کسی همراهشان بود.` });
  }
  items.push({ kind: 'time', text: `ساعت مچی قربانی شکسته و روی ${fmt(base + 20)} ایستاده است.`, hint: `ادعاها را برای بازه‌ی ${fmt(base + 15)} تا ${fmt(base + 30)} کنار هم بگذار؛ هر کس گفته با دیگری بوده، از آن دیگری هم بپرس.` });
  const others = chars.map((_, i) => i).filter(i => i !== k && i !== det);
  const r1 = others.length ? pick(others) : chars.map((_, i) => i).find(i => i !== k);
  if (r1 !== undefined) items.push({ kind: 'topic', text: `${chars[r1].topic.obj} در ${scene} پیدا شد.`, hint: 'کسی که ممکن است به این موضوع مربوط باشد را بدون اتهام مستقیم بپرس و واکنشش را ببین.' });
  if (n >= 5 && k >= 0) items.push({ kind: 'topic', text: `${chars[k].topic.obj} نزدیک ${scene} پیدا شد.`, hint: 'کسی که ممکن است به این موضوع مربوط باشد را بدون اتهام مستقیم بپرس و واکنشش را ببین.' });
  const order = shuffle(items.map((_, i) => i));
  if (items[order[0]].kind === 'trace' && order.length > 1) { const j = 1 + Math.floor(Math.random() * (order.length - 1)); [order[0], order[j]] = [order[j], order[0]]; }

  const cards = chars.map((c, i) => {
    const role = roles[i], tl = [];
    tl.push(`${fmt(base)}–${fmt(base + 15)} | ${c.A}: ${c.topic.truth}`);
    if (role === 'قاتل') {
      tl.push(`${fmt(base + 15)}–${fmt(base + 30)} | ${scene}: بحث با ${victimName} بالا گرفت و او را کشتی (${cause}). بعد برگشتی و ادعا کردی در ${c.B} و کنار ${chars[c.comp]?.name || 'یک نفر'} بوده‌ای.`);
    } else tl.push(`${fmt(base + 15)}–${fmt(base + 30)} | ${c.B}: ${c.act2}${withTxt(c)}.`);
    tl.push(`${fmt(base + 40)} | خبر پیدا شدن جسد در ${scene}.`);
    const task = role === 'قاتل' ? 'حقیقت پنهان در خط زمانی بالاست. هویتت را فاش نکن و شک را به سمت دیگران ببر؛ اگر درباره‌ی همراهت پرسیدند، بداهه و قانع‌کننده توضیح بده.'
      : role === 'کارآگاه' ? 'تو بی‌گناهی و کارآگاهی؛ آزادی بداهه بپرسی. سؤال‌ها و پیشنهادهای روند بازی فقط وقتی فعال می‌شوند که همه‌ی بازیکنان در رأی‌گیری موافق علنی شدن نقشت باشند.'
      : 'تو بی‌گناهی؛ راز بخش اول خط زمانی‌ات را وقتی لازم شد فاش کن یا با بداهه طفره برو، و ناهماهنگی بین ادعاها را پیدا کن.';
    return {
      character: `${c.name} (${c.g === 'f' ? 'زن' : 'مرد'})`, relation: c.rel, publicStatement: claim(c), privateHook: c.topic.motive,
      timeline: tl, requiredPrompt: task,
      lines: shuffle(role === 'کارآگاه' ? DET_LINES : LINES).slice(0, role === 'کارآگاه' ? 5 : 3),
      improv: shuffle(IMPROV).slice(0, 2)
    };
  });
  return {
    title: S.title, victim: `${victimName}، ${S.role}`, timeline, cards,
    clues: order.map(i => items[i].text), hints: order.map(i => items[i].hint), openingHint: OPENING,
    intro: `در ${S.place}، ${victimName} (${S.role}) با ${cause} در ${scene} مرده پیدا شده است. ${fa(n)} نفر آن شب آنجا بودند و هرکدام بخشی از ماجرا را می‌دانند؛ ادعاها و زمان‌ها را با هم مقایسه کنید.`
  };
}
module.exports = { makeCase };
