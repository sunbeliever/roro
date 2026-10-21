const sources = {
  intensity: { title: 'CDC：用谈话测试判断运动强度', url: 'https://www.cdc.gov/physical-activity-basics/measuring/index.html' },
  warm: { title: 'AHA：热身、冷身与舒适伸展', url: 'https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/warm-up-cool-down' },
  run: { title: 'NHS：Couch to 5K 跑走交替', url: 'https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/' },
  basic: { title: 'NHS：基础力量动作', url: 'https://www.nhs.uk/live-well/exercise/strength-exercises/' },
  bird: { title: 'ACE：鸟狗及躯干控制', url: 'https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/' },
  cat: { title: 'ACE：猫牛活动', url: 'https://www.acefitness.org/resources/everyone/exercise-library/15/cat-cow/' },
  limb: { title: 'ACE：俯卧交替抬肢', url: 'https://www.acefitness.org/resources/everyone/exercise-library/53/contralateral-limb-raises/' },
  squat: { title: 'ACE：徒手深蹲', url: 'https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/' },
  row: { title: 'ACE：器械坐姿划船', url: 'https://www.acefitness.org/resources/everyone/exercise-library/168/seated-row/' },
  pull: { title: 'ACE：器械坐姿高位下拉', url: 'https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/' },
  bandRow: { title: 'ACE：居家弹力带划船', url: 'https://www.acefitness.org/resources/everyone/blog/6087/how-to-create-a-home-gym-on-a-tight-budget/' },
  bandPull: { title: 'ACE：跪姿弹力带／拉索下拉', url: 'https://www.acefitness.org/resources/everyone/exercise-library/35/kneeling-lat-pulldown/' },
  badminton: { title: 'Badminton England：基础分腿垫步与移动教学（本工具改为单人低速练习）', url: 'https://www.badmintonengland.co.uk/wp-content/uploads/2021/04/TRP-Social-Distance_-Full-Module-new.pdf' }
};
export const workoutSources = Object.freeze(Object.values(sources).map(source => Object.freeze(source)));

const exercise = (name, cue, source, reps = '缓慢完成 6–8 次以内，做够即可休息') => ({ name, cue, sourceUrl: sources[source].url, reps });
const moves = {
  birdArm: exercise('四点跪姿交替抬手', '手在肩下、膝在髋下，先让一只手轻轻离地；躯干不转，腰背不塌。', 'bird', '左右交替，每侧 3–4 次以内'),
  birdLeg: exercise('四点跪姿交替伸腿', '一次只慢慢伸出一条腿，能保持骨盆平稳才稍抬高；不要追求高度。', 'bird', '左右交替，每侧 3–4 次以内'),
  limbArm: exercise('俯卧交替抬单臂', '额头朝地、颈部自然，腹部轻收，一次只抬一只手少许，不抬头、不拱腰。', 'limb', '左右交替，每侧 3–4 次以内'),
  limbLeg: exercise('俯卧交替轻抬单腿', '一次仅让一条腿稍离地，保持髋部不转、腰背不拱；幅度小也可以。', 'limb', '左右交替，每侧 3–4 次以内'),
  cat: exercise('猫牛小幅活动', '四点支撑，随着自然呼吸小幅拱背、回到舒适位置；不挤压腰部，不顶到极限。', 'cat', '舒适范围内缓慢往返 3–4 次'),
  squat: exercise('舒适幅度徒手蹲', '双脚站稳，髋向后、膝盖随脚尖方向弯曲；下蹲到可控深度，起身时呼气。', 'squat'),
  calf: exercise('扶墙缓慢提踵', '手轻扶牢固墙面帮助平衡，双脚跟慢慢抬起再放下，不弹震。', 'basic'),
  sideLeg: exercise('扶墙侧抬腿', '轻扶墙面，身体直立，单腿小幅向侧方抬起再放回，左右交替，不侧倒身体。', 'basic', '左右交替，每侧 3–4 次以内'),
  legBack: exercise('扶墙向后伸腿', '轻扶墙面，一条腿小幅向后伸，骨盆朝前、腰不后仰；左右交替。', 'basic', '左右交替，每侧 3–4 次以内'),
  wallPush: exercise('墙面俯卧撑', '双手放在牢固墙面，身体保持一条直线，缓慢靠近再推回；站近一点可减轻负担。', 'basic'),
  bandRow: exercise('站姿弹力带划船', '按器材说明确认固定点可靠、弹力带完好；身体直立、肘贴近身体向后拉，缓慢还原。', 'bandRow'),
  bandPull: exercise('跪姿弹力带下拉', '先按器材说明确认高位固定可靠，使用轻阻力；肘向身体两侧下拉，不拉到颈后，不甩动身体。', 'bandPull'),
  row: exercise('器械坐姿划船', '先调好座椅和胸垫；胸部轻贴支撑，肘向后拉再慢慢还原，不后仰借力。', 'row'),
  pull: exercise('器械高位下拉', '调好大腿固定垫，轻阻力向胸前下拉；不拉到颈后，躯干不摇摆，缓慢还原。', 'pull'),
  calfStretch: exercise('小腿舒适伸展', '扶墙前后站，后脚跟贴地，感到轻柔牵拉即可；每侧约 15 秒，不弹震、不疼痛。', 'warm', '左右各一次舒适保持'),
  shoulderStretch: exercise('肩部舒适伸展', '一只手臂轻放胸前，用另一手轻扶上臂；肩膀放松，每侧约 15 秒，不强拉关节。', 'warm', '左右各一次舒适保持')
};

