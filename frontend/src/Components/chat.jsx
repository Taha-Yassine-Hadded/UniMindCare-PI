import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useParams, useOutletContext } from "react-router-dom";

const socket = io("http://localhost:5000");

const Chat = () => {
  const { userData } = useOutletContext();
  const currentUserId = userData?.userId;
  const { receiverId } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId || !receiverId) {
      setLoading(false);
      return;
    }

    socket.emit("join", currentUserId);

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/messages/${currentUserId}/${receiverId}`
        );
        setMessages(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des messages:", err);
        setLoading(false);
      }
    };

    fetchMessages();

    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [currentUserId, receiverId]);

  const sendMessage = () => {
    if (!message.trim() || !currentUserId || !receiverId) return;

    const msgData = {
      sender: currentUserId,
      receiver: receiverId,
      message,
    };

    socket.emit("sendMessage", msgData);
    setMessage("");
  };

  if (!currentUserId || !receiverId) {
    return <p>Erreur : utilisateur ou destinataire non défini.</p>;
  }

  return (
    <div>
      <h2>Discussion</h2>
      {loading ? (
        <p>Chargement des messages...</p>
      ) : (
        <div style={{ height: 300, overflowY: "scroll", border: "1px solid gray", padding: 10 }}>
          {messages.map((m, i) => (
            <p key={i} style={{ color: m.sender === currentUserId ? "blue" : "green" }}>
              <strong>{m.sender === currentUserId ? "Moi" : "Lui"}:</strong> {m.message}
            </p>
          ))}
        </div>
      )}
      <input
        type="text"
        placeholder="Tape un message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />
      <button onClick={sendMessage}>Envoyer</button>
    </div>
  );
};

export default Chat;