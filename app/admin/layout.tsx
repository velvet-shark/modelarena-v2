import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  if (!isAdmin(session.user.email)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex gap-8">
              <Link href="/admin" className="font-bold text-lg">
                ModelArena Admin
              </Link>
              <div className="flex gap-4 items-center">
                <Link
                  href="/admin/generate"
                  className="text-sm hover:text-primary"
                >
                  Generate
                </Link>
                <Link
                  href="/admin/comparisons"
                  className="text-sm hover:text-primary"
                >
                  Comparisons
                </Link>
                <Link
                  href="/admin/upload"
                  className="text-sm hover:text-primary"
                >
                  Upload
                </Link>
                <Link
                  href="/admin/models"
                  className="text-sm hover:text-primary"
                >
                  Models
                </Link>
                <Link
                  href="/admin/jobs"
                  className="text-sm hover:text-primary"
                >
                  Jobs
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm hover:text-primary">
                View Public Site
              </Link>
              <div className="text-sm text-muted-foreground">
                {session.user.email}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
