import { useState } from "react";
import { Inbox, LogIn, Settings, User } from "react-feather";
import { useNavigate, Link } from "react-router-dom";
import { LI, UL } from "../../../AbstractElements";
import { Account, LogOut } from "../../../Constant";
import axios from "axios";

const Users = () => {
  const [toggle, setToogle] = useState(true);
  const navigate = useNavigate();

  // Logout function
  const Logout = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token"); // Retrieve the token
      if (token) {
        // Send the token to the backend to invalidate it
        await axios.post(
          "http://localhost:5000/users/logout", // Adjust URL based on your backend setup
          {},
          {
            headers: { Authorization: `Bearer ${token}` } // Include token in Authorization header
          }
        );
      }

      // Clear user data from localStorage and sessionStorage
      localStorage.removeItem("profileURL");
      localStorage.removeItem("Name");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      localStorage.setItem("login", false); // Set login state to false

      // Redirect to login page
      navigate("/tivo/authentication/login-simple");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const Active = () => setToogle(!toggle);

  return (
    <LI attrLI={{ className: `profile-nav onhover-dropdown` }}>
      <div className="account-user"><User onClick={Active} /></div>
      <UL attrUL={{ className: "profile-dropdown onhover-show-div" }}>
        <LI><Link to={`${process.env.PUBLIC_URL}/users/useredit`}><i><Settings /></i><span>Account</span></Link></LI>
        <LI attrLI={{ onClick: Logout }}><LogIn /><span>{LogOut}</span></LI>
      </UL>
    </LI>
  );
};

export default Users;