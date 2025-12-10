import Link from "next/link";

interface HeaderProps {
  showNav?: boolean;
}

export function Header({ showNav = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/ModelArena-logo.svg" alt="ModelArena" className="h-7" />
        </Link>

        {showNav && (
          <nav className="flex items-center gap-8">
            <Link
              href="/comparisons"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Comparisons
            </Link>
            <Link
              href="/models"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Models
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              href="/analytics"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Analytics
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
