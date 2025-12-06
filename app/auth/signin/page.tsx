"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8 border rounded-lg">
        <div>
          <h2 className="text-3xl font-bold text-center">Sign in</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Sign in to access the admin panel
          </p>
        </div>
        <Button
          onClick={() => signIn("github", { callbackUrl: "/admin" })}
          className="w-full"
          variant="outline"
        >
          Sign in with GitHub
        </Button>
      </div>
    </div>
  );
}
