import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // ✅ switch to JWT for reliable session in dev + App Router
  session: { strategy: "jwt" },

  pages: { signIn: "/signin" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    // ✅ put user id into the JWT token at sign-in
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
      }
      return token;
    },

    // ✅ read it back into session so server components can use it
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      const name = user.name?.trim() || "My Workspace";
      const baseSlug =
        (user.email?.split("@")[0] || "workspace")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "workspace";

      let slug = baseSlug;
      for (let i = 0; i < 5; i++) {
        const exists = await prisma.organization.findUnique({ where: { slug } });
        if (!exists) break;
        slug = `${baseSlug}-${Math.floor(Math.random() * 9000 + 1000)}`;
      }

      const org = await prisma.organization.create({ data: { name, slug } });

      await prisma.membership.create({
        data: { userId: user.id, orgId: org.id, role: "OWNER" },
      });
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
