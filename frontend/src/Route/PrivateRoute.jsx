import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";

const PrivateRoute = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setAuthenticated(false);
        setLoading(false);
        console.log("PrivateRoute - Aucun token trouvé, utilisateur non connecté");
        return;
      }

      try {
        console.log("PrivateRoute - Token utilisé:", token); // Ajout ici
        const response = await axios.get("http://localhost:5000/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Auth-FaceID': 'true' // Nouvel header
            },
        });
        const data = response.data;
        // Assurez-vous que les champs sont uniformes
        const normalizedData = {
          Name: data.Name || "",
          Identifiant: data.Identifiant || data.identifiant || "",
          Email: data.Email || "",
          Classe: data.Classe || "",
          Role: data.Role || "",
          PhoneNumber: data.PhoneNumber || "",
          imageUrl: data.imageUrl || "/defaultProfile.png",
          userId: data.userId || data._id || "",
        };
        setAuthenticated(true);
        setUserData(normalizedData);
        localStorage.setItem('user', JSON.stringify(normalizedData));
        console.log("PrivateRoute - Données utilisateur:", normalizedData);
       
      } catch (error) {
        setAuthenticated(false);
        console.error("PrivateRoute - Échec de l'authentification:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  if (loading) return <div>Chargement...</div>;

  return authenticated ? (
    <Outlet context={{ userData }} />
  ) : (
    <Navigate to={`${process.env.PUBLIC_URL}/login`} replace />
  );
};

export default PrivateRoute;