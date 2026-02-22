
export const StripeLogo = ({ className = "h-5 w-5" }: { className?: string }) => (
    <img src="/stripe.png" alt="Stripe" className={className} style={{ objectFit: 'contain' }} />
)

export const RazorpayLogo = ({ className = "h-5 w-5" }: { className?: string }) => (
    <img src="/razropay.png" alt="Razorpay" className={className} style={{ objectFit: 'contain' }} />
)

export const SimulatorLogo = ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
)
