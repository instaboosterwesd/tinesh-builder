// Server-side middleware: verifies the Firebase ID token from the
// Authorization header and exposes the user on the server-fn context.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const requireFirebaseAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const authHeader = request?.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized: No authorization header provided");
  const token = authHeader.slice(7);
  if (!token || token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token");
  const { verifyIdToken } = await import("@/integrations/firebase/admin.server");
  const user = await verifyIdToken(token);
  return next({ context: { userId: user.uid, claims: { email: user.email, name: user.name } } });
});
