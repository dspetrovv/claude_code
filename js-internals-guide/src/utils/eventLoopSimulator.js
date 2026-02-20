/**
 * Event Loop Simulator
 * Parses and simulates JS code execution showing how tasks flow through
 * the call stack, microtask queue, macrotask queue, and Web APIs.
 */

const STEP_TYPES = {
  CALL_STACK: 'callStack',
  MICROTASK: 'microtask',
  MACROTASK: 'macrotask',
  WEB_API: 'webApi',
  LOG: 'log',
  RENDER: 'render',
};

/**
 * Creates a simulation of event loop execution from code string.
 * Returns an array of steps, each describing the state of the system.
 */
export function simulateEventLoop(code) {
  const steps = [];
  const state = {
    callStack: [],
    microtaskQueue: [],
    macrotaskQueue: [],
    webApis: [],
    log: [],
    phase: 'sync', // sync | microtasks | macrotasks | render
    description: '',
  };

  function snapshot(description) {
    steps.push({
      callStack: [...state.callStack],
      microtaskQueue: [...state.microtaskQueue],
      macrotaskQueue: [...state.macrotaskQueue],
      webApis: [...state.webApis],
      log: [...state.log],
      phase: state.phase,
      description,
    });
  }

  try {
    const parsed = parseCode(code);
    executeParsed(parsed, state, snapshot);
  } catch {
    snapshot('Ошибка парсинга кода. Используйте один из пресетов.');
  }

  return steps;
}

function parseCode(code) {
  const commands = [];
  const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

  for (const line of lines) {
    const cmd = parseLine(line);
    if (cmd) commands.push(cmd);
  }

  return commands;
}

