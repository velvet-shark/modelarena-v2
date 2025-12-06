import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">ModelArena</h1>
            <p className="text-muted-foreground">
              AI Video Generation Comparison Platform
            </p>
          </div>
          <div className="flex gap-4">
            {session?.user ? (
              <>
                <span className="text-sm text-muted-foreground self-center">
                  {session.user.email}
                </span>
                <Link href="/admin">
                  <Button>Admin Panel</Button>
                </Link>
              </>
            ) : (
              <Link href="/auth/signin">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No comparisons yet. Sign in and visit the admin panel to create your first comparison.
          </p>
        </div>
      </div>
    </main>
  );
}
