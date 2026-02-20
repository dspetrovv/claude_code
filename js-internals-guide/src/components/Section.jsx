import './Section.css';

export default function Section({ id, title, children, icon }) {
  return (
    <section className="content-section" id={id}>
      <h2 className="section-title">
        {icon && <span className="section-icon">{icon}</span>}
        {title}
      </h2>
      <div className="section-body">
        {children}
      </div>
    </section>
  );
}

export function Analogy({ children }) {
  return (
    <div className="analogy-box">
      <div className="analogy-header">
        <span className="analogy-icon">💡</span>
        Аналогия из жизни
      </div>
      <div className="analogy-body">{children}</div>
    </div>
  );
}

export function Important({ children }) {
  return (
    <div className="important-box">
      <div className="important-header">
        <span className="important-icon">⚠️</span>
        Важно
      </div>
      <div className="important-body">{children}</div>
    </div>
  );
}

export function CodeBlock({ children, title }) {
  return (
    <div className="code-block-wrapper">
      {title && <div className="code-block-title">{title}</div>}
      <pre className="code-block">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function Diagram({ children }) {
  return (
    <div className="diagram-box">
      <pre className="diagram-content">{children}</pre>
    </div>
  );
}
