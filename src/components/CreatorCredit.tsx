export function CreatorCredit({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground text-center ${className}`}>
      Created by{' '}
      <a href="https://jac-s-hub.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground transition-colors"
      >
        Jackson Munene
      </a>
    </p>
  )
}
