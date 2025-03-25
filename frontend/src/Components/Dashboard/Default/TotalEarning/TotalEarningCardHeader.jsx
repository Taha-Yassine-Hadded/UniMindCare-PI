import { CardHeader, Button, Badge } from "reactstrap";
import { H4, P } from "../../../../AbstractElements"; // Ajustez le chemin selon votre structure
import { OurTotalEarning } from "../../../../Constant"; // Ajustez le chemin selon votre structure
import { useState, useEffect } from "react";

// Fonction pour décoder le token JWT
const decodeJWT = (token) => {
  try {
    if (!token) return {};
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Erreur de décodage du token:", error);
    return {};
  }
};

// Fonction pour obtenir le token depuis le stockage
const getToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
};

// Fonction pour exécuter la détection
async function runDetection() {
  const headers = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch("http://localhost:5000/run-detection", {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log("Réponse de runDetection:", data);
    alert("Détection démarrée avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'exécution de runDetection:", error.message);
    throw error; // Relancer l'erreur pour la gestion dans le composant
  }
}

// Fonction pour arrêter la détection
async function stopDetection() {
  const headers = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch("http://localhost:5000/stop-detection", {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log("Réponse de stopDetection:", data);
    alert("Détection arrêtée avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'exécution de stopDetection:", error.message);
    throw error; // Relancer l'erreur pour la gestion dans le composant
  }
}

const TotalEarningCardHeader = () => {
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({ userId: "", email: "" });
  const [tokenExists, setTokenExists] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      setTokenExists(true);
      const decodedToken = decodeJWT(token);
      setUserInfo({
        userId: decodedToken.userId || "Non disponible",
        email: decodedToken.email || "Non disponible",
      });
    } else {
      setTokenExists(false);
      setUserInfo({ userId: "Non connecté", email: "Non connecté" });
    }
  }, []);

  const handleRunDetection = async () => {
    setLoading(true);
    setError(null);
    try {
      await runDetection();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopDetection = async () => {
    setLoading(true);
    setError(null);
    try {
      await stopDetection();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CardHeader className="pb-0">
        <div className="d-flex justify-content-between align-items-center">
          <div className="flex-grow-1">
            <P attrPara={{ className: "square-after f-w-600 header-text-primary" }}>
              {OurTotalEarning}
              <i className="fa fa-circle ms-2"></i>
            </P>
            <H4>96.564%</H4>
          </div>
          <div>
            <h1>Test de Détection Flask</h1>
            <Button
              color="primary"
              className="px-4 py-2 rounded shadow-sm fw-bold"
              onClick={handleRunDetection}
              disabled={loading}
            >
              {loading ? "Chargement..." : "Lancer la détection"}
            </Button>
            <Button
              color="danger"
              className="px-4 py-2 rounded shadow-sm fw-bold"
              onClick={handleStopDetection}
              disabled={loading}
            >
              {loading ? "Chargement..." : "Arrêter la détection"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="px-4 py-3 bg-light border-top">
        <div className="d-flex flex-wrap align-items-center">
          <div className="me-4 mb-2">
            <Badge color="info" className="p-2 me-2">Utilisateur</Badge>
            <span className="fw-bold">{userInfo.userId}</span>
          </div>
          <div>
            <Badge color="secondary" className="p-2 me-2">Email</Badge>
            <span>{userInfo.email}</span>
          </div>
        </div>
        <div className="mt-2">
          <Badge color={tokenExists ? "success" : "danger"} pill className="p-2">
            {tokenExists ? "Token trouvé dans localStorage" : "Aucun token trouvé"}
          </Badge>
        </div>
        {error && (
          <div className="mt-2">
            <Badge color="danger" pill className="p-2">
              Erreur: {error}
            </Badge>
          </div>
        )}
      </div>
    </>
  );
};

export default TotalEarningCardHeader;