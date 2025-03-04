import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { authHeader, handleResponse } from "../Services/fack.backend";

// Dans PrivateRoute.jsx
const PrivateRoute = () => {
  const [authenticated, setAuthenticated] = useState(
    JSON.parse(localStorage.getItem("login")) || false
  );
  const jwt_token = localStorage.getItem("token");

  useEffect(() => {
    console.log("PrivateRoute - Checking authentication:", {
      login: JSON.parse(localStorage.getItem("login")),
      authenticated,
      jwt_token,
    });
    const requestOptions = { method: "GET", headers: authHeader() };
    fetch("/users", requestOptions)
      .then(handleResponse)
      .then(() => {
        setAuthenticated(true);
        console.log("Authenticated set to true");
      })
      .catch(() => {
        setAuthenticated(false);
        console.log("Authenticated set to false");
      });
  }, []);

  console.log("Rendering PrivateRoute, isAuthenticated:", authenticated || jwt_token);
  return authenticated || jwt_token ? (
    <Outlet />
  ) : (
    <Navigate exact to={`${process.env.PUBLIC_URL}/login`} replace />
  );
};

export default PrivateRoute;