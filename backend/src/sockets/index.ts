import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { logger } from "../utils/logger";

export function createSocketServer(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production" ? "https://yourapp.com" : "*",
    },
  });

  io.on("connection", (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}
