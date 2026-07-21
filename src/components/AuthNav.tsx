import { auth, signOut } from "@/auth";

export default async function AuthNav() {
  const session = await auth();
  if (!session?.user) {
    return <a className="authlink" href="/signin">Sign in</a>;
  }
  return (
    <div className="authnav">
      <a href="/following" className="authlink">Following</a>
      <a href="/settings" className="authlink">Settings</a>
      <span className="who">{session.user.email}</span>
      <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
        <button type="submit">Sign out</button>
      </form>
    </div>
  );
}
