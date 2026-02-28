import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const GATEWAYS = ['Stripe', 'Razorpay', 'PayPal', 'Adyen', 'Braintree', 'Checkout.com', 'Wise', 'Payoneer', 'Square', 'Worldpay']

// Node metadata for the network
interface NodeData {
    id: number
    name: string
    x: number
    y: number
}

export default function NodeNetwork({ isResyncing }: { isResyncing?: boolean }) {
    const [nodes, setNodes] = useState<NodeData[]>([])

    useEffect(() => {
        const newNodes = Array.from({ length: 25 }).map((_, i) => ({
            id: i,
            name: GATEWAYS[i % GATEWAYS.length],
            x: Math.random() * (window.innerWidth - 100) + 50,
            y: Math.random() * (window.innerHeight - 100) + 50,
        }))
        setNodes(newNodes)
    }, [])

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg className="absolute inset-0 w-full h-full">
                {nodes.map((node, i) => (
                    nodes.slice(i + 1).map((other) => {
                        const dist = Math.sqrt(Math.pow(node.x - other.x, 2) + Math.pow(node.y - other.y, 2))
                        if (dist > 250) return null

                        return (
                            <motion.line
                                key={`${node.id}-${other.id}`}
                                x1={node.x}
                                y1={node.y}
                                x2={other.x}
                                y2={other.y}
                                stroke="rgba(79, 70, 229, 0.2)"
                                strokeWidth="0.5"
                                animate={{
                                    opacity: isResyncing ? 1 : [0.05, 0.3, 0.05, 0],
                                    strokeDasharray: ["0, 10", "5, 5", "10, 0"],
                                }}
                                transition={{
                                    duration: Math.random() * 2 + 1,
                                    repeat: Infinity,
                                    repeatType: "mirror",
                                    ease: "linear"
                                }}
                            />
                        )
                    })
                ))}
            </svg>

            <AnimatePresence>
                {nodes.map((node) => (
                    <motion.div
                        key={node.id}
                        drag
                        dragConstraints={{ left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight }}
                        animate={isResyncing ? {
                            x: window.innerWidth / 2,
                            y: window.innerHeight / 2,
                            scale: [1, 1.2, 0],
                            opacity: [1, 1, 0]
                        } : {
                            x: node.x,
                            y: node.y
                        }}
                        transition={isResyncing ? { duration: 0.8, ease: "circIn" } : { duration: 2, repeat: Infinity, repeatType: "reverse" }}
                        className="pointer-events-auto absolute flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/40 backdrop-blur-sm border border-indigo-200/50 shadow-sm cursor-grab active:cursor-grabbing select-none"
                        style={{ left: 0, top: 0 }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{node.name}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
