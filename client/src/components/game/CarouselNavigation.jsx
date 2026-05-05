export default function CarouselNavigation({ total, current }) {
  if (!total || total <= 1) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '12px 0',
      background: 'rgba(42,20,51,0.55)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 7,
          height: 7,
          borderRadius: 99,
          background: i === current ? '#8b5cf6' : 'rgba(255,255,255,0.15)',
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  );
}
