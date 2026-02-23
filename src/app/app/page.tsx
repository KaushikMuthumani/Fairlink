import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";

export default async function AppHome() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="p-6">
        <p>You are not signed in.</p>
        <Link className="underline" href="/signin">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">
        Signed in as {(session.user as any)?.email}
      </p>
      <p className="mt-4">
        <Link className="underline" href="/app/links">
          Go to Links
        </Link>
      </p>
    </div>
  );
}
