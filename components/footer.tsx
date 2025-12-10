import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/">
            <img src="/ModelArena-logo.svg" alt="ModelArena" className="h-6" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>© 2025 ModelArena</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center">
              <svg
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                height="18"
                width="18"
                className="mr-1.5"
              >
                <path
                  fill="currentColor"
                  d="M22 16v2h-2c-1.4 0-2.8-.4-4-1c-2.5 1.3-5.5 1.3-8 0c-1.2.6-2.6 1-4 1H2v-2h2c1.4 0 2.8-.5 4-1.3c2.4 1.7 5.6 1.7 8 0c1.2.8 2.6 1.3 4 1.3zM5.28 13.79c.54-.16 1.09-.41 1.61-.75L8 12.28c.69-2.28.78-5.01-.41-8.14c4.36.75 8.3 4.51 9.78 9.05c.75.45 1.54.72 2.29.78C18.24 7.4 12.37 2 6 2c-.35 0-.67.18-.85.47c-.18.3-.2.67-.04.98c2.17 4.34 1.5 7.84.17 10.34M16 18.7c-2.4 1.7-5.6 1.7-8 0c-1.2.8-2.6 1.3-4 1.3H2v2h2c1.4 0 2.8-.4 4-1c2.5 1.3 5.5 1.3 8 0c1.2.6 2.6 1 4 1h2v-2h-2c-1.4 0-2.8-.5-4-1.3"
                />
              </svg>
              By Radek Sienkiewicz at{" "}
              <a
                href="https://velvetshark.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors ml-1"
              >
                VelvetShark.com
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