function hash(value) {
  let state = 2166136261;
  for (const char of String(value)) { state ^= char.codePointAt(0); state = Math.imul(state, 16777619); }
  return state >>> 0;
}

function randomFromSeed(seed) {
  let state = hash(`${typeof seed}:${seed}`);
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const index = Math.floor(random() * (i + 1));
    [result[i], result[index]] = [result[index], result[i]];
  }
  return result;
}

function strengthMoves(focus, equipment, limit, random) {
  const back = [moves.birdArm, moves.limbArm, moves.birdLeg, moves.limbLeg];
  const legs = [moves.squat, moves.calf, moves.sideLeg, moves.legBack];
  const upper = [moves.wallPush, moves.limbArm, moves.birdArm, moves.cat];
  const core = [moves.birdArm, moves.birdLeg, moves.limbArm, moves.cat];
  const resistance = equipment === 'band' ? [moves.bandRow, moves.bandPull] : equipment === 'gym' ? [moves.row, moves.pull] : [];
  const priorities = focus === 'back' ? resistance : [];
  const pools = { back, legs, upper, core, any: [...new Set([...back, ...legs, ...upper, ...resistance])] };
  return [...priorities, ...shuffle(pools[focus], random)].slice(0, limit);
}

function block(move, sets, seconds, restSeconds) { return { ...move, sets, seconds, restSeconds }; }

function addRemainingWalk(exercises, budget) {
  const used = exercises.reduce((total, item) => total + item.sets * (item.seconds + item.restSeconds), 0);
  if (used < budget) exercises.push(block(exercise('余时轻松走动／调整', '这段留给缓步、换动作和喝少量水；无需额外补做，也可以提前进入冷身。', 'intensity', '按舒适节奏，不追求次数'), 1, budget - used, 0));
  return exercises;
}

