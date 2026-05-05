// 10 personnages distincts basés sur l'index du joueur dans la partie
const CHARACTERS = [
  { seed: 'Felix',   style: 'adventurer',      label: 'Aventurier' },
  { seed: 'Zara',    style: 'adventurer',      label: 'Exploratrice' },
  { seed: 'Bolt',    style: 'bottts-neutral',  label: 'Robot' },
  { seed: 'Nova',    style: 'fun-emoji',       label: 'Alien' },
  { seed: 'Sage',    style: 'adventurer',      label: 'Sage' },
  { seed: 'Pixel',   style: 'bottts-neutral',  label: 'Hacker' },
  { seed: 'Orion',   style: 'adventurer',      label: 'Pirate' },
  { seed: 'Luna',    style: 'fun-emoji',       label: 'Sorcière' },
  { seed: 'Titan',   style: 'bottts-neutral',  label: 'Ninja' },
  { seed: 'Aurora',  style: 'adventurer',      label: 'Reine' },
];

export function getCharacter(index) {
  return CHARACTERS[index % CHARACTERS.length];
}

export default function Avatar({ characterIndex = 0, size = 64, pseudo }) {
  const char = getCharacter(characterIndex);
  const url = `https://api.dicebear.com/9.x/${char.style}/svg?seed=${char.seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: '#4c1d95',
        border: '2px solid rgba(139,92,246,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={url}
        alt={pseudo || char.label}
        width={size}
        height={size}
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
