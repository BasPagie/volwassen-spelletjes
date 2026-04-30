import { useState, useEffect } from "react";

interface Character {
  id: string;
  name: string;
  category?: string;
  imageUrl?: string;
}

interface Pack {
  id: string;
  name: string;
  description: string;
  characters: Character[];
}

export default function TestCharacters() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/packs")
      .then((r) => r.json())
      .then((data) => {
        setPacks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalChars = packs.reduce((s, p) => s + p.characters.length, 0);
  const withImage = packs.reduce(
    (s, p) => s + p.characters.filter((c) => c.imageUrl).length,
    0,
  );
  const broken = failedImages.size;

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
        Character Image Test
      </h1>
      <p className="text-gray-500 font-display mb-6">
        {totalChars} characters | {withImage} with imageUrl | {broken} broken
        images
      </p>

      {packs.map((pack) => (
        <div key={pack.id} className="mb-10">
          <h2 className="font-display font-bold text-xl mb-1">{pack.name}</h2>
          <p className="text-sm text-gray-500 mb-4">{pack.description}</p>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
            {pack.characters.map((char) => (
              <div key={char.id} className="text-center">
                <div
                  className={`aspect-square rounded-xl overflow-hidden border-2 mb-1 ${
                    failedImages.has(char.id)
                      ? "border-red-400 bg-red-50"
                      : char.imageUrl
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300 bg-gray-100"
                  }`}
                >
                  {char.imageUrl ? (
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      className="w-full h-full object-cover"
                      onError={() =>
                        setFailedImages((prev) => new Set(prev).add(char.id))
                      }
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      👤
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-display font-semibold text-gray-700 leading-tight truncate">
                  {char.name}
                </p>
                {char.category && (
                  <p className="text-[9px] text-gray-400 truncate">
                    {char.category}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
