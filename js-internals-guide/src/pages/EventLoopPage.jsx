import { useState, useCallback, useRef, useEffect } from 'react';
import Section, { Analogy, Important, CodeBlock, Diagram } from '../components/Section';
import CodeEditor from '../components/CodeEditor';
import EventLoopVisualizer from '../components/EventLoopVisualizer';
import PresetSelector from '../components/PresetSelector';
import presets from '../utils/presets';

export default function EventLoopPage({ onSectionVisible }) {
  const [code, setCode] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const sectionRefs = useRef({});

  /* ---- Intersection observer for sidebar highlight ---- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && onSectionVisible) {
            onSectionVisible(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    const ids = [
      'event-loop', 'micro-macro', 'promise', 'async-await',
      'multiple-await', 'error-handling', 'race-conditions',
      'abort-controller', 'visualizer',
    ];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [onSectionVisible]);

  /* ---- Handlers ---- */
  const handleRun = useCallback(src => setCode(src), []);
  const handlePreset = useCallback(preset => {
    setSelectedPreset(preset.id);
    setCode(preset.code);
  }, []);

  return (
    <div className="page-content">
      <header className="page-hero">
        <h1 className="page-hero-title">JavaScript Internals: Deep Dive</h1>
        <p className="page-hero-sub">
          Полное руководство по внутренним механизмам асинхронного JavaScript —
          от Event Loop до AbortController.
        </p>
      </header>

      {/* ===== 1. Event Loop ===== */}
      <Section id="event-loop" title="Что такое Event Loop?" icon="🔄">
        <p>
          <strong>Event Loop</strong> (цикл событий) — это фундаментальный механизм, благодаря
          которому JavaScript, будучи <strong>однопоточным</strong> языком, способен выполнять
          асинхронные операции: сетевые запросы, таймеры, обработку пользовательских событий — и при
          этом не блокировать интерфейс.
        </p>

        <Analogy>
          Представьте повара на кухне. Он может делать только одно действие в конкретный момент
          (нарезать, мешать, солить) — это <strong>один поток</strong>. Но пока суп варится
          на плите (таймер / Web API), повар не стоит и не ждёт — он занимается другими задачами.
          Когда таймер прозвенит, повар доделает текущее действие и вернётся к супу.
          Event Loop — это тот самый «мозг повара», который решает, что делать следующим.
        </Analogy>

        <h3>Как это работает?</h3>
        <p>
          Браузер (или Node.js) предоставляет среду выполнения с несколькими ключевыми компонентами:
        </p>
        <ol>
          <li>
            <strong>Call Stack</strong> — стек вызовов. Функции кладутся сюда при вызове и
            снимаются при завершении. JavaScript выполняет ровно одну функцию из вершины стека
            в каждый момент времени.
          </li>
          <li>
            <strong>Web APIs</strong> — браузерные API (setTimeout, fetch, DOM events и др.).
            Когда вы вызываете <code>setTimeout(cb, 1000)</code>, колбэк передаётся браузеру,
            который запускает таймер <em>вне</em> JS-потока.
          </li>
          <li>
            <strong>Callback / Macrotask Queue</strong> — очередь, куда попадают колбэки от Web
            API (setTimeout, setInterval, I/O, UI events).
          </li>
          <li>
            <strong>Microtask Queue</strong> — очередь повышенного приоритета для промисов
            (<code>Promise.then</code>, <code>queueMicrotask</code>, <code>MutationObserver</code>).
          </li>
        </ol>

        <Diagram>{`
┌──────────────────────────────────────────────────────────────┐
│                        EVENT LOOP                            │
│                                                              │
│   ┌─────────────┐      ┌──────────────┐                     │
│   │  Call Stack  │ ───▸ │   Web APIs   │                     │
│   │ (одна задача │      │  (таймеры,   │                     │
│   │  за раз)    │      │   fetch...)  │                     │
│   └──────┬──────┘      └──────┬───────┘                     │
│          │                    │                              │
│          │  Call Stack пуст?  │  Таймер сработал?            │
│          ▼                    ▼                              │
│   ┌──────────────┐    ┌──────────────────┐                  │
│   │  Microtask   │◀───│   Macrotask      │                  │
│   │  Queue       │    │   Queue          │                  │
│   │  (приоритет!)│    │   (setTimeout,   │                  │
│   └──────┬───────┘    │   events, I/O)   │                  │
│          │            └──────────────────┘                  │
│          ▼                                                   │
│   Выполнить ВСЕ микрозадачи ──▸ Взять ОДНУ макрозадачу      │
│   ──▸ Снова все микрозадачи ──▸ Рендер? ──▸ Повторить       │
└──────────────────────────────────────────────────────────────┘
        `}</Diagram>

        <h3>Алгоритм одной итерации Event Loop</h3>
        <ol>
          <li>Выполнить весь синхронный код (Call Stack пуст).</li>
          <li>Обработать <strong>ВСЮ</strong> microtask queue (все промисы, queueMicrotask).</li>
          <li>Если появились новые микрозадачи — обработать и их (до полного опустошения).</li>
          <li>Взять <strong>ОДНУ</strong> задачу из macrotask queue и выполнить.</li>
          <li>Снова обработать ВСЮ microtask queue.</li>
          <li>При необходимости — requestAnimationFrame + рендер.</li>
          <li>Перейти к шагу 4.</li>
        </ol>

        <Important>
          Микрозадачи имеют <strong>абсолютный приоритет</strong> над макрозадачами. Между каждой
          макрозадачей Event Loop полностью опустошает microtask queue. Это значит, что
          <code>Promise.then()</code> всегда выполнится раньше <code>setTimeout(cb, 0)</code>.
        </Important>
      </Section>

      {/* ===== 2. Micro vs Macro ===== */}
      <Section id="micro-macro" title="Micro vs Macro Tasks" icon="⚡">
        <p>
          Все асинхронные задачи в JavaScript делятся на два типа — <strong>микрозадачи</strong> и{' '}
          <strong>макрозадачи</strong>. Понимание разницы между ними — ключ к предсказанию порядка
          выполнения кода.
        </p>

        <h3>Макрозадачи (Macrotasks)</h3>
        <p>Помещаются в <strong>macrotask queue</strong>. Event Loop берёт из неё по одной задаче за итерацию.</p>
        <ul>
          <li><code>setTimeout</code> / <code>setInterval</code></li>
          <li><code>setImmediate</code> (Node.js)</li>
          <li>I/O операции</li>
          <li>UI-события (click, scroll, input...)</li>
          <li><code>MessageChannel</code></li>
          <li><code>requestAnimationFrame</code> (особый случай — выполняется перед рендером)</li>
        </ul>

        <h3>Микрозадачи (Microtasks)</h3>
        <p>
          Помещаются в <strong>microtask queue</strong>. Event Loop опустошает её
          <strong> полностью</strong> после каждой задачи из Call Stack.
        </p>
        <ul>
          <li><code>Promise.then / .catch / .finally</code></li>
          <li><code>queueMicrotask()</code></li>
          <li><code>MutationObserver</code></li>
          <li><code>process.nextTick()</code> (Node.js — ещё приоритетнее обычных микрозадач!)</li>
        </ul>

        <CodeBlock title="Классический пример: порядок выполнения">{`console.log("1 — sync");

setTimeout(() => {
  console.log("2 — macrotask (setTimeout)");
}, 0);

Promise.resolve().then(() => {
  console.log("3 — microtask (Promise)");
});

queueMicrotask(() => {
  console.log("4 — microtask (queueMicrotask)");
});

console.log("5 — sync");

// Вывод: 1, 5, 3, 4, 2`}</CodeBlock>

        <h3>Почему порядок именно такой?</h3>
        <ol>
          <li><code>"1"</code> и <code>"5"</code> — синхронный код, выполняется первым.</li>
          <li><code>"3"</code> и <code>"4"</code> — микрозадачи, обрабатываются сразу после синхронного кода.</li>
          <li><code>"2"</code> — макрозадача, выполняется последней.</li>
        </ol>

        <Important>
          <code>setTimeout(fn, 0)</code> не означает «выполнить немедленно»!
          Это означает «поставить в macrotask queue и выполнить, когда Call Stack опустеет
          И все микрозадачи будут обработаны». В браузерах минимальная задержка — ~4мс
          для вложенных setTimeout (HTML5 спецификация).
        </Important>

        <Analogy>
          Представьте очередь в больнице. Макрозадачи — обычные пациенты в очереди.
          Микрозадачи — экстренные пациенты с приоритетом. После каждого обычного пациента
          врач сначала принимает ВСЕХ экстренных, и только потом — следующего обычного.
          Если экстренных пациентов бесконечно — обычные так никогда и не попадут на приём
          (starvation — «голодание»).
        </Analogy>

        <h3>Опасность: Microtask Starvation</h3>
        <p>
          Если микрозадача порождает новую микрозадачу, а та — ещё одну, Event Loop
          <strong> никогда не перейдёт</strong> к макрозадачам и рендеру. Браузер зависнет:
        </p>
        <CodeBlock title="Бесконечные микрозадачи — НЕ делайте так!">{`// ❌ Это заморозит браузер!
function recursiveMicrotask() {
  queueMicrotask(() => {
    console.log("ещё одна микрозадача...");
    recursiveMicrotask(); // порождает новую
  });
}
recursiveMicrotask();
// setTimeout, рендер, UI — всё заблокировано навсегда`}</CodeBlock>
      </Section>

      {/* ===== 3. Promise ===== */}
      <Section id="promise" title="Как работает Promise?" icon="🤝">
        <p>
          <strong>Promise</strong> — объект, представляющий результат асинхронной операции,
          который может быть доступен сейчас, в будущем, или никогда. Это основа современного
          асинхронного JavaScript.
        </p>

        <h3>Три состояния промиса</h3>
        <Diagram>{`
  ┌─────────┐     resolve(value)     ┌───────────┐
  │ PENDING │ ─────────────────────▸ │ FULFILLED │
  │ (ожида- │                        │ (успех)   │
  │  ние)   │                        └───────────┘
  └────┬────┘
       │         reject(reason)      ┌───────────┐
       └────────────────────────────▸│ REJECTED  │
                                     │ (ошибка)  │
                                     └───────────┘

  Переход возможен ТОЛЬКО ОДИН РАЗ:
  pending → fulfilled   ИЛИ   pending → rejected
  После перехода состояние НЕ меняется (immutable).
        `}</Diagram>

        <h3>Создание промиса</h3>
        <CodeBlock title="Анатомия Promise">{`const myPromise = new Promise((resolve, reject) => {
  // Executor — выполняется СИНХРОННО!
  console.log("executor запущен"); // выведется сразу

  // Имитируем асинхронную операцию
  setTimeout(() => {
    const success = Math.random() > 0.5;
    if (success) {
      resolve("Данные получены!");  // → fulfilled
    } else {
      reject(new Error("Сбой!"));   // → rejected
    }
  }, 1000);
});

// .then() регистрирует колбэки
myPromise
  .then(value => console.log("Успех:", value))
  .catch(err => console.log("Ошибка:", err.message));`}</CodeBlock>

        <Important>
          Функция-executor внутри <code>new Promise()</code> выполняется <strong>синхронно</strong>!
          Только колбэки <code>.then()</code> / <code>.catch()</code> / <code>.finally()</code>
          попадают в microtask queue.
        </Important>

        <h3>Цепочки промисов (Promise Chaining)</h3>
        <p>
          Каждый <code>.then()</code> возвращает <strong>новый промис</strong>, что позволяет строить цепочки:
        </p>
        <CodeBlock title="Chaining">{`fetch("/api/user")
  .then(res => res.json())       // промис #2
  .then(user => fetch(user.url)) // промис #3
  .then(res => res.json())       // промис #4
  .then(data => console.log(data))
  .catch(err => console.error("Любая ошибка в цепочке:", err));`}</CodeBlock>

        <p>
          Если колбэк в <code>.then()</code> возвращает значение — следующий <code>.then()</code>
          получит его. Если возвращает промис — цепочка «ждёт» его разрешения.
        </p>

        <h3>Статические методы Promise</h3>
        <CodeBlock title="Promise.all / race / allSettled / any">{`// Promise.all — ждёт ВСЕ, падает при первой ошибке
const results = await Promise.all([fetchA(), fetchB(), fetchC()]);

// Promise.allSettled — ждёт ВСЕ, НЕ падает
const settled = await Promise.allSettled([fetchA(), fetchB()]);
// [{status:"fulfilled", value:...}, {status:"rejected", reason:...}]

// Promise.race — возвращает первый завершившийся (успех ИЛИ ошибка)
const fastest = await Promise.race([fetchA(), timeout(5000)]);

// Promise.any — возвращает первый УСПЕШНЫЙ, игнорирует ошибки
const first = await Promise.any([mirrorA(), mirrorB(), mirrorC()]);`}</CodeBlock>

        <Analogy>
          <strong>Promise.all</strong> — группа друзей договорилась встретиться в кафе. Пока не придут
          ВСЕ — не начинаем. Если хоть один откажется — встреча отменена.<br/>
          <strong>Promise.race</strong> — кто первый добежит до финиша, того и результат.<br/>
          <strong>Promise.any</strong> — кто первый добежит <em>успешно</em> (упавшие не считаются).
        </Analogy>
      </Section>

      {/* ===== 4. async/await ===== */}
      <Section id="async-await" title="async/await под капотом" icon="⚙️">
        <p>
          <code>async/await</code> — это <strong>синтаксический сахар</strong> над промисами.
          Под капотом каждая async-функция возвращает промис, а <code>await</code> приостанавливает
          выполнение функции до разрешения промиса.
        </p>

        <h3>Что делает async?</h3>
        <CodeBlock title="async оборачивает возврат в промис">{`async function getNumber() {
  return 42;
}

// Эквивалентно:
function getNumber() {
  return Promise.resolve(42);
}

getNumber().then(n => console.log(n)); // 42`}</CodeBlock>

        <h3>Что делает await?</h3>
        <p>
          <code>await</code> «приостанавливает» async-функцию и ставит её продолжение
          как <strong>микрозадачу</strong>. Код после <code>await</code> — это, по сути,
          колбэк <code>.then()</code>:
        </p>

        <CodeBlock title="await ≈ .then()">{`// Вариант с async/await:
async function example() {
  console.log("A");
  const data = await fetch("/api");
  console.log("B"); // выполнится как микрозадача после резолва fetch
}

// Под капотом это превращается примерно в:
function example() {
  console.log("A");
  return fetch("/api").then(data => {
    console.log("B");
  });
}`}</CodeBlock>

        <Important>
          Код <strong>до</strong> первого <code>await</code> в async-функции выполняется{' '}
          <strong>синхронно</strong>! Приостановка происходит только в момент <code>await</code>.
        </Important>

        <CodeBlock title="Доказательство синхронности до await">{`async function demo() {
  console.log("1 — sync (внутри async, до await)");
  await Promise.resolve();
  console.log("4 — microtask (после await)");
}

console.log("0 — sync");
demo();
console.log("2 — sync (после вызова demo)");
Promise.resolve().then(() => console.log("3 — microtask"));

// Вывод: 0, 1, 2, 3, 4
// "1" выводится ДО "2", потому что код до await — синхронный.
// "4" выводится ПОСЛЕ "3", потому что await создаёт микрозадачу.`}</CodeBlock>

        <Analogy>
          <code>await</code> — как «приостановить чтение книги и положить закладку».
          Вы откладываете книгу (async-функцию), занимаетесь другими делами (синхронный код,
          другие микрозадачи), а когда появится свободное время и ответ будет готов —
          возвращаетесь к закладке и читаете дальше.
        </Analogy>
      </Section>

      {/* ===== 5. Multiple await ===== */}
      <Section id="multiple-await" title="Несколько await подряд" icon="⏳">
        <p>
          Одна из самых частых ошибок — ставить <code>await</code> подряд для
          <strong> независимых</strong> операций. Это превращает параллельные запросы
          в последовательные и убивает производительность.
        </p>

        <h3>Последовательное выполнение (медленно)</h3>
        <CodeBlock title="❌ Каждый await ждёт предыдущий">{`async function loadData() {
  const users = await fetch("/api/users");    // 500ms
  const posts = await fetch("/api/posts");    // 500ms
  const comments = await fetch("/api/comments"); // 500ms
  // Итого: ~1500ms (последовательно!)
}`}</CodeBlock>

        <h3>Параллельное выполнение (быстро)</h3>
        <CodeBlock title="✅ Promise.all — запускаем параллельно">{`async function loadData() {
  const [users, posts, comments] = await Promise.all([
    fetch("/api/users"),    // ─┐
    fetch("/api/posts"),    //  ├── параллельно!
    fetch("/api/comments"), // ─┘
  ]);
  // Итого: ~500ms (время самого медленного запроса)
}`}</CodeBlock>

        <Important>
          Используйте <code>Promise.all</code> для <strong>независимых</strong> операций.
          Последовательные <code>await</code> нужны только когда следующий запрос{' '}
          <strong>зависит от результата</strong> предыдущего.
        </Important>

        <h3>Когда последовательность нужна</h3>
        <CodeBlock title="✅ Зависимые запросы — await подряд оправдан">{`async function loadUserPosts() {
  // Шаг 1: получить пользователя
  const user = await fetchUser(userId);
  // Шаг 2: нужен user.id для загрузки его постов
  const posts = await fetchPosts(user.id);
  // Шаг 3: нужны posts для загрузки комментариев
  const comments = await fetchComments(posts.map(p => p.id));
}`}</CodeBlock>

        <h3>Смешанный паттерн</h3>
        <CodeBlock title="✅ Комбинация параллельного и последовательного">{`async function loadDashboard() {
  // Шаг 1: загрузить пользователя (нужен для остального)
  const user = await fetchUser(userId);

  // Шаг 2: зная user, загрузить его данные ПАРАЛЛЕЛЬНО
  const [posts, friends, settings] = await Promise.all([
    fetchPosts(user.id),
    fetchFriends(user.id),
    fetchSettings(user.id),
  ]);
}`}</CodeBlock>

        <Analogy>
          Последовательные await — как стирать, потом сушить, потом гладить одну за другой вещь.
          Promise.all — как загрузить три стиральные машины одновременно. Общее время — время
          самой долгой стирки, а не сумма всех.
        </Analogy>
      </Section>

      {/* ===== 6. Error Handling ===== */}
      <Section id="error-handling" title="Обработка ошибок" icon="🛡️">
        <p>
          Необработанные ошибки в промисах — одна из главных причин «тихих» багов. В отличие от
          синхронного кода, ошибка в промисе не крашит приложение сразу — она просто
          тихо проглатывается, если нет <code>.catch()</code>.
        </p>

        <h3>try/catch с async/await</h3>
        <CodeBlock title="Стандартный паттерн">{`async function loadUser() {
  try {
    const res = await fetch("/api/user");
    if (!res.ok) {
      throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
    }
    const user = await res.json();
    return user;
  } catch (err) {
    console.error("Ошибка загрузки:", err.message);
    return null; // fallback
  } finally {
    hideSpinner(); // выполнится ВСЕГДА
  }
}`}</CodeBlock>

        <h3>.catch() в цепочках промисов</h3>
        <CodeBlock title="Ошибка всплывает по цепочке">{`fetch("/api/data")
  .then(res => res.json())
  .then(data => processData(data))
  .then(result => displayResult(result))
  .catch(err => {
    // Ловит ошибку из ЛЮБОГО .then() выше!
    console.error("Что-то пошло не так:", err);
  });`}</CodeBlock>

        <Important>
          <code>.catch()</code> в цепочке промисов ловит ошибки от ВСЕХ предыдущих <code>.then()</code>.
          Ошибка «всплывает» по цепочке до ближайшего <code>.catch()</code>, как исключение
          в обычном try/catch.
        </Important>

        <h3>Ошибки в Promise.all</h3>
        <CodeBlock title="Promise.all падает при первой ошибке">{`// ❌ Одна ошибка отменяет всё
try {
  const [a, b, c] = await Promise.all([
    fetchA(),  // ✅ успех
    fetchB(),  // ❌ ошибка! → всё отменено
    fetchC(),  // ✅ успех (но результат потерян)
  ]);
} catch (err) {
  // err — ошибка из fetchB
}

// ✅ allSettled — не падает, возвращает все результаты
const results = await Promise.allSettled([fetchA(), fetchB(), fetchC()]);
results.forEach(r => {
  if (r.status === "fulfilled") console.log("OK:", r.value);
  else console.log("Ошибка:", r.reason);
});`}</CodeBlock>

        <h3>Глобальный перехват необработанных ошибок</h3>
        <CodeBlock title="Ловим забытые ошибки">{`// В браузере
window.addEventListener("unhandledrejection", event => {
  console.error("Необработанный промис:", event.reason);
  event.preventDefault(); // предотвращает вывод в консоль
});

// В Node.js
process.on("unhandledRejection", (reason, promise) => {
  console.error("Необработанный промис:", reason);
});`}</CodeBlock>

        <Analogy>
          try/catch — это страховочная сетка циркового акробата. Она не предотвращает
          падение, но спасает от катастрофы. Без <code>.catch()</code> ваш код — акробат без сетки:
          одна ошибка — и данные потеряны навсегда, а пользователь видит пустой экран.
        </Analogy>
      </Section>

      {/* ===== 7. Race Conditions ===== */}
      <Section id="race-conditions" title="Race Conditions" icon="🏁">
        <p>
          <strong>Race condition</strong> (состояние гонки) — ситуация, когда результат зависит
          от непредсказуемого порядка завершения асинхронных операций. Это одна из самых коварных
          категорий багов — они воспроизводятся нестабильно и сложно отлаживаются.
        </p>

        <h3>Классический пример: поиск с автодополнением</h3>
        <CodeBlock title="❌ Баг: устаревшие результаты">{`// Пользователь быстро печатает "react"
// Запросы уходят: "r", "re", "rea", "reac", "react"
// НО ответы могут прийти в ЛЮБОМ порядке!

searchInput.addEventListener("input", async (e) => {
  const query = e.target.value;
  const results = await fetch(\`/api/search?q=\${query}\`);
  const data = await results.json();
  displayResults(data);
  // Если ответ на "re" придёт ПОСЛЕ ответа на "react",
  // пользователь увидит результаты для "re" вместо "react"!
});`}</CodeBlock>

        <h3>Решение 1: Отслеживание последнего запроса</h3>
        <CodeBlock title="✅ Игнорируем устаревшие ответы">{`let currentRequestId = 0;

searchInput.addEventListener("input", async (e) => {
  const query = e.target.value;
  const requestId = ++currentRequestId; // уникальный ID

  const results = await fetch(\`/api/search?q=\${query}\`);
  const data = await results.json();

  // Показываем результаты только если это последний запрос
  if (requestId === currentRequestId) {
    displayResults(data);
  }
  // Устаревшие ответы просто игнорируются
});`}</CodeBlock>

        <h3>Решение 2: AbortController (отмена предыдущих запросов)</h3>
        <CodeBlock title="✅ Отменяем предыдущий запрос">{`let controller = null;

searchInput.addEventListener("input", async (e) => {
  // Отменяем предыдущий запрос
  controller?.abort();
  controller = new AbortController();

  try {
    const res = await fetch(\`/api/search?q=\${e.target.value}\`, {
      signal: controller.signal,
    });
    const data = await res.json();
    displayResults(data);
  } catch (err) {
    if (err.name !== "AbortError") throw err;
    // AbortError — это нормально, просто игнорируем
  }
});`}</CodeBlock>

        <h3>Решение 3: Debounce</h3>
        <CodeBlock title="✅ Задержка перед запросом">{`function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Запрос уйдёт только через 300мс после последнего нажатия
searchInput.addEventListener("input", debounce(async (e) => {
  const res = await fetch(\`/api/search?q=\${e.target.value}\`);
  displayResults(await res.json());
}, 300));`}</CodeBlock>

        <Important>
          В реальных приложениях лучше комбинировать все три подхода: debounce +
          AbortController + проверка актуальности. Это даёт максимальную защиту от
          race conditions и экономит сетевой трафик.
        </Important>

        <Analogy>
          Race condition — как заказать пиццу из трёх разных пиццерий и открыть дверь
          первому курьеру. Проблема: вы не знаете, какая пиццерия доставит первой.
          Решение: запомнить номер последнего заказа и принимать только его.
        </Analogy>
      </Section>

      {/* ===== 8. AbortController ===== */}
      <Section id="abort-controller" title="AbortController" icon="🛑">
        <p>
          <strong>AbortController</strong> — встроенный API для отмены асинхронных операций.
          Он особенно важен для предотвращения утечек памяти и race conditions в React-компонентах,
          отмены fetch-запросов и любых операций, поддерживающих <code>AbortSignal</code>.
        </p>

        <h3>Основы API</h3>
        <CodeBlock title="Как работает AbortController">{`// 1. Создаём контроллер
const controller = new AbortController();
const signal = controller.signal;

// 2. Передаём signal в операцию
fetch("/api/heavy-data", { signal })
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => {
    if (err.name === "AbortError") {
      console.log("Запрос отменён");
    } else {
      throw err; // настоящая ошибка
    }
  });

// 3. Отменяем когда нужно
controller.abort(); // → вызывает AbortError в fetch`}</CodeBlock>

        <h3>AbortController в React</h3>
        <p>
          Классический use-case — отмена fetch при размонтировании компонента или при изменении зависимостей:
        </p>
        <CodeBlock title="Отмена запросов в useEffect">{`function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUser() {
      try {
        const res = await fetch(\`/api/users/\${userId}\`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setUser(data); // безопасно — компонент ещё жив
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Ошибка:", err);
        }
      }
    }

    loadUser();

    // Cleanup: отменяем запрос при размонтировании
    // или при изменении userId
    return () => controller.abort();
  }, [userId]);
}`}</CodeBlock>

        <h3>Таймаут с AbortSignal.timeout()</h3>
        <CodeBlock title="Автоматический таймаут">{`// Современный способ (Chrome 103+)
const res = await fetch("/api/data", {
  signal: AbortSignal.timeout(5000), // отмена через 5 сек
});

// Ручной способ (кросс-браузерный)
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const res = await fetch("/api/data", { signal: controller.signal });
  clearTimeout(timeoutId);
  return await res.json();
} catch (err) {
  if (err.name === "AbortError") {
    throw new Error("Запрос превысил таймаут 5 секунд");
  }
  throw err;
}`}</CodeBlock>

        <h3>Комбинирование сигналов</h3>
        <CodeBlock title="AbortSignal.any() — несколько причин отмены">{`// Отмена по таймауту ИЛИ по действию пользователя
const userController = new AbortController();
cancelButton.onclick = () => userController.abort();

const res = await fetch("/api/data", {
  signal: AbortSignal.any([
    AbortSignal.timeout(10000),     // таймаут 10 сек
    userController.signal,           // кнопка «Отмена»
  ]),
});`}</CodeBlock>

        <Important>
          Всегда проверяйте <code>err.name === "AbortError"</code> при обработке ошибок от
          отменённых операций. Это не настоящая ошибка — это ожидаемое поведение, которое
          не нужно логировать как баг.
        </Important>

        <Analogy>
          AbortController — как пульт дистанционного управления для асинхронных операций.
          Вы даёте «приёмник» (signal) операции, а «пульт» (controller) оставляете себе.
          В любой момент можете нажать кнопку abort() — и операция остановится.
        </Analogy>
      </Section>

      {/* ===== 9. Interactive Visualizer ===== */}
      <Section id="visualizer" title="Интерактивный визуализатор" icon="🧪">
        <p>
          Теперь применим теорию на практике! Введите JavaScript-код или выберите готовый
          пример — визуализатор покажет пошагово, как Event Loop обрабатывает ваш код:
          что попадает в Call Stack, Microtask Queue и Macrotask Queue на каждом шаге.
        </p>

        <PresetSelector
          presets={presets}
          selectedId={selectedPreset}
          onSelect={handlePreset}
        />

        <CodeEditor initialCode={code} onRun={handleRun} />

        <EventLoopVisualizer code={code} />

        {selectedPreset && (
          <div className="preset-explanation">
            <h4>Разбор примера</h4>
            <p className="preset-explanation-text">
              {presets.find(p => p.id === selectedPreset)?.explanation}
            </p>
            <div className="preset-expected">
              <strong>Ожидаемый вывод:</strong>
              <code className="preset-expected-output">
                {presets.find(p => p.id === selectedPreset)?.expectedOutput.join(', ')}
              </code>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
