import { useState, useEffect, useCallback, useRef } from 'react';
import { simulateEventLoop } from '../utils/eventLoopSimulator';
import './EventLoopVisualizer.css';

export default function EventLoopVisualizer({ code, autoPlay = false }) {
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const timerRef = useRef(null);

  useEffect(() => {
    if (code && code.trim()) {
      const simulated = simulateEventLoop(code);
      setSteps(simulated);
      setCurrentStep(0);
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [code]);

  useEffect(() => {
    if (autoPlay && steps.length > 0) {
      setIsPlaying(true);
    }
  }, [autoPlay, steps]);

  useEffect(() => {
    if (isPlaying && currentStep < steps.length - 1) {
      timerRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timerRef.current);
    } else if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, steps.length, speed]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);
  const stepForward = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);
  const stepBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  if (steps.length === 0) {
    return (
      <div className="el-visualizer el-visualizer--empty">
        <p>Нажмите «Запустить симуляцию» чтобы увидеть работу Event Loop</p>
      </div>
    );
  }

  const step = steps[currentStep] || steps[0];

  return (
    <div className="el-visualizer">
      <div className="el-controls">
        <button onClick={stepBack} disabled={currentStep === 0} title="Назад">
          ⏮
        </button>
        {isPlaying ? (
          <button onClick={pause} title="Пауза">⏸</button>
        ) : (
          <button onClick={play} disabled={currentStep >= steps.length - 1} title="Воспроизвести">
            ▶
          </button>
        )}
        <button onClick={stepForward} disabled={currentStep >= steps.length - 1} title="Вперёд">
          ⏭
        </button>
        <button onClick={reset} title="Сначала">↺</button>
        <span className="el-step-counter">
          Шаг {currentStep + 1} / {steps.length}
        </span>
        <label className="el-speed-control">
          Скорость:
          <input
            type="range"
            min={200}
            max={2000}
            step={100}
            value={2200 - speed}
            onChange={e => setSpeed(2200 - Number(e.target.value))}
          />
        </label>
      </div>

      <div className="el-description-bar">
        <div className={`el-phase-badge el-phase-badge--${step.phase}`}>
          {step.phase === 'sync' && 'SYNC'}
          {step.phase === 'microtasks' && 'MICROTASKS'}
          {step.phase === 'macrotasks' && 'MACROTASKS'}
          {step.phase === 'render' && 'RENDER'}
        </div>
        <p className="el-description-text">{step.description}</p>
      </div>

      <div className="el-grid">
        <QueuePanel
          title="Call Stack"
          items={step.callStack}
          color="callstack"
          emptyText="Пуст"
          icon="📚"
        />
        <QueuePanel
          title="Web APIs"
          items={step.webApis}
          color="webapi"
          emptyText="Нет активных"
          icon="🌐"
        />
        <QueuePanel
          title="Microtask Queue"
          items={step.microtaskQueue.map(t => t.label)}
          color="micro"
          emptyText="Пуста"
          icon="⚡"
          highlight={step.phase === 'microtasks'}
        />
        <QueuePanel
          title="Macrotask Queue"
          items={step.macrotaskQueue.map(t => t.label)}
          color="macro"
          emptyText="Пуста"
          icon="📋"
          highlight={step.phase === 'macrotasks'}
        />
      </div>

      <div className="el-console">
        <div className="el-console-header">
          <span className="el-console-icon">{'>'}_</span> Console Output
        </div>
        <div className="el-console-body">
          {step.log.length === 0 ? (
            <span className="el-console-empty">// Вывод появится здесь...</span>
          ) : (
            step.log.map((line, i) => (
              <div key={i} className="el-console-line">
                <span className="el-console-arrow">{'>'}</span> {line}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="el-timeline">
        {steps.map((_, i) => (
          <button
            key={i}
            className={`el-timeline-dot ${i === currentStep ? 'el-timeline-dot--active' : ''} ${i < currentStep ? 'el-timeline-dot--passed' : ''}`}
            onClick={() => { setCurrentStep(i); setIsPlaying(false); }}
            title={`Шаг ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function QueuePanel({ title, items, color, emptyText, icon, highlight }) {
  return (
    <div className={`el-queue-panel el-queue-panel--${color} ${highlight ? 'el-queue-panel--highlight' : ''}`}>
      <h4 className="el-queue-title">
        <span className="el-queue-icon">{icon}</span>
        {title}
        <span className="el-queue-count">{items.length}</span>
      </h4>
      <div className="el-queue-items">
        {items.length === 0 ? (
          <div className="el-queue-empty">{emptyText}</div>
        ) : (
          items.map((item, i) => (
            <div
              key={i}
              className="el-queue-item"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
