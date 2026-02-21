import { useState, useCallback } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [activeSection, setActiveSection] = useState('event-loop');

  const handleNavigate = useCallback((id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleSectionVisible = useCallback((id) => {
    setActiveSection(id);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />
      <main className="main-content">
        {typeof children === 'function'
          ? children({ onSectionVisible: handleSectionVisible })
          : children}
      </main>
    </div>
  );
}
