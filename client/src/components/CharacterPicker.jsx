import { CHARACTERS, getAvatarUrl } from '../data/characters';

export default function CharacterPicker({ selected, takenIndexes = [], onChange }) {
  return (
    <div>
      <p style={{ color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
        Choisis ton personnage
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {CHARACTERS.map((char) => {
          const taken = takenIndexes.includes(char.index);
          const isSelected = selected === char.index;

          return (
            <button
              key={char.index}
              onClick={() => !taken && onChange(char.index)}
              disabled={taken}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 6px',
                borderRadius: 14,
                border: isSelected
                  ? '2px solid #8b5cf6'
                  : taken
                  ? '2px solid rgba(255,255,255,0.05)'
                  : '2px solid rgba(255,255,255,0.1)',
                background: isSelected
                  ? 'rgba(139,92,246,0.25)'
                  : 'rgba(42,20,51,0.6)',
                cursor: taken ? 'not-allowed' : 'pointer',
                opacity: taken ? 0.35 : 1,
                transition: 'all 0.15s',
                width: 72,
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                overflow: 'hidden', background: '#4c1d95',
              }}>
                <img
                  src={getAvatarUrl(char.index)}
                  alt={char.name}
                  width={48} height={48}
                  style={{ width: 48, height: 48 }}
                />
              </div>
              <span style={{
                fontSize: 10,
                color: isSelected ? '#c4b5fd' : '#9ca3af',
                fontWeight: isSelected ? 700 : 400,
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {taken ? '✗' : char.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
