import { motion } from "motion/react";
import logoUrl from "../assets/brand/zeroone-logo.svg";

export function Logo() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative h-32 w-full overflow-hidden"
    >
      <motion.div
        animate={{ opacity: [0.16, 0.28, 0.16], scale: [1, 1.04, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-linear-to-r from-purple-500/10 to-purple-700/10 blur-2xl"
      />

      <motion.img
        src={logoUrl}
        alt="ZeroOne"
        className="relative z-10 h-full w-full scale-170 object-contain object-center"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}
