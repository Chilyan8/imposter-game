import { getAvatarUrl, CHARACTERS } from '../../data/characters';

export function getCharacter(index) {
  return CHARACTERS[index % CHARACTERS.length];
}

export default function Avatar({ characterIndex = 0, size = 64, pseudo }) {
  const url = getAvatarUrl(characterIndex, size);

  return (
    <div style={{
      width: size, height: size, minWidth: size,
      borderRadius: '50%', overflow: 'hidden',
      background: '#4c1d95',
      border: '2px solid rgba(139,92,246,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <img
        src={url}
        alt={pseudo || '?'}
        width={size} height={size}
        style={{ width: size, height: size, display: 'block' }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML =
            `<span style="font-size:${Math.round(size * 0.45)}px;color:#fff">${(pseudo || '?')[0].toUpperCase()}</span>`;
        }}
      />
    </div>
  );
}
