import HexStream from './HexStream'
import DiagnosticConsole from './DiagnosticConsole'

export default function StatusOverlay({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-hidden">
            {/* Background Layers */}
            <div className="absolute inset-0 z-0">
                <HexStream />
                <div className="absolute inset-0 bg-radial-[at_center] from-transparent via-slate-50/50 to-slate-200/80" />
            </div>

            {/* Diagnostic Logs */}
            <DiagnosticConsole />

            {/* Main Content */}
            <div className="relative z-20 w-full flex items-center justify-center">
                {children}
            </div>

            {/* Edge Chromatic Aberration Overlay (Subtle) */}
            <div className="pointer-events-none absolute inset-0 z-30 border-[100px] border-transparent shadow-[inset_0_0_150px_rgba(79,70,229,0.05)]" />
        </div>
    )
}
