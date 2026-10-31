(() => {
 const KEY='yj-broadcast-intro-seen';
 function init(){
  const overlay=document.getElementById('broadcastIntro');if(!overlay)return;
  const close=()=>{overlay.classList.add('is-leaving');try{sessionStorage.setItem(KEY,'1')}catch(_){};setTimeout(()=>overlay.remove(),900);};
  overlay.querySelector('[data-skip]').addEventListener('click',close);
  overlay.querySelector('[data-sound]').addEventListener('click',e=>{
   try{
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
    const ctx=new Ctx(),now=ctx.currentTime;
    [220,330,440].forEach((freq,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,now+i*.13);gain.gain.setValueAtTime(.0001,now+i*.13);gain.gain.exponentialRampToValueAtTime(.035,now+i*.13+.12);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.13+.65);osc.connect(gain);gain.connect(ctx.destination);osc.start(now+i*.13);osc.stop(now+i*.13+.7);});
    e.currentTarget.textContent='Звукът е пуснат';
   }catch(_){e.currentTarget.textContent='Звукът не е наличен';}
  });
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){close();return;}
  let seen=false;try{seen=sessionStorage.getItem(KEY)==='1'}catch(_){}
  if(seen){overlay.remove();return;}
  window.setTimeout(close,3300);
 }
 document.addEventListener('DOMContentLoaded',init);
})();