import React, { useState } from "react";
import Signin from "./signin/signin";
import Dashboard from "./dashboard/Dashboard";
import Navbar from "./navbar/Navbar";
import bgImage from "./assests/website.jpg";
import VlogFeed from "./vlogs/VlogFeed";
import WatchPage from "./watch/WatchPage";
import AIChannel from "./channel/AIChannel";
import AdminDashboard from "./admin/AdminDashboard";


function App() {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div>
      {user ? (
        <Homepage user={user} onLogout={handleLogout} />
      ) : (
        <div
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            backgroundRepeat: "no-repeat",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: "16px",
              padding: "40px",
              width: "100%",
              maxWidth: "420px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h2
              style={{
                color: "#ffffff",
                textAlign: "center",
                marginBottom: "24px",
                fontWeight: "700",
                letterSpacing: "0.5px",
              }}
            >
              DOOMverse Sign In
            </h2>
            <Signin onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}

function Homepage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("my-vlogs");
  const [selectedVlog, setSelectedVlog] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null); // creator email

  // Watch page takes full priority
  if (selectedVlog) {
    return (
      <WatchPage
        vlog={selectedVlog}
        user={user}
        onBack={() => setSelectedVlog(null)}
      />
    );
  }

  // Admin Panel
  if (activeTab === "admin") {
    return (
      <div
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
        }}
      >
        <Navbar
          user={user}
          onLogout={onLogout}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <AdminDashboard
          adminUser={user}
          onSelectUser={(email) => {
            setSelectedChannel(email);
            setActiveTab("ai-channel");
          }}
          onBack={() => setActiveTab("my-vlogs")}
        />
      </div>
    );
  }

  // AI Channel page - either from tab or clicking an author
  if (activeTab === "ai-channel" || selectedChannel) {
    return (
      <AIChannel
        creatorEmail={selectedChannel || user.email}
        currentUser={user}
        onBack={() => {
          setSelectedChannel(null);
          setActiveTab("others-ideas");
        }}
      />
    );
  }

  return (
    <div
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        color: "#ffffff",
      }}
    >
      <Navbar
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <VlogFeed
        user={user}
        activeTab={activeTab}
        onWatch={setSelectedVlog}
        onChannelOpen={setSelectedChannel}
      />
    </div>
  );
}



export default App;
