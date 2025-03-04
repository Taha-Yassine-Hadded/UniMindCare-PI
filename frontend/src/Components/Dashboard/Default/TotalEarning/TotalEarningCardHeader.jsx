import { CardHeader, Button, Badge, Card } from "reactstrap";
import { H4, P } from "../../../../AbstractElements";
import { OurTotalEarning } from "../../../../Constant";
import { useState, useEffect } from "react";

// Fonction pour décoder le token JWT
const decodeJWT = (token) => {
  try {
    if (!token) return {};
    
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
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

// Sauvegarde de la version originale de fetch
const originalFetch = window.fetch;

window.fetch = async (...args) => {
    const [resource, config = {}] = args;
    
    if (!config.headers) {
        config.headers = {};
    }

    // Utiliser le token du localStorage
    const token = getToken();
    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
    }

    return originalFetch(resource, config);
};

// Fonction pour exécuter la détection
async function runDetection() {
    const headers = { 
        'Content-Type': 'application/json'
    };
    
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch("http://localhost:5003/run-detection", {
            method: "POST",
            headers
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("Réponse de runDetection:", data);
        alert("Détection démarrée avec succès !");
    } catch (error) {
        console.error("Erreur lors de l'exécution de runDetection:", error.message);
        alert("Erreur lors de l'exécution de la détection.");
    }
}

// Fonction pour arrêter la détection
async function stopDetection() {
  const headers = { 
      'Content-Type': 'application/json'
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch("http://localhost:5003/stop-detection", {
      method: "POST",
      headers
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const data = await response.json();
    console.log("Réponse de stopDetection:", data);
    alert("Détection arrêtée avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'exécution de stopDetection:", error.message);
    alert("Erreur lors de l'arrêt de la détection.");
  }
}

const TotalEarningCardHeader = () => {
    const [loading, setLoading] = useState(false);
    const [userInfo, setUserInfo] = useState({ userId: "", email: "" });
    const [tokenExists, setTokenExists] = useState(false);

    // Extraire les infos du token au chargement du composant
    useEffect(() => {
        const token = getToken();
        if (token) {
            setTokenExists(true);
            const decodedToken = decodeJWT(token);
            setUserInfo({
                userId: decodedToken.userId || "Non disponible",
                email: decodedToken.email || "Non disponible"
            });
        } else {
            setTokenExists(false);
            setUserInfo({ userId: "Non connecté", email: "Non connecté" });
        }
    }, []);

    const handleRunDetection = async () => {
        setLoading(true);
        await runDetection();
        setLoading(false);
    };

    return (
        <>
            <CardHeader className="pb-0">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="flex-grow-1">
                        <P attrPara={{ className: "square-after f-w-600 header-text-primary" }} >
                            {OurTotalEarning}
                            <i className="fa fa-circle ms-2"></i>
                        </P>
                        <H4>96.564%</H4>
                    </div>
                    <div>
        <h1>Test de Detection Flask</h1>
        <Button
         color="primary"
        className="px-4 py-2 rounded shadow-sm fw-bold"
         onClick={runDetection}>Lancer la détection</Button>
        <Button 
         color="danger"
        className="px-4 py-2 rounded shadow-sm fw-bold"
        onClick={stopDetection}>Arrêter la détection</Button>
      </div>





                </div>
            </CardHeader>
            
            {/* Informations utilisateur extraites du token */}
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
            </div>
        </>
    );
};

export default TotalEarningCardHeader;