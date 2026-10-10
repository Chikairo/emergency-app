import { AuthStatus } from "@/components/auth/AuthStatus";
import { getPageUser } from "@/lib/auth-server";

// Dynamic island for the header: keeps the surrounding layout statically
// renderable while session state streams in.
export async function AuthStatusSlot() {
  const user = await getPageUser();
  return <AuthStatus email={user?.email ?? null} />;
}
