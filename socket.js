let io;

module.exports = {
    init: (httpServer) => {
    io = require("socket.io")(httpServer, {
      cors: {
        origin: "https://192.168.1.101:4200",
        methods: ["GET", "POST"],
      },
      
    });
   
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
};
