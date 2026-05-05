import { motion } from "motion/react";
import { useState, type ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
  type?: "button" | "submit";
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
  type = "button",
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const baseStyles = "relative px-6 py-3 rounded-lg font-medium transition-all duration-300 overflow-hidden";

  const variants = {
    primary: disabled
      ? "bg-black/40 border border-white/5 text-white/40 cursor-not-allowed"
      : "bg-black/80 border border-white/10 text-white",
    secondary: disabled
      ? "bg-white/5 text-white/40 cursor-not-allowed"
      : "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20",
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      whileHover={!disabled ? { y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {!disabled && variant === "primary" && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(88,28,135,0.8) 0%, rgba(0,0,0,0.95) 50%, rgba(255,255,255,0.2) 100%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      )}

      {!disabled && variant === "primary" && isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(88,28,135,0.5), transparent 70%)",
          }}
          animate={{ x: ["-20%", "20%", "-20%"], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {!disabled && variant === "primary" && isPressed && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, rgba(88,28,135,1), rgba(88,28,135,0.6))",
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [1, 0], scale: [0.8, 1.3] }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}

      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