function parseLine(line) {
  // console.log(...)
  let m = line.match(/^console\.log\(\s*['"`](.+?)['"`]\s*\)/);
  if (m) return { type: 'log', value: m[1] };
  m = line.match(/^console\.log\(\s*(.+?)\s*\)/);
  if (m) return { type: 'log', value: m[1] };

  // setTimeout(() => { ... }, delay)
  m = line.match(/^setTimeout\(\s*\(\)\s*=>\s*\{?\s*(.*?)\s*\}?\s*,\s*(\d+)\s*\)/);
  if (m) {
    const inner = parseInnerCommands(m[1]);
    return { type: 'setTimeout', delay: parseInt(m[2]), body: inner };
  }
  m = line.match(/^setTimeout\(\s*\(\)\s*=>\s*(.+?)\s*,\s*(\d+)\s*\)/);
  if (m) {
    const inner = parseInnerCommands(m[1]);
    return { type: 'setTimeout', delay: parseInt(m[2]), body: inner };
  }

  // Promise.resolve().then(() => ...)
  m = line.match(/^Promise\.resolve\(\)\.then\(\s*\(\)\s*=>\s*\{?\s*(.*?)\s*\}?\s*\)/);
  if (m) {
    const inner = parseInnerCommands(m[1]);
    return { type: 'promiseThen', body: inner };
  }

  // queueMicrotask(() => ...)
  m = line.match(/^queueMicrotask\(\s*\(\)\s*=>\s*\{?\s*(.*?)\s*\}?\s*\)/);
  if (m) {
    const inner = parseInnerCommands(m[1]);
    return { type: 'queueMicrotask', body: inner };
  }

  // fetch simulation
  m = line.match(/^fetch\(/);
  if (m) return { type: 'log', value: '[fetch call]' };

  // requestAnimationFrame
  m = line.match(/^requestAnimationFrame\(\s*\(\)\s*=>\s*\{?\s*(.*?)\s*\}?\s*\)/);
  if (m) {
    const inner = parseInnerCommands(m[1]);
    return { type: 'raf', body: inner };
  }

  // Generic - treat as sync
  if (line.length > 0) {
    return { type: 'sync', value: line };
  }

  return null;
}

function parseInnerCommands(str) {
  if (!str) return [];
  const parts = str.split(';').map(s => s.trim()).filter(Boolean);
  return parts.map(parseLine).filter(Boolean);
}

function executeParsed(commands, state, snapshot) {
  state.phase = 'sync';

  // Phase 1: Execute synchronous code
  snapshot('Начало выполнения скрипта. Глобальный контекст помещён в Call Stack.');
  state.callStack.push('⟨script⟩');
  snapshot('Скрипт начинает выполняться синхронно, строка за строкой.');

  for (const cmd of commands) {
    executeCommand(cmd, state, snapshot, 'sync');
  }

  state.callStack.pop(); // remove <script>
  snapshot('Весь синхронный код выполнен. ⟨script⟩ снимается со стека. Начинается обработка очередей.');

  // Phase 2: Drain microtask queue
  drainMicrotasks(state, snapshot);

  // Phase 3: Render opportunity
  if (state.macrotaskQueue.length > 0 || state.log.length > 0) {
    state.phase = 'render';
    snapshot('Браузер может выполнить перерисовку (render) перед обработкой следующей макрозадачи.');
  }

  // Phase 4: Process macrotask queue (one at a time, then microtasks)
  while (state.macrotaskQueue.length > 0) {
    state.phase = 'macrotasks';
    const task = state.macrotaskQueue.shift();
    snapshot(`Макрозадача "${task.label}" извлечена из очереди и помещена в Call Stack.`);
    state.callStack.push(task.label);
    snapshot(`Выполняется макрозадача: ${task.label}`);

    for (const cmd of task.body) {
      executeCommand(cmd, state, snapshot, 'macrotask');
    }

    state.callStack.pop();
    snapshot(`Макрозадача "${task.label}" завершена и снята со стека.`);

    // After each macrotask, drain microtasks
    drainMicrotasks(state, snapshot);

    // Render opportunity
    if (state.macrotaskQueue.length > 0) {
      state.phase = 'render';
      snapshot('Рендер-возможность между макрозадачами.');
    }
  }

  state.phase = 'sync';
  snapshot('Все задачи выполнены. Event Loop ожидает новых событий.');
}

function executeCommand(cmd, state, snapshot, context) {
  switch (cmd.type) {
    case 'log': {
      state.callStack.push(`console.log("${cmd.value}")`);
      snapshot(`console.log("${cmd.value}") помещён в Call Stack.`);
      state.log.push(cmd.value);
      snapshot(`"${cmd.value}" выведено в консоль.`);
      state.callStack.pop();
      break;
    }
    case 'setTimeout': {
      const label = `setTimeout(${cmd.delay}ms)`;
      state.callStack.push(label);
      snapshot(`${label} помещён в Call Stack.`);
      state.callStack.pop();

      if (cmd.delay === 0) {
        state.macrotaskQueue.push({
          label: `callback setTimeout(${cmd.delay}ms)`,
          body: cmd.body,
        });
        snapshot(`${label} — колбэк сразу добавлен в Macrotask Queue (задержка 0мс, но всё равно макрозадача!).`);
      } else {
        state.webApis.push(label);
        snapshot(`${label} отправлен в Web APIs (браузер отсчитывает ${cmd.delay}мс).`);
        state.webApis = state.webApis.filter(w => w !== label);
        state.macrotaskQueue.push({
          label: `callback setTimeout(${cmd.delay}ms)`,
          body: cmd.body,
        });
        snapshot(`Таймер ${label} истёк. Колбэк перемещён из Web APIs в Macrotask Queue.`);
      }
      break;
    }
    case 'promiseThen': {
      const label = 'Promise.resolve().then(cb)';
      state.callStack.push(label);
      snapshot(`${label} помещён в Call Stack. Promise уже resolved.`);
      state.callStack.pop();
      state.microtaskQueue.push({
        label: 'Promise.then callback',
        body: cmd.body,
      });
      snapshot('Колбэк .then() добавлен в Microtask Queue (промис уже выполнен, колбэк встаёт в очередь).');
      break;
    }
    case 'queueMicrotask': {
      const label = 'queueMicrotask(cb)';
      state.callStack.push(label);
      snapshot(`${label} помещён в Call Stack.`);
      state.callStack.pop();
      state.microtaskQueue.push({
        label: 'queueMicrotask callback',
        body: cmd.body,
      });
      snapshot('Колбэк добавлен в Microtask Queue.');
      break;
    }
    case 'raf': {
      const label = 'requestAnimationFrame(cb)';
      state.callStack.push(label);
      snapshot(`${label} помещён в Call Stack.`);
      state.callStack.pop();
      state.macrotaskQueue.push({
        label: 'rAF callback',
        body: cmd.body,
      });
      snapshot('Колбэк requestAnimationFrame запланирован перед следующей перерисовкой.');
      break;
    }
    case 'sync': {
      state.callStack.push(cmd.value);
      snapshot(`Синхронная операция: ${cmd.value}`);
      state.callStack.pop();
      break;
    }
    default:
      break;
  }
}

function drainMicrotasks(state, snapshot) {
  if (state.microtaskQueue.length === 0) return;

  state.phase = 'microtasks';
  snapshot(`Обработка Microtask Queue (${state.microtaskQueue.length} задач). Микрозадачи ВСЕГДА выполняются до макрозадач!`);

  while (state.microtaskQueue.length > 0) {
    const task = state.microtaskQueue.shift();
    state.callStack.push(task.label);
    snapshot(`Микрозадача "${task.label}" помещена в Call Stack.`);

    for (const cmd of task.body) {
      executeCommand(cmd, state, snapshot, 'microtask');
    }

    state.callStack.pop();
    snapshot(`Микрозадача "${task.label}" завершена.`);
  }

  snapshot('Microtask Queue пуста.');
}

export { STEP_TYPES };
