import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

type Option = {
    value: string
    label: string
}

type Props = {
    value: string
    options: Option[]
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export default function Dropdown({ value, options, onChange, placeholder = 'Select...', className }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [openUp, setOpenUp] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const selectedOption = options.find(o => o.value === value)

    useEffect(() => {
        function handleScrollOrResize() {
            if (isOpen && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                const spaceBelow = window.innerHeight - rect.bottom
                // If less than 250px below, and more space above, open up
                setOpenUp(spaceBelow < 250 && rect.top > spaceBelow)
            }
        }

        if (isOpen) {
            handleScrollOrResize()
            window.addEventListener('scroll', handleScrollOrResize, true)
            window.addEventListener('resize', handleScrollOrResize)
        }

        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true)
            window.removeEventListener('resize', handleScrollOrResize)
        }
    }, [isOpen])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className={clsx("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "w-full bg-white/80 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-left transition-all duration-300 flex items-center justify-between group",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
                    isOpen ? "border-indigo-500/50 ring-2 ring-indigo-500/30" : "hover:border-slate-400"
                )}
            >
                <span className={clsx("font-medium", selectedOption ? "text-slate-800" : "text-slate-400")}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown size={16} className={clsx("text-slate-500 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: openUp ? -10 : 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: openUp ? -10 : 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={clsx(
                            "absolute z-[9999] w-full bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl shadow-2xl overflow-hidden",
                            openUp ? "bottom-full mb-2" : "top-full mt-2"
                        )}
                        style={{
                            WebkitBackdropFilter: 'blur(12px)',
                        }}
                    >
                        <div className="p-1 max-h-[220px] overflow-y-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value)
                                        setIsOpen(false)
                                    }}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 text-[13px] font-medium transition-all duration-200 flex items-center justify-between group/opt",
                                        value === option.value
                                            ? "bg-indigo-600 text-white rounded-md"
                                            : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-md"
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