export function makeWorkout(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('运动参数应为对象');
  const allowed = (value, list, fallback) => list.includes(value) ? value : fallback;
  let kind = allowed(input.kind, ['random', 'strength', 'run', 'badminton', 'mobility'], 'random');
  const minutes = allowed(Number(input.minutes), [15, 25, 40], 25);
  const equipment = allowed(input.equipment, ['bodyweight', 'band', 'gym'], 'bodyweight');
  let focus = allowed(input.focus, ['any', 'back', 'legs', 'core', 'upper'], 'any');
  const level = allowed(input.level, ['easy', 'regular'], 'easy');
  const seed = input.seed === undefined ? Math.random() : input.seed;
  if (!(typeof seed === 'string' || typeof seed === 'number' && Number.isFinite(seed))) throw new Error('seed 随机种子应为有限数字或文字');
  const random = randomFromSeed(seed);
  let variant;
  if (kind === 'random') {
    variant = focus === 'any' ? ['strength', 'run', 'badminton', 'stretch', 'recovery'][Math.floor(random() * 5)] : 'strength';
    kind = ['stretch', 'recovery'].includes(variant) ? 'mobility' : variant;
  }
  if (kind === 'mobility') variant ??= random() < 0.5 ? 'stretch' : 'recovery';
  if (kind === 'run' || kind === 'badminton') focus = 'any';
  const budget = minutes * 60 - 600;
  const notes = [
    '这是依据官方资料整理的动作库；组数和计时由本工具安排，不是联网动作接口或个体处方。',
    '时长是含换动作、休息和缓步的时间窗口；次数只是建议，做够即可休息，可以暂停或提前结束。',
    '自然呼吸，不憋气；出现疼痛、胸部不适、头晕或明显不舒服时停止。'
  ];
  let title, why, intensity, exercises;
  if (kind === 'strength') {
    const target = { any: '全身基础', back: '背部', legs: '下肢', core: '核心控制', upper: '上肢基础' }[focus];
    const gear = { bodyweight: '徒手', band: '弹力带', gym: '健身房' }[equipment];
    title = `${target}练习 · ${gear}`;
    why = focus === 'back' && equipment === 'bodyweight'
      ? '今天练背，先做徒手稳定与控制；这不等同于大重量背部训练，想增加拉的阻力可以改选弹力带或健身房。'
      : `把今天留给${target}，用${gear}做可控的基础动作，组间留足调整时间。`;
    intensity = '轻到中等努力，以动作可控为上限；自然呼吸，不练到力竭。';
    const count = minutes === 15 ? 2 : minutes === 25 ? 3 : 4;
    const selected = strengthMoves(focus, equipment, count, random);
    const sets = Math.min(3, Math.floor(budget / (selected.length * 120)));
    const seconds = level === 'easy' ? 30 : 40;
    exercises = addRemainingWalk(selected.map(move => block(move, sets, seconds, 120 - seconds)), budget);
    notes.push('选择还能留有余力、能稳定完成的阻力；动作变形就结束该组，不为计时补次数。');
    if (equipment === 'band') notes.push('固定点与弹力带完好程度须按器材说明确认；无法确认固定可靠时，改选徒手方案。');
    if (equipment === 'gym') notes.push('先调好座椅和限位，从轻阻力开始；不熟悉器械时，先请现场工作人员示范。');
  } else if (kind === 'run') {
    title = '轻松跑走，按自己的节奏';
    why = '不追配速，用短跑段和恢复走交替，让今天也能轻松开始。';
    intensity = '以能完整说短句为准；如果说不完整，就放慢或改成走路。';
    const seconds = level === 'easy' ? 60 : 90;
    exercises = addRemainingWalk([block(exercise('轻松跑', '自然慢跑，肩膀放松、小步落地；跑不舒服就把这段改为走路。', 'run', '按时间和谈话舒适程度调整'), Math.floor(budget / (seconds + 90)), seconds, 90)], budget);
    notes.push('参考 NHS 跑走交替思路；这里的 15／25／40 分钟由本工具安排，不是完整 Couch to 5K 课表。两次跑步间安排休息日。');
  } else if (kind === 'badminton') {
    title = '不持拍，也能练一点羽毛球步法';
    why = '今天先练单人、小幅度的移动和回中，不持拍也能开始。';
    intensity = '低速到中等努力，保持能完整说短句；累了就踏步或走动恢复。';
    const footwork = [
      exercise('小幅分腿垫步', '两脚略分开、膝微屈，小幅弹动后轻落地；不适应弹动就双脚交替踏步，不追求跳高。', 'badminton', '小幅、轻落地，不追求次数'),
      exercise('左右侧滑步', '在不滑的空地小步向左右移动，后脚跟上、双脚不交叉；范围小一些，随时能停稳。', 'badminton', '左右交替、动作可控'),
      exercise('前后小步与回中', '向前一两小步后用小步回到起点，再向后小步移动；先确认身后空间，不做深弓步或急冲。', 'badminton', '前后交替、每次回中站稳')
    ];
    const seconds = level === 'easy' ? 30 : 40, rest = level === 'easy' ? 45 : 50;
    const sets = Math.floor(budget / (footwork.length * (seconds + rest)));
    exercises = addRemainingWalk(shuffle(footwork, random).map(move => block(move, sets, seconds, rest)), budget);
    notes.push('步法参考 Badminton England 基础教学，改为单人低速练习；不要求球拍、对手或跳杀，计时与组数是本工具的安排。');
  } else {
    intensity = '轻松活动，能自在说话；不追求出汗或拉伸幅度。';
    title = variant === 'recovery' ? '轻松恢复，散步就好' : '活动伸展，留一点轻松';
    why = variant === 'recovery' ? '今天可以轻一点，留给舒适散步和恢复；不必每天都加练。' : '用舒适活动和缓步换换姿势，拉伸轻柔、不弹震，也不拉到疼痛。';
    if (variant === 'recovery') exercises = [block(exercise('舒适散步', '按能自在说话的速度走，走累了可以停下来休息，不追步数。', 'intensity', '按舒适节奏'), 1, budget, 0)];
    else {
      const selected = focus === 'back' || focus === 'core' ? [moves.cat, moves.birdArm] : focus === 'legs' ? [moves.calfStretch, moves.calf] : [moves.shoulderStretch, moves.calfStretch];
      const sets = Math.min(2, Math.floor(budget / (selected.length * 120)));
      exercises = addRemainingWalk(selected.map(move => block(move, sets, 30, 90)), budget);
    }
    notes.push('如果今天累了，也可以改成真正的休息日；不必为了打卡补练。');
  }
  const warmup = kind === 'run'
    ? [{ name: '热身走', seconds: 300, cue: '先慢走，逐渐走到舒适的较快步速；热身不着急跑。' }]
    : [{ name: '轻松走与活动肩踝', seconds: 180, cue: '从慢走开始，轻松摆臂，小幅活动肩膀和脚踝。' }, { name: '小幅预演今天动作', seconds: 120, cue: '从今天的动作中挑一两个，先不用阻力、慢速小幅预演；呼吸自然。' }];
  const cooldown = [{ name: '冷身慢走', seconds: 300, cue: '逐渐放慢脚步，让呼吸平缓下来，别突然停住；之后可再做舒适的轻柔伸展。' }];
  const totalSeconds = warmup.reduce((total, item) => total + item.seconds, 0) + exercises.reduce((total, item) => total + item.sets * (item.seconds + item.restSeconds), 0) + cooldown.reduce((total, item) => total + item.seconds, 0);
  const id = `workout-${hash(JSON.stringify([seed, kind, variant, minutes, equipment, focus, level, exercises.map(item => item.name)])).toString(36)}`;
  return { id, title, kind, focus, minutes, intensity, why, warmup, exercises, cooldown, totalSeconds, notes };
}

