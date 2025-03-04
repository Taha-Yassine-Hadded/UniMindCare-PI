import { CardHeader, Button } from "reactstrap";
import { H4, P } from "../../../../AbstractElements";
import { OurTotalEarning } from "../../../../Constant";
import { useState } from "react";

// Sauvegarde de la version originale de fetch
const originalFetch = window.fetch;

window.fetch = async (...args) => {
    const [resource, config = {}] = args;
    
    if (!config.headers) {
        config.headers = {}; // S'assurer que headers existe
    }

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
    }

    return originalFetch(resource, config);
};

// Fonction pour exécuter la détection
async function runDetection() {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch("http://192.168.1.114:5003/run-detection", {
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
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');

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

    const handleRunDetection = async () => {
        setLoading(true);
        await runDetection();
        setLoading(false);
    };

    return (
        <CardHeader className="pb-0">
            <div className="d-flex justify-content-between align-items-center">
                <div className="flex-grow-1">
                    <P attrPara={{ className: "square-after f-w-600 header-text-primary" }} >
                        {OurTotalEarning}
                        <i className="fa fa-circle ms-2"></i>
                    </P>
                    <H4>96.564%</H4>
                </div>
                <Button
                    color="primary"
                    className="px-4 py-2 rounded shadow-sm fw-bold"
                    onClick={handleRunDetection}
                    disabled={loading}
                >
                    {loading ? "Lancement..." : "Lancer la Détection"}
                </Button>
            </div>
        </CardHeader>
    );
};

export default TotalEarningCardHeader;