import { useState, useEffect } from "react";
import { Inbox, LogIn, Settings, User } from "react-feather";
import { useNavigate, Link } from "react-router-dom";
import { LI, UL } from "../../../AbstractElements";
import { Account, LogOut } from "../../../Constant";
import axios from "axios";

const Users = () => {
  const [navbarColor, setNavbarColor] = useState("transparent");
  const [userData, setUserData] = useState(
    JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user"))
  );
  const navigate = useNavigate();

  const role = userData?.Role?.[0] || "Non défini";

  // Définir la couleur du navbar en fonction du rôle
  const getNavbarColor = (role) => {
    switch (role.toLowerCase()) {
      case "student":
        return "#f7f4cd"; // Rouge clair pour les étudiants
      case "teacher":
        return "#9dcbea"; // Vert clair pour les enseignants
      case "admin":
        return "#ccccff"; // Bleu clair pour les administrateurs
      default:
        return "transparent"; // Transparent par défaut
    }
  };

  useEffect(() => {
    setNavbarColor(getNavbarColor(role));
  }, [role]);

  // Fonction de déconnexion
  const Logout = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (token) {
        await axios.post(
          "http://localhost:5000/users/logout",
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      localStorage.removeItem("profileURL");
      localStorage.removeItem("Name");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      localStorage.setItem("login", false);

      navigate("/tivo/authentication/login-simple");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const Active = () => setNavbarColor(!navbarColor);

  return (
    <div style={{ backgroundColor: navbarColor, padding: "10px" }}>
      <LI attrLI={{ className: `profile-nav onhover-dropdown` }}>
        <div className="account-user">
          <User onClick={Active} />
        </div>
        <UL attrUL={{ className: "profile-dropdown onhover-show-div" }}>
          <LI>
            <Link to={`${process.env.PUBLIC_URL}/users/useredit`}>
              <i>
                <Settings />
              </i>
              <span>{Account}</span>
            </Link>
          </LI>
          <LI attrLI={{ onClick: Logout }}>
            <LogIn />
            <span>{LogOut}</span>
          </LI>
        </UL>
      </LI>
    </div>
  );
};

export default Users;