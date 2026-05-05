const STYLES = [
  'adventurer',
  'bottts',
  'fun-emoji',
  'lorelei',
  'micah',
  'miniavs',
  'personas',
  'pixel-art',
];

// Assigne un style cohérent selon le pseudo
function getStyle(pseudo) {
  let hash = 0;
  for (let i = 0; i < pseudo.length; i++) {
    hash = pseudo.charCodeAt(i) + ((hash << 5) - hash);
  }
  return STYLES[Math.abs(hash) % STYLES.length];
}

export default function Avatar({ pseudo, size = 64 }) {
  const style = getStyle(pseudo || 'player');
  const url = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(pseudo || 'player')}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="rounded-full overflow-hidden bg-purple-900 border-2 border-purple-600 flex items-center justify-center"
    >
      <img
        src={url}
        alt={pseudo}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = `<span style="font-size:${size * 0.45}px">${(pseudo || '?')[0].toUpperCase()}</span>`;
        }}
      />
    </div>
  );
}
