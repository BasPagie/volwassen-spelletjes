import { useState, useEffect, useRef } from "react";

interface Song {
  title: string;
  artist: string;
  coverUrl: string | null;
  previewUrl: string;
}

interface SongCategory {
  id: string;
  name: string;
  description: string;
  songs: Song[];
}

export default function TestSongs() {
  const [categories, setCategories] = useState<SongCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const totalSongs = categories.reduce((s, c) => s + c.songs.length, 0);

  function togglePlay(previewUrl: string) {
    if (playing === previewUrl) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(previewUrl);
    audio.volume = 0.3;
    audio.play();
    audio.onended = () => setPlaying(null);
    audioRef.current = audio;
    setPlaying(previewUrl);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 font-display text-lg">Laden...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <h1 className="font-display font-black text-3xl mb-2">
        🎵 Song Overview — Raad het Nummer
      </h1>
      <p className="text-gray-500 font-display mb-6">
        {totalSongs} nummers in {categories.length} categorieën
      </p>

      {categories.map((cat) => (
        <div key={cat.id} className="mb-10">
          <h2 className="font-display font-bold text-xl mb-1">{cat.name}</h2>
          <p className="text-sm text-gray-500 mb-4">
            {cat.description} — {cat.songs.length} nummers
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {cat.songs.map((song) => {
              const isPlaying = playing === song.previewUrl;
              return (
                <button
                  key={song.title + song.artist}
                  onClick={() => togglePlay(song.previewUrl)}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    isPlaying
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {song.coverUrl ? (
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">
                        🎵
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-display font-bold text-gray-800 truncate">
                      {song.title}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {song.artist}
                    </p>
                  </div>
                  {isPlaying && (
                    <div className="absolute top-1 right-2 text-purple-600 text-xs">
                      ▶
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
