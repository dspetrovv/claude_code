import { useState, useRef, useEffect } from 'react';
import './CodeEditor.css';

export default function CodeEditor({ initialCode = '', onRun }) {
  const [code, setCode] = useState(initialCode);
  const textareaRef = useRef(null);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun(code);
    }
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="code-editor">
      <div className="code-editor-header">
        <span className="code-editor-dot code-editor-dot--red" />
        <span className="code-editor-dot code-editor-dot--yellow" />
        <span className="code-editor-dot code-editor-dot--green" />
        <span className="code-editor-label">script.js</span>
        <button
          className="code-editor-run"
          onClick={() => onRun(code)}
          title="Ctrl+Enter для запуска"
        >
          ▶ Запустить симуляцию
        </button>
      </div>
      <div className="code-editor-body">
        <div className="code-editor-lines">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="code-editor-line-num">{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="code-editor-textarea"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="Введите JavaScript код..."
        />
      </div>
      <div className="code-editor-footer">
        <span className="code-editor-hint">Ctrl+Enter — запустить</span>
        <span className="code-editor-hint">Tab — отступ</span>
      </div>
    </div>
  );
}
