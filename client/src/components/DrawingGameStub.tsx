import { motion } from "framer-motion";

export default function DrawingGameStub() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div className="text-7xl mb-4">✏️</div>
      <h3 className="font-display font-black text-2xl text-gray-700 mb-2">
        Tekenwedstrijd
      </h3>
      <p className="font-display text-gray-500 mb-4 max-w-xs">
        Dit spel is nog in aanbouw. Ons team van verwarde volwassenen werkt er
        hard aan!
      </p>
      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 text-gray-400 font-display font-bold text-sm">
        🚧 Binnenkort beschikbaar
      </span>
    </motion.div>
  );
}
