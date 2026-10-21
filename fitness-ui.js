import { makeWorkout, workoutSteps, workoutSources } from './workout.mjs';
import { shanghaiDate } from './online.mjs';

const fitEscape = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds = {random:'帮我选一个',strength:'力量训练',run:'轻松跑走',badminton:'羽毛球步法',mobility:'伸展放松'};
let fitContainer = null, fitTicker = null, fitPlan = null, fitSteps = [], fitIndex = 0, fitRemaining = 0, fitDeadline = 0, fitRunning = false;
let fitOptions = {kind:'random',minutes:25,equipment:'bodyweight',focus:'any',level:'easy'};
function loadFitValue(key,fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveFitValue(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* A session still works when storage is blocked. */ } }
function formatFitTime(seconds) { return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`; }

export function disposeFitness() {
  clearInterval(fitTicker); fitTicker = null; fitRunning = false;
  if (fitContainer) { fitContainer.removeEventListener('click',fitClick); fitContainer.removeEventListener('change',fitChange); }
  fitContainer = null;
}
export function renderFitness(container) {
  disposeFitness(); fitContainer = container;
  const stored = loadFitValue('roro:fitness:options',{});
  for (const key of ['kind','minutes','equipment','focus','level']) if (stored[key] != null) fitOptions[key] = stored[key];
  fitContainer.addEventListener('click',fitClick);
  fitContainer.addEventListener('change',fitChange);
  newFitPlan();
}
function newFitPlan() {
  clearInterval(fitTicker); fitRunning = false;
  fitPlan = makeWorkout({...fitOptions,seed:Date.now()});
  fitSteps = workoutSteps(fitPlan); fitIndex = 0; fitRemaining = fitSteps[0].seconds;
  saveFitValue('roro:fitness:options',fitOptions);
  paintFitness();
}
function fitSelect(key,values) { return `<select data-fit-option="${key}">${Object.entries(values).map(([value,name])=>`<option value="${value}" ${String(fitOptions[key])===value?'selected':''}>${name}</option>`).join('')}</select>`; }
function paintFitness() {
  if (!fitContainer) return;
  const logs = loadFitValue('roro:fitness:done',[]);
  const today = shanghaiDate();
  const done = Array.isArray(logs) && logs.includes(today);
  const exerciseRows = fitPlan.exercises.map((exercise,i)=>`<article class="fit-exercise"><label><input type="checkbox" data-fit-check="${i}"><span class="fit-exercise-name">${fitEscape(exercise.name)}</span></label><p class="fit-prescription">${exercise.sets} 组 · ${fitEscape(exercise.reps)}${exercise.restSeconds ? ` · 组间休息 ${exercise.restSeconds} 秒` : ''}</p><p>${fitEscape(exercise.cue)}</p>${exercise.sourceUrl?`<a href="${fitEscape(exercise.sourceUrl)}" target="_blank" rel="noopener noreferrer">动作参考 ↗</a>`:''}</article>`).join('');
  fitContainer.innerHTML = `<div class="fit-intro"><span aria-hidden="true">✿</span><div><p>今天，选一种舒服的方式动一动。</p><small>挑你舒服的方式，动一动，也可以轻松休息。</small></div></div>
  <div class="filter-row fit-kinds">${Object.entries(kinds).map(([kind,name])=>`<button class="filter-chip ${fitOptions.kind===kind?'active':''}" data-fit-kind="${kind}" aria-pressed="${fitOptions.kind===kind}">${name}</button>`).join('')}</div>
  <div class="fit-options"><label>留多少时间${fitSelect('minutes',{'15':'15 分钟','25':'25 分钟','40':'40 分钟'})}</label><label>手边的器械${fitSelect('equipment',{bodyweight:'徒手就好',band:'有弹力带',gym:'在健身房'})}</label><label>想练哪里${fitSelect('focus',{any:'帮我选',back:'今天练背',legs:'臀腿',core:'核心',upper:'胸肩上肢'})}</label><label>今天的状态${fitSelect('level',{easy:'轻松一点',regular:'正常练一练'})}</label></div>
  <div class="fit-plan-heading"><div><p class="small-date">今天这一份 · ${fitPlan.minutes} 分钟</p><h3>${fitEscape(fitPlan.title)}</h3><p>${fitEscape(fitPlan.why)}</p></div><button class="secondary-button" data-fit-command="shuffle">换一份安排</button></div>
  <div class="fit-intensity">${fitEscape(fitPlan.intensity)}</div>
  <section class="fit-timer" aria-label="分段运动计时"><div><span id="fit-phase">热身</span><strong id="fit-time">${formatFitTime(fitRemaining)}</strong><p id="fit-step-name"></p><small id="fit-step-cue"></small></div><div class="fit-timer-actions"><button class="primary-button" data-fit-command="toggle" id="fit-toggle">开始这一段</button><button class="secondary-button" data-fit-command="next">下一段</button><button class="text-button" data-fit-command="reset">从头开始</button></div><p class="fit-timer-message" id="fit-timer-message" role="status">每一段都可以暂停、跳过，做够就休息。</p><progress id="fit-progress" max="${fitSteps.length}" value="0" aria-label="当前练习进度"></progress></section>
  <div class="fit-phase-heading"><span>先热身 · 5 分钟</span></div><ul class="fit-list">${fitPlan.warmup.map(step=>`<li><strong>${fitEscape(step.name)}</strong><small>${Math.round(step.seconds/60)} 分钟</small><p>${fitEscape(step.cue)}</p></li>`).join('')}</ul>
  <div class="fit-phase-heading"><span>今天的主练习</span><small>可以勾选做过的动作</small></div><div class="fit-exercises">${exerciseRows}</div>
  <div class="fit-phase-heading"><span>最后，慢慢收个尾 · 5 分钟</span></div><ul class="fit-list">${fitPlan.cooldown.map(step=>`<li><strong>${fitEscape(step.name)}</strong><p>${fitEscape(step.cue)}</p></li>`).join('')}</ul>
  <div class="fit-done"><p id="fit-done-message">${done?'今天已经有好好动过啦。休息也很重要。':'哪怕只做一部分，也是在好好照顾自己。'}</p><button class="secondary-button" data-fit-command="done">${done?'今天已经记录了 ♡':'记下今天有动一动'}</button></div><p class="fit-safety">按舒服的节奏，做够即可休息。疼痛、头晕或明显不适时停止。${fitOptions.equipment==='gym'?' 不熟悉器械时，先请现场工作人员示范。':''}</p><details class="fit-sources"><summary>看看动作和强度参考</summary><p>动作参考 ACE；热身冷身参考 AHA；跑走参考 NHS；强度参考 CDC。组合和计时由这里整理。</p>${workoutSources.map(source=>`<a href="${fitEscape(source.url)}" target="_blank" rel="noopener noreferrer">${fitEscape(source.title)}</a>`).join('')}</details>`;
  paintFitTimer();
}
function paintFitTimer() {
  if (!fitContainer?.querySelector('#fit-time')) return;
  const step = fitSteps[fitIndex];
  const phases = {warmup:'热身',exercise:'主练习',rest:'休息一下',cooldown:'慢慢冷身'};
  fitContainer.querySelector('#fit-phase').textContent = `${phases[step.phase]} · ${fitIndex+1} / ${fitSteps.length}`;
  fitContainer.querySelector('#fit-time').textContent = formatFitTime(fitRemaining);
  fitContainer.querySelector('#fit-step-name').textContent = step.label;
  fitContainer.querySelector('#fit-step-cue').textContent = step.cue;
  fitContainer.querySelector('#fit-toggle').textContent = fitRunning ? '暂停一下' : fitRemaining === 0 ? '这一段完成啦' : '开始 / 继续';
  fitContainer.querySelector('#fit-toggle').disabled = fitRemaining === 0;
  fitContainer.querySelector('#fit-progress').value = fitIndex;
}
function toggleFitTimer() {
  if (fitRunning) { fitRemaining = Math.max(0,Math.ceil((fitDeadline-Date.now())/1000)); clearInterval(fitTicker); fitRunning = false; paintFitTimer(); return; }
  if (fitRemaining <= 0) return;
  fitDeadline = Date.now() + fitRemaining * 1000; fitRunning = true;
  fitTicker = setInterval(()=>{
    fitRemaining = Math.max(0,Math.ceil((fitDeadline-Date.now())/1000));
    if (!fitRemaining) { clearInterval(fitTicker); fitRunning = false; fitContainer.querySelector('#fit-timer-message').textContent = '这一段结束了。缓一缓，准备好了再点下一段。'; }
    paintFitTimer();
  },250);
  paintFitTimer();
}
function fitClick(event) {
  const kind = event.target.closest('[data-fit-kind]');
  if (kind) { fitOptions.kind=kind.dataset.fitKind; if (fitOptions.kind!=='strength' && fitOptions.kind!=='random') fitOptions.focus='any'; newFitPlan(); return; }
  const command = event.target.closest('[data-fit-command]')?.dataset.fitCommand;
  if (command==='shuffle') newFitPlan();
  if (command==='toggle') toggleFitTimer();
  if (command==='reset') { clearInterval(fitTicker); fitRunning=false; fitIndex=0; fitRemaining=fitSteps[0].seconds; paintFitTimer(); }
  if (command==='next') {
    clearInterval(fitTicker); fitRunning=false;
    if (fitIndex < fitSteps.length-1) { fitIndex++; fitRemaining=fitSteps[fitIndex].seconds; paintFitTimer(); }
    else { fitRemaining=0; paintFitTimer(); fitContainer.querySelector('#fit-timer-message').textContent='今天这份结束啦。喝口水，歇一歇。'; }
  }
  if (command==='done') {
    const stored=loadFitValue('roro:fitness:done',[]);const logs=Array.isArray(stored)?stored:[];
    saveFitValue('roro:fitness:done',[...new Set([...logs,shanghaiDate()])].slice(-90));
    fitContainer.querySelector('#fit-done-message').textContent='记下了。今天也有好好照顾自己。♡';
    event.target.closest('button').textContent='今天已经记录了 ♡';
  }
}
function fitChange(event) {
  const key=event.target.dataset.fitOption;
  if (key) { fitOptions[key]=key==='minutes'?Number(event.target.value):event.target.value; if(key==='focus' && fitOptions.focus!=='any')fitOptions.kind='strength';newFitPlan(); }
  if (event.target.matches('[data-fit-check]')) event.target.closest('.fit-exercise').classList.toggle('is-done',event.target.checked);
}
