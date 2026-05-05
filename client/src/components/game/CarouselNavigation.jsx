export default function CarouselNavigation({ total, current }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-4"
      style={{
        background: 'rgba(42,20,51,0.6)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 99,
            background: i === current ? '#8b5cf6' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}
