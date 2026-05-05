export default function GameLayout({ children }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #3b1d46 0%, #2a1433 100%)' }}
    >
      {children}
    </div>
  );
}
