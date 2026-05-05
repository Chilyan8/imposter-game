function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-2">Imposter</h1>
        <p className="text-gray-400 text-lg">Le jeu de déduction en temps réel</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button className="bg-violet-700 hover:bg-violet-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
          Créer une partie
        </button>
        <button className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors border border-gray-600">
          Rejoindre une partie
        </button>
      </div>
    </div>
  );
}

export default Home;
