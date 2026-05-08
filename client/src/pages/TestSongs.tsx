import { useState, useEffect, useRef } from "react";

interface Song {
  title: string;
  artist: string;
  coverUrl: string | null;
  previewUrl: string;
  startOffset?: number;
  deezerId?: number;
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
  const [loadingSong, setLoadingSong] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
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

  async function togglePlay(song: Song) {
    const songKey = `${song.title}-${song.artist}`;
    if (playing === songKey) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }

    let url = song.previewUrl;
    if (song.deezerId) {
      setLoadingSong(songKey);
      try {
        const res = await fetch(`/api/song-preview/${song.deezerId}`);
        if (res.ok) {
          const data = await res.json();
          url = data.previewUrl;
        }
      } catch {
        // Fall back to stored URL
      }
      setLoadingSong(null);
    }

    const audio = new Audio(url);
    audio.volume = 0.3;
    if (song.startOffset) {
      audio.addEventListener(
        "loadedmetadata",
        () => {
          audio.currentTime = song.startOffset!;
        },
        { once: true },
      );
    }
    audio.play();
    audio.onended = () => setPlaying(null);
    audioRef.current = audio;
    setPlaying(songKey);
  }

  async function saveOffset(
    categoryId: string,
    songIndex: number,
    value: number,
  ) {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    cat.songs[songIndex].startOffset = value;
    setCategories([...categories]);

    try {
      await fetch("/api/songs/offset", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categoryId,
          songIndex,
          startOffset: value,
        }),
      });
      const key = `${categoryId}-${songIndex}`;
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      // silent fail
    }
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
            {cat.songs.map((song, idx) => {
              const songKey = `${song.title}-${song.artist}`;
              const offsetKey = `${cat.id}-${idx}`;
              const isPlaying = playing === songKey;
              const isLoading = loadingSong === songKey;
              const isSaved = savedKey === offsetKey;
              return (
                <div
                  key={song.title + song.artist}
                  className={`relative flex flex-col p-3 rounded-xl border-2 transition-all ${
                    isPlaying
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : isLoading
                        ? "border-gray-300 bg-gray-50 opacity-70"
                        : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => togglePlay(song)}
                    disabled={isLoading}
                    className="flex items-center gap-3 text-left w-full"
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
                      <span className="text-purple-600 text-xs">▶</span>
                    )}
                    {isLoading && (
                      <span className="text-gray-400 text-xs">⏳</span>
                    )}
                  </button>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                    <label className="text-[10px] text-gray-400 whitespace-nowrap">
                      offset:
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={29}
                      value={song.startOffset ?? 0}
                      onChange={(e) => {
                        const val = Math.max(
                          0,
                          Math.min(29, parseInt(e.target.value) || 0),
                        );
                        const updated = [...categories];
                        const c = updated.find((x) => x.id === cat.id)!;
                        c.songs[idx].startOffset = val;
                        setCategories(updated);
                      }}
                      onBlur={(e) => {
                        const val = Math.max(
                          0,
                          Math.min(29, parseInt(e.target.value) || 0),
                        );
                        saveOffset(cat.id, idx, val);
                      }}
                      className="w-12 text-xs text-center border border-gray-200 rounded px-1 py-0.5 focus:border-purple-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400">s</span>
                    {isSaved && (
                      <span className="text-[10px] text-green-500 ml-auto">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
