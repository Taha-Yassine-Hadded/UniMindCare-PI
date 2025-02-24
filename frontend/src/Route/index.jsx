import React from "react";
import { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { auth0 } from "../Config/Config";
import { Auth0Provider } from "@auth0/auth0-react";
import { configureFakeBackend, authHeader, handleResponse } from "../Services/fack.backend";
import Callback from '../Auth/Callback';
import Loader from "../Layout/Loader";
import { authRoutes } from "./AuthRoutes";
import LayoutRoutes from "../Route/LayoutRoutes";
import Signin from '../Auth/Signin';
import PrivateRoute from "./PrivateRoute";

// setup fake backend
configureFakeBackend();
const Routers = () => {
  const [authenticated, setAuthenticated] = useState(localStorage.getItem("login"));
  const jwt_token = localStorage.getItem("token");

  useEffect(() => {
    let abortController = new AbortController();
    const requestOptions = { method: "GET", headers: authHeader() };
    fetch("/users", requestOptions).then(handleResponse);
    setAuthenticated(JSON.parse(localStorage.getItem("login")));
    console.ignoredYellowBox = ["Warning: Each", "Warning: Failed"];
    console.disableYellowBox = true;
    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <Auth0Provider domain={auth0.domain} clientId={auth0.clientId} redirectUri={auth0.redirectUri}>
      <BrowserRouter basename={"/"}>
        <>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path={"/"} element={<PrivateRoute />}>
                { authenticated || jwt_token ? (
                  <>
                    <Route exact path={`${process.env.PUBLIC_URL}`} element={<Navigate to={`${process.env.PUBLIC_URL}/dashboard/default`} />} />
                    <Route exact path={`/`} element={<Navigate to={`${process.env.PUBLIC_URL}/dashboard/default`} />} />
                  </>
                ) : (
                  ""
                )}
                <Route path={`/*`} element={<LayoutRoutes />} />
              </Route>
              <Route path={`${process.env.PUBLIC_URL}/callback`} render={() => <Callback />} />
                <Route exact path={`${process.env.PUBLIC_URL}/login`} element={<Signin />} />
                {authRoutes.map(({ path, Components }, i) => (
                  <Route path={path} element={Components} key={i} />
                ))}
            </Routes>
          </Suspense>
        </>
      </BrowserRouter>
    </Auth0Provider>
  );
};

export default Routers;
