import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import Link from "next/link";
import { AdminMobileNav } from "@/components/admin-mobile-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  if (!isAdmin(session.user.email)) {
    redirect("/");
  }

  const navLinks = [
    { href: "/admin/generate", label: "Generate" },
    { href: "/admin/comparisons", label: "Comparisons" },
    { href: "/admin/upload", label: "Upload" },
    { href: "/admin/models", label: "Models" },
    { href: "/admin/jobs", label: "Jobs" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo and Desktop Nav */}
            <div className="flex items-center gap-4 lg:gap-8">
              <Link href="/admin" className="flex items-center gap-2 flex-shrink-0">
                <img src="/ModelArena-logo.svg" alt="ModelArena" className="h-5 sm:h-6" />
                <span className="font-bold text-base sm:text-lg">Admin</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex gap-3 lg:gap-4 items-center">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side - Desktop */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/" className="text-sm hover:text-primary transition-colors">
                View Public Site
              </Link>
              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                {session.user.email}
              </div>
            </div>

            {/* Mobile Menu */}
            <AdminMobileNav navLinks={navLinks} userEmail={session.user.email} />
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</main>
    </div>
  );
}
