import './Sidebar.css';

const sections = [
  { id: 'event-loop', label: 'Что такое Event Loop?', icon: '🔄' },
  { id: 'micro-macro', label: 'Micro vs Macro Tasks', icon: '⚡' },
  { id: 'promise', label: 'Как работает Promise?', icon: '🤝' },
  { id: 'async-await', label: 'async/await под капотом', icon: '⚙️' },
  { id: 'multiple-await', label: 'Несколько await подряд', icon: '⏳' },
  { id: 'error-handling', label: 'Обработка ошибок', icon: '🛡️' },
  { id: 'race-conditions', label: 'Race Conditions', icon: '🏁' },
  { id: 'abort-controller', label: 'AbortController', icon: '🛑' },
  { id: 'visualizer', label: 'Интерактивный визуализатор', icon: '🧪' },
];

export default function Sidebar({ activeSection, onNavigate }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">JS Internals</h2>
        <p className="sidebar-subtitle">Глубокое погружение</p>
      </div>
      <ul className="sidebar-nav">
        {sections.map(section => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`sidebar-link ${activeSection === section.id ? 'sidebar-link--active' : ''}`}
              onClick={e => {
                e.preventDefault();
                onNavigate(section.id);
              }}
            >
              <span className="sidebar-link-icon">{section.icon}</span>
              <span className="sidebar-link-text">{section.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export { sections };
