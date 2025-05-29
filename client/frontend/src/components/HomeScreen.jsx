import React from "react";
import logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";

function HomeScreen({ onStartChat }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "5rem",
        backgroundColor: "white",  // רקע לבן
        padding: "3rem 1rem",      // ריפוד נעים מסביב
        borderRadius: "8px",       // פינות מעוגלות
        maxWidth: "400px",
        marginLeft: "auto",
        marginRight: "auto",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",  // צל עדין למראה מודרני
      }}
    >
      <img
        src={logo}
        alt="App Logo"
        style={{ width: "300px", marginBottom: "2.5rem" }} // לוגו גדול יותר ורווח גדול מתחתיו
      />
      <button
       onClick={() => navigate("/chat")}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.4rem",
          backgroundColor: "#007BFF",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Start
      </button>
    </div>
  );
}

export default HomeScreen;
