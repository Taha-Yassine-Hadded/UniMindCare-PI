const io = require("socket.io")(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });
  
  io.on("connection", (socket) => {
    console.log(`User connecté : ${socket.id}`);
  
    socket.on("join", (userId) => {
      socket.join(userId);
    });
  
    socket.on("sendMessage", async ({ sender, receiver, message }) => {
      const newMessage = { sender, receiver, message, timestamp: new Date() };
      io.to(receiver).emit("receiveMessage", newMessage);
    });
  
    socket.on("disconnect", () => {
      console.log("User déconnecté");
    });
  });