import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";

const PrivateRoute = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
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
        const response = await axios.get("http://localhost:5000/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAuthenticated(true);
        console.log("PrivateRoute - Authentification réussie avec token:", token);
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

  console.log("Rendering PrivateRoute, isAuthenticated:", authenticated);
  return authenticated ? (
    <Outlet />
  ) : (
    <Navigate to={`${process.env.PUBLIC_URL}/login`} replace />
  );
};

export default PrivateRoute;