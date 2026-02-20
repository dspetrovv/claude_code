/**
 * Preset code examples for the Event Loop visualizer.
 * Each preset demonstrates a specific aspect of async JS execution.
 */

const presets = [
  {
    id: 'basic-order',
    title: '1. Базовый порядок: sync → micro → macro',
    difficulty: 'easy',
    code: `console.log("1: Синхронный")
setTimeout(() => console.log("2: setTimeout (макро)"), 0)
Promise.resolve().then(() => console.log("3: Promise (микро)"))
console.log("4: Синхронный")`,
    expectedOutput: [
      '1: Синхронный',
      '4: Синхронный',
      '3: Promise (микро)',
      '2: setTimeout (макро)',
    ],
    explanation: `Ключевое правило: синхронный код → все микрозадачи → одна макрозадача → все микрозадачи → ...

1. console.log("1") выполняется сразу — синхронный код.
2. setTimeout ставит колбэк в macrotask queue (даже с 0мс!).
3. Promise.resolve().then() ставит колбэк в microtask queue.
4. console.log("4") выполняется сразу — синхронный.
5. Call Stack пуст → Event Loop проверяет microtask queue → "3" выводится.
6. Microtask queue пуста → Event Loop берёт из macrotask queue → "2" выводится.`,
  },
  {
    id: 'nested-promises',
    title: '2. Вложенные Promise.then()',
    difficulty: 'medium',
    code: `console.log("start")
Promise.resolve().then(() => console.log("promise 1"))
Promise.resolve().then(() => console.log("promise 2"))
Promise.resolve().then(() => console.log("promise 3"))
console.log("end")`,
    expectedOutput: ['start', 'end', 'promise 1', 'promise 2', 'promise 3'],
    explanation: `Все три .then() колбэка попадают в microtask queue в порядке регистрации.
После завершения синхронного кода Event Loop опустошает ВСЮ microtask queue — все три промиса выполняются подряд, до того как Event Loop перейдёт к макрозадачам.

Важно: microtask queue всегда полностью опустошается перед переходом к макрозадачам!`,
  },
  {
    id: 'promise-chain-vs-setTimeout',
    title: '3. Цепочка промисов vs setTimeout',
    difficulty: 'medium',
    code: `console.log("1")
setTimeout(() => console.log("2"), 0)
Promise.resolve().then(() => console.log("3"))
Promise.resolve().then(() => console.log("4"))
setTimeout(() => console.log("5"), 0)
console.log("6")`,
    expectedOutput: ['1', '6', '3', '4', '2', '5'],
    explanation: `Разберём пошагово:
1. "1" — синхронно
2. setTimeout(cb, 0) → cb в macrotask queue (#1)
3. Promise.then(cb) → cb в microtask queue (#1)
4. Promise.then(cb) → cb в microtask queue (#2)
5. setTimeout(cb, 0) → cb в macrotask queue (#2)
6. "6" — синхронно

Call Stack пуст → опустошаем microtask queue → "3", "4"
Microtask queue пуста → берём макрозадачу → "2"
После макрозадачи проверяем microtask → пуста → берём макрозадачу → "5"`,
  },
  {
    id: 'microtask-starvation',
    title: '4. Микрозадачи порождают микрозадачи',
    difficulty: 'hard',
    code: `console.log("start")
setTimeout(() => console.log("timeout"), 0)
Promise.resolve().then(() => console.log("micro 1"))
queueMicrotask(() => console.log("micro 2"))
Promise.resolve().then(() => console.log("micro 3"))
console.log("end")`,
    expectedOutput: ['start', 'end', 'micro 1', 'micro 2', 'micro 3', 'timeout'],
    explanation: `Микрозадачи (Promise.then и queueMicrotask) обрабатываются в одной и той же microtask queue!

queueMicrotask() — это более "чистый" способ поставить микрозадачу, без создания промиса.

Опасность: если микрозадача порождает новую микрозадачу — она тоже будет выполнена ДО макрозадач.
Это может привести к "голоданию" (starvation) макрозадач — браузер не сможет перерисоваться и зависнет!`,
  },
  {
    id: 'settimeout-ordering',
    title: '5. setTimeout с разными задержками',
    difficulty: 'easy',
    code: `console.log("start")
setTimeout(() => console.log("timeout 100ms"), 100)
setTimeout(() => console.log("timeout 0ms"), 0)
setTimeout(() => console.log("timeout 50ms"), 50)
console.log("end")`,
    expectedOutput: ['start', 'end', 'timeout 0ms', 'timeout 50ms', 'timeout 100ms'],
    explanation: `setTimeout не гарантирует точное время выполнения — это МИНИМАЛЬНАЯ задержка!

Колбэки попадают в macrotask queue по мере истечения таймера.
setTimeout(cb, 0) — НЕ мгновенное выполнение, а "выполни как можно скорее, но после текущего синхронного кода".

Факт: браузеры зажимают минимальную задержку setTimeout до ~4мс для вложенных вызовов (HTML5 spec).`,
  },
  {
    id: 'mixed-complex',
    title: '6. Комплексный пример: всё вместе',
    difficulty: 'hard',
    code: `console.log("1")
setTimeout(() => console.log("2"), 0)
Promise.resolve().then(() => console.log("3"))
setTimeout(() => console.log("4"), 0)
queueMicrotask(() => console.log("5"))
Promise.resolve().then(() => console.log("6"))
console.log("7")`,
    expectedOutput: ['1', '7', '3', '5', '6', '2', '4'],
    explanation: `Полный алгоритм Event Loop:

СИНХРОННАЯ ФАЗА:
→ console.log("1") → выводит "1"
→ setTimeout(cb,0) → cb → macrotask queue [#1]
→ Promise.then(cb) → cb → microtask queue [#1]
→ setTimeout(cb,0) → cb → macrotask queue [#2]
→ queueMicrotask(cb) → cb → microtask queue [#2]
→ Promise.then(cb) → cb → microtask queue [#3]
→ console.log("7") → выводит "7"

MICROTASK ФАЗА (опустошаем всё!):
→ microtask #1 → "3"
→ microtask #2 → "5"
→ microtask #3 → "6"

MACROTASK ФАЗА (по одной!):
→ macrotask #1 → "2" → проверяем microtask queue (пусто)
→ macrotask #2 → "4" → проверяем microtask queue (пусто)`,
  },
  {
    id: 'raf-example',
    title: '7. requestAnimationFrame в цикле',
    difficulty: 'medium',
    code: `console.log("start")
requestAnimationFrame(() => console.log("rAF"))
setTimeout(() => console.log("timeout"), 0)
Promise.resolve().then(() => console.log("promise"))
console.log("end")`,
    expectedOutput: ['start', 'end', 'promise', 'rAF', 'timeout'],
    explanation: `requestAnimationFrame (rAF) — особый зверь! Он выполняется перед перерисовкой, НО после микрозадач.

Порядок в одной итерации Event Loop:
1. Синхронный код
2. Microtask queue (полностью)
3. Проверка — нужна ли перерисовка?
4. Если да → rAF callbacks
5. Рендер/перерисовка
6. Macrotask queue (одна задача)

Примечание: порядок rAF vs setTimeout может варьироваться между браузерами!
В Chrome rAF обычно выполняется перед setTimeout(0), но спецификация этого НЕ гарантирует.`,
  },
  {
    id: 'promise-vs-queuemicrotask',
    title: '8. Promise.then vs queueMicrotask',
    difficulty: 'easy',
    code: `queueMicrotask(() => console.log("queueMicrotask 1"))
Promise.resolve().then(() => console.log("promise 1"))
queueMicrotask(() => console.log("queueMicrotask 2"))
Promise.resolve().then(() => console.log("promise 2"))`,
    expectedOutput: [
      'queueMicrotask 1',
      'promise 1',
      'queueMicrotask 2',
      'promise 2',
    ],
    explanation: `Promise.then() и queueMicrotask() оба ставят задачи в одну и ту же microtask queue!
Порядок определяется тем, в каком порядке они были вызваны.

Разница:
- queueMicrotask() — напрямую добавляет в microtask queue
- Promise.resolve().then() — сначала создаёт resolved промис, затем его .then() ставит колбэк в microtask queue

Они функционально эквивалентны для планирования микрозадач, но queueMicrotask() чуть "легче" — не создаёт лишний объект Promise.`,
  },
  {
    id: 'interview-trap',
    title: '9. Ловушка с собеседований',
    difficulty: 'hard',
    code: `console.log("A")
setTimeout(() => console.log("B"), 0)
Promise.resolve().then(() => console.log("C"))
queueMicrotask(() => console.log("D"))
setTimeout(() => console.log("E"), 0)
Promise.resolve().then(() => console.log("F"))
requestAnimationFrame(() => console.log("G"))
console.log("H")`,
    expectedOutput: ['A', 'H', 'C', 'D', 'F', 'G', 'B', 'E'],
    explanation: `Классический вопрос с собеседований! Алгоритм:

1. SYNC: "A" → console.log
2. setTimeout(B,0) → macrotask queue
3. Promise.then(C) → microtask queue
4. queueMicrotask(D) → microtask queue
5. setTimeout(E,0) → macrotask queue
6. Promise.then(F) → microtask queue
7. rAF(G) → animation frame callback
8. SYNC: "H" → console.log

Call Stack пуст → drain microtasks: C, D, F
→ rAF: G (перед перерисовкой)
→ macrotask: B → drain microtasks (пусто)
→ macrotask: E → drain microtasks (пусто)

Итог: A, H, C, D, F, G, B, E`,
  },
  {
    id: 'timeout-inside-promise',
    title: '10. setTimeout внутри Promise',
    difficulty: 'hard',
    code: `console.log("start")
setTimeout(() => console.log("timeout 1"), 0)
Promise.resolve().then(() => console.log("promise 1"))
Promise.resolve().then(() => console.log("promise 2"))
setTimeout(() => console.log("timeout 2"), 0)
console.log("end")`,
    expectedOutput: ['start', 'end', 'promise 1', 'promise 2', 'timeout 1', 'timeout 2'],
    explanation: `Ещё раз закрепляем железное правило:

Порядок приоритетов Event Loop:
1. 🥇 Синхронный код (выполняется первым, всегда)
2. 🥈 Microtask queue (Promise.then, queueMicrotask, MutationObserver)
3. 🥉 Macrotask queue (setTimeout, setInterval, I/O, UI events)

Promise.then() ВСЕГДА выполнится раньше setTimeout(0), потому что:
- Промисы ставят микрозадачи
- setTimeout ставит макрозадачи
- Микрозадачи имеют АБСОЛЮТНЫЙ ПРИОРИТЕТ над макрозадачами`,
  },
];

export default presets;