// seconds is the time window for one set; restSeconds follows every set,
// including its final set. That final recovery also covers changing exercises.
export function workoutSteps(plan) {
  if (!plan || !Array.isArray(plan.warmup) || !Array.isArray(plan.exercises) || !Array.isArray(plan.cooldown)) throw new Error('运动计划格式不完整');
  const steps = [];
  const add = (label, seconds, cue, phase) => {
    if (!Number.isInteger(seconds) || seconds <= 0) throw new Error('运动计划时长必须为正整数秒');
    steps.push({ label, seconds, cue, phase });
  };
  for (const item of plan.warmup) add(item.name, item.seconds, item.cue, 'warmup');
  for (const item of plan.exercises) {
    if (!Number.isInteger(item.sets) || item.sets < 1 || item.sets > 100 || !Number.isInteger(item.restSeconds) || item.restSeconds < 0) throw new Error('运动计划组数或休息秒数无效');
    for (let index = 0; index < item.sets; index++) {
      add(`${item.name} · ${index + 1}/${item.sets} 组`, item.seconds, `${item.cue} ${item.reps || ''}`, 'exercise');
      if (item.restSeconds) add(plan.kind === 'run' ? '走路恢复' : '组间休息与调整', item.restSeconds, plan.kind === 'run' ? '继续轻松走，恢复到能自在说话；需要时可以延长恢复或结束。' : '自然呼吸，放松和调整；需要更久可以暂停计时，不必赶下一组。', 'rest');
    }
  }
  for (const item of plan.cooldown) add(item.name, item.seconds, item.cue, 'cooldown');
  return steps;
}
