import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

// Configured OAuth providers. Google sign-in planned for a follow-up release.
export const authProviders = ['github'] as const;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [GitHub],
  callbacks: {
    // Session/JWT strategy: provider account ID is stored on token.sub and
    // exposed as session.user.id for downstream API handlers.
    jwt({ token, account, profile }) {
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      } else if (profile && 'id' in profile && profile.id != null) {
        token.sub = String(profile.id);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  }
});
