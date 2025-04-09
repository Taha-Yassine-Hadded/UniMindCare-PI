import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        
        if (!token) {
          navigate("/login");
          return;
        }

        const res = await axios.get("http://localhost:5000/api/users/all", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.data && Array.isArray(res.data)) {
          setUsers(res.data);
        } else {
          setError("Format de données invalide");
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        setError(error.response?.data?.message || "Erreur lors du chargement des utilisateurs");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  if (loading) return (
    <div style={styles.container}>
      <p>Chargement des utilisateurs...</p>
    </div>
  );
  
  if (error) return (
    <div style={styles.container}>
      <p style={styles.error}>{error}</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Liste des utilisateurs</h2>
      {users.length === 0 ? (
        <p style={styles.noUsers}>Aucun utilisateur trouvé.</p>
      ) : (
        <ul style={styles.userList}>
          {users.map((user) => (
            <li
              key={user._id}
              style={styles.userItem}
              onClick={() => navigate(`/messages/${user._id}`)}
            >
              <span style={styles.userName}>{user.Name}</span>
              <span style={styles.userEmail}>{user.Email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    maxWidth: "800px",
    margin: "0 auto",
  },
  title: {
    color: "#2c3e50",
    marginBottom: "20px",
    textAlign: "center",
  },
  userList: {
    listStyle: "none",
    padding: 0,
  },
  userItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px",
    margin: "10px 0",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "transform 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    },
  },
  userName: {
    fontWeight: "bold",
    color: "#2c3e50",
  },
  userEmail: {
    color: "#7f8c8d",
    fontSize: "0.9em",
  },
  error: {
    color: "#e74c3c",
    textAlign: "center",
  },
  noUsers: {
    textAlign: "center",
    color: "#7f8c8d",
  },
};

export default UserList;