import { useState } from 'react'
import { Check, Copy, Code2, Terminal, Globe } from 'lucide-react'
import clsx from 'clsx'

type Props = {
    code: string
    language: string
}

export default function CodeBlock({ code, language }: Props) {
    const [copied, setCopied] = useState(false)

    function handleCopy() {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // A simple regex-based syntax highlighter for JavaScript/Python/cURL
    function highlight(str: string) {
        // Night Owl / One Dark inspired colors
        const colors = {
            keyword: 'text-[#c678dd]', // Purple
            function: 'text-[#61afef]', // Blue
            string: 'text-[#98c379]',   // Green
            comment: 'text-[#5c6370]',  // Gray
            number: 'text-[#d19a66]',   // Orange
            operator: 'text-[#56b6c2]', // Cyan
        }

        return str.split('\n').map((line, i) => {
            let highlightedLine = line
                .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, `<span class="${colors.string}">$1</span>`)
                .replace(/\b(const|let|var|function|return|async|await|import|from|class|if|else|for|while|try|catch|def|print)\b/g, `<span class="${colors.keyword}">$1</span>`)
                .replace(/\b(\d+)\b/g, `<span class="${colors.number}">$1</span>`)
                .replace(/(\/\/.*|#.*)/g, `<span class="${colors.comment}">$1</span>`)
                .replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, `<span class="${colors.function}">$1</span>`)

            return (
                <div key={i} className="flex group/line px-4 hover:bg-white/5 transition-colors">
                    <span className="w-10 shrink-0 text-right pr-4 text-slate-600 font-mono text-[11px] select-none border-r border-white/5 pt-1">
                        {i + 1}
                    </span>
                    <span
                        className="pl-4 pt-1 whitespace-pre"
                        dangerouslySetInnerHTML={{ __html: highlightedLine || ' ' }}
                    />
                </div>
            )
        })
    }

    const LangIcon = language === 'javascript' ? Code2 : (language === 'python' ? Terminal : Globe)

    return (
        <div className="bg-[#0d1117]/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative group">
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400/50" />
                        <div className="w-3 h-3 rounded-full bg-amber-400/50" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400/50" />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <LangIcon size={12} className="text-indigo-400" />
                        {language}
                    </div>

                    <button
                        onClick={handleCopy}
                        className={clsx(
                            'p-2 rounded-lg transition-all duration-200',
                            copied
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'text-slate-400 hover:bg-white/10 hover:text-white'
                        )}
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            <div className="py-4 font-mono text-[13px] leading-relaxed text-slate-300 overflow-x-auto custom-scrollbar">
                {highlight(code)}
            </div>
        </div>
    )
}
