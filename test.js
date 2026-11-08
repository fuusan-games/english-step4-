const fs=require('fs'),vm=require('vm');const html=fs.readFileSync(__dirname+'/index.html','utf8');
const js=html.match(/<script>([\s\S]*)<\/script>/)[1];let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}};
function boot(ls){const els={};const mk=id=>els[id]||(els[id]={innerHTML:'',addEventListener(){},focus(){}});
 const win={localStorage:ls,scrollTo(){}};const ctx={window:win,document:{getElementById:mk,addEventListener(){}},console,confirm:()=>true,JSON,Math};
 vm.createContext(ctx);vm.runInContext(js,ctx);return {A:win.App,html:()=>els.app.innerHTML};}
const mem={};const ls={getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=v}};
let {A,html:H}=boot(ls);const Q=A.QUESTIONS;
const cnt={};Q.forEach(q=>cnt[q.cat]=(cnt[q.cat]||0)+1);console.log('counts',Q.length,cnt);
ok(Q.length===120&&cnt.vocab===40&&cnt.grammar===50&&cnt.reading===30&&Object.keys(A.PASSAGES).length===10&&Object.keys(A.PASSAGES).every(p=>Q.filter(q=>q.passage===p).length===3),'count');ok(new Set(Q.map(q=>q.id)).size===Q.length,'unique ids');
Q.forEach(q=>{ok(q.choices.length===4&&new Set(q.choices).size===4,'choices '+q.id);ok(q.answer>=0&&q.answer<4,'ans '+q.id);ok(q.ja&&q.exp&&q.q,'text '+q.id);if(q.cat==='reading')ok(A.PASSAGES[q.passage],'passage '+q.id);});
ok(new Set(Q.map(q=>q.q)).size===Q.length,'unique stems');ok(H().includes('ミックス'),'home');
// mixed flow, all correct
A.start('mixed');let s=A.session();ok(s.items.length===10,'10 items');
for(let i=0;i<10;i++){const it=A.session().items[A.session().i];const k=it.order.indexOf(it.q.answer);A.answer(k);A.answer((k+1)%4);ok(it.picked===k,'no double');A.next();}
ok(A.session().done&&A.session().score===10,'score 10');ok(A.state().answered===10,'no double score');ok(H().includes('10問中 10問'),'results');
// category with wrongs
A.start('grammar');const wr=[];A.session().items.forEach(()=>{const it=A.session().items[A.session().i];ok(it.q.cat==='grammar','cat');A.next();ok(!A.session().done||false,'next blocked before answer');const k=(it.order.indexOf(it.q.answer)+1)%4;A.answer(k);wr.push(it.q.id);A.next();});
ok(A.state().wrong.length===10,'wrong pool');
// persistence
let b2=boot(ls);ok(b2.A.state().wrong.length===10&&b2.A.state().answered===20,'persist');A=b2.A;
// review: answer half correctly
A.start('review');ok(A.session().items.every(it=>wr.includes(it.q.id)),'review pool');let n=0;
A.session().items.forEach(()=>{const it=A.session().items[A.session().i];const c=it.order.indexOf(it.q.answer);A.answer(n++%2?c:(c+1)%4);A.next()});
ok(A.state().wrong.length===5,'review clears only correct: '+A.state().wrong.length);
// reading sorted by passage, mark
A.start('reading');const ps=A.session().items.map(i=>i.q.passage);ok(ps.join()===ps.slice().sort().join(),'reading grouped');A.answer(0);A.toggleMark(A.session().items[0].q.id);ok(A.state().marked.length===1,'mark');
// shuffle distribution check
const pos=[0,0,0,0];for(let t=0;t<200;t++){A.start('vocab');const it=A.session().items[0];pos[it.order.indexOf(it.q.answer)]++}ok(pos.every(p=>p>20),'shuffle '+pos);
// broken storage fallback (file://)
const bad={getItem(){throw Error('x')},setItem(){throw Error('x')}};const b3=boot(bad);b3.A.start('mixed');const it=b3.A.session().items[0];b3.A.answer(0);ok(b3.A.state().answered===1&&b3.A.store.ok===false,'fallback');b3.A.home();ok(b3.html().includes('保存できない'),'fallback notice');
ok(!/https?:\/\//.test(html),'no external urls');ok(/頑張れ！武流！英検マスターへの道/.test(html)&&/特定の検定試験・団体とは関係ありません/.test(html),'title and no-affiliation');
{const m2={'chugaku-step.v1':JSON.stringify({answered:5,correct:2,sessions:1,wrong:['v01','g10','r05','zz9'],marked:['r02']})};const l2={getItem:k=>m2[k]??null,setItem:(k,v)=>{m2[k]=v}};const b=boot(l2);ok(b.A.state().wrong.join()==='v01,g10,r05'&&b.A.state().answered===5,'old data compat');b.A.start('review');ok(b.A.session().items.length===3,'old review');b.A.session().items.forEach(()=>{const it=b.A.session().items[b.A.session().i];ok(it.q.choices[it.q.answer]===it.q.choices[0],'map');b.A.answer(it.order.indexOf(it.q.answer));b.A.next()});ok(b.A.state().wrong.length===0,'old review cleared');b.A.home();ok(b.html().includes('全120問')&&b.html().includes('短い英文10本'),'count shown');}
console.log(fails?fails+' FAILURES':'ALL OK');process.exit(fails?1:0);
