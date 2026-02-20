import './PresetSelector.css';

export default function PresetSelector({ presets, selectedId, onSelect }) {
  return (
    <div className="preset-selector">
      <h3 className="preset-selector-title">Готовые примеры</h3>
      <p className="preset-selector-desc">
        Выберите пресет для визуализации или введите свой код выше
      </p>
      <div className="preset-list">
        {presets.map(preset => (
          <button
            key={preset.id}
            className={`preset-card ${selectedId === preset.id ? 'preset-card--active' : ''}`}
            onClick={() => onSelect(preset)}
          >
            <div className="preset-card-header">
              <span className={`preset-difficulty preset-difficulty--${preset.difficulty}`}>
                {preset.difficulty === 'easy' && 'Базовый'}
                {preset.difficulty === 'medium' && 'Средний'}
                {preset.difficulty === 'hard' && 'Сложный'}
              </span>
            </div>
            <h4 className="preset-card-title">{preset.title}</h4>
          </button>
        ))}
      </div>
    </div>
  );
}
