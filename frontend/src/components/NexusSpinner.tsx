import { motion } from 'framer-motion'

/**
 * Custom SVG spinner with a path-drawing animation
 * using the Nexus indigo color palette.
 */
export default function NexusSpinner({ size = 64 }: { size?: number }) {
    const r = size * 0.38           // main orbit radius
    const stroke = size * 0.06      // stroke width
    const center = size / 2
    const circumference = 2 * Math.PI * r

    return (
        <motion.svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        >
            {/* Faint track ring */}
            <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="#e0e7ff"
                strokeWidth={stroke}
            />

            {/* Animated arc — draws and retracts */}
            <motion.circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="#4f46e5"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{
                    strokeDashoffset: [circumference, circumference * 0.25, circumference],
                }}
                transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Pulsing center dot */}
            <motion.circle
                cx={center}
                cy={center}
                r={size * 0.06}
                fill="#4f46e5"
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
        </motion.svg>
    )
}
