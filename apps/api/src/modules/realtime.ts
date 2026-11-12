type Listener = {
  role: string;
  userId: string;
  send: (event: string, data: unknown) => void;
};
const listeners = new Set<Listener>();
export function broadcast(
  event:
    | "DEPT_Q1_UNLOCKED"
    | "SCOREBOARD_UPDATED"
    | "TARGET_UPDATED"
    | "COMPETITION_UPDATED",
  data: unknown,
) {
  for (const listener of listeners)
    if (
      (event !== "SCOREBOARD_UPDATED" || listener.role === "admin") &&
      (event !== "TARGET_UPDATED" ||
        listener.userId === (data as { userId: string }).userId ||
        (data as { userId: string }).userId === "*" ||
        listener.role === "admin")
    )
      listener.send(event, data);
}
export function streamFor(role: string, request: Request, userId = "") {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (!closed)
          try {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              ),
            );
          } catch {
            cleanup();
          }
      };
      const listener = { role, userId, send };
      listeners.add(listener);
      const heartbeat = setInterval(() => send("HEARTBEAT", {}), 15000);
      const expiry = setTimeout(
        () => {
          cleanup();
          try {
            controller.close();
          } catch {}
        },
        15 * 60 * 1000,
      );
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(expiry);
        listeners.delete(listener);
        request.signal.removeEventListener("abort", cleanup);
      };
      request.signal.addEventListener("abort", cleanup);
      send("CONNECTED", { role });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
