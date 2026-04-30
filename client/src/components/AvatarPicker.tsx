import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { PREMADE_AVATARS } from "shared/types";

const AVATAR_STORAGE_KEY = "custom-avatars";
const MAX_SAVED_AVATARS = 10;

function getSavedAvatars(): string[] {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) {
      // Migrate from old single-avatar key
      const old = localStorage.getItem("custom-avatar");
      if (old) {
        localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify([old]));
        localStorage.removeItem("custom-avatar");
        return [old];
      }
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
  accentColor?: "brand" | "purple";
}

export default function AvatarPicker({
  value,
  onChange,
  accentColor = "brand",
}: AvatarPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [savedAvatars, setSavedAvatars] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved custom avatars on mount
  useEffect(() => {
    setSavedAvatars(getSavedAvatars());
  }, []);

  const saveCustomAvatar = (dataUrl: string) => {
    const current = getSavedAvatars().filter((a) => a !== dataUrl);
    const updated = [dataUrl, ...current].slice(0, MAX_SAVED_AVATARS);
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(updated));
    setSavedAvatars(updated);
    onChange(dataUrl);
    setShowPicker(false);
  };

  const removeSavedAvatar = (avatar: string) => {
    const updated = savedAvatars.filter((a) => a !== avatar);
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(updated));
    setSavedAvatars(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) return;

    // Resize and convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;

        // Center crop
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        saveCustomAvatar(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    // Validate it looks like a URL
    try {
      new URL(url);
    } catch {
      return;
    }
    // Load the image, resize it to base64 so it's stored consistently
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const scale = Math.max(size / img.width, size / img.height);
      const x = (size - img.width * scale) / 2;
      const y = (size - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      saveCustomAvatar(dataUrl);
      setImageUrl("");
    };
    img.onerror = () => {
      // If CORS blocks it, save the URL directly
      saveCustomAvatar(url);
      setImageUrl("");
    };
    img.src = url;
  };

  const isCustom = value.startsWith("data:") || value.startsWith("http");

  return (
    <div className="relative">
      {/* Current avatar display */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`w-20 h-20 rounded-full bg-white border-4 
                   flex items-center justify-center text-4xl shadow-lg transition-all duration-200
                   hover:scale-110 active:scale-95 overflow-hidden ${
                     accentColor === "purple"
                       ? "border-purple-300 hover:border-purple-500"
                       : "border-brand-300 hover:border-brand-500"
                   }`}
      >
        {isCustom ? (
          <img
            src={value}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{value || "🎭"}</span>
        )}
      </button>

      <p className="text-xs text-gray-500 mt-1 text-center">Kies avatar</p>

      {/* Picker + backdrop via portal to escape parent stacking context */}
      {showPicker &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/30 sm:bg-black/20 z-40"
              onClick={() => setShowPicker(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50
                         sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2
                         bg-white rounded-2xl shadow-2xl p-4 sm:w-72 border border-gray-100"
            >
              <p className="text-sm font-display font-bold text-gray-700 mb-3">
                Kies een avatar
              </p>

              <div className="grid grid-cols-5 gap-2 mb-3">
                {PREMADE_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onChange(emoji);
                      setShowPicker(false);
                    }}
                    className={`aspect-square rounded-xl flex items-center justify-center text-xl sm:text-2xl
                               transition-all duration-150 hover:scale-110 active:scale-95
                               ${
                                 value === emoji
                                   ? accentColor === "purple"
                                     ? "bg-purple-100 border-2 border-purple-500 shadow-md"
                                     : "bg-brand-100 border-2 border-brand-500 shadow-md"
                                   : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                               }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                {/* Show saved custom avatars */}
                {savedAvatars.length > 0 && (
                  <div>
                    <p className="text-xs font-display font-semibold text-gray-500 mb-1.5">
                      Opgeslagen foto's
                    </p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {savedAvatars.map((avatar, i) => (
                        <div key={i} className="relative group">
                          <button
                            type="button"
                            onClick={() => {
                              onChange(avatar);
                              setShowPicker(false);
                            }}
                            className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all
                              ${
                                value === avatar
                                  ? accentColor === "purple"
                                    ? "border-purple-500 shadow-md"
                                    : "border-brand-500 shadow-md"
                                  : "border-gray-200 hover:border-gray-400"
                              }`}
                          >
                            <img
                              src={avatar}
                              alt="Opgeslagen"
                              className="w-full h-full object-cover"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSavedAvatar(avatar);
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] 
                                       leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm 
                             font-medium text-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  📷 Upload eigen foto
                </button>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleImageUrl()}
                    placeholder="Plak een afbeelding-URL..."
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleImageUrl}
                    disabled={!imageUrl.trim()}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-600 
                               transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ✓
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </motion.div>
          </>,
          document.body,
        )}
    </div>
  );
}
