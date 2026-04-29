import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { PREMADE_AVATARS } from "shared/types";

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
}

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        onChange(dataUrl);
        setShowPicker(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const isEmoji = value.length <= 2 || PREMADE_AVATARS.includes(value);
  const isCustom = value.startsWith("data:");

  return (
    <div className="relative">
      {/* Current avatar display */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-20 h-20 rounded-full bg-white border-4 border-brand-300 hover:border-brand-500 
                   flex items-center justify-center text-4xl shadow-lg transition-all duration-200
                   hover:scale-110 active:scale-95 overflow-hidden"
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
                                   ? "bg-brand-100 border-2 border-brand-500 shadow-md"
                                   : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                               }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm 
                             font-medium text-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  📷 Upload eigen foto
                </button>
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
