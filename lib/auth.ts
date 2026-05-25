import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [GitHub],
  callbacks: {
    jwt({ token, account, profile }) {
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      } else if (profile && 'id' in profile && profile.id != null) {
        token.sub = String(profile.id);
      }
      return token;
    },
    session({ session }) {
      return session;
    }
  }
});
