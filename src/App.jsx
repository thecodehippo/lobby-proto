import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CmsProvider } from "./cms/CmsContext.jsx";
import CmsApp from "./cms/CmsApp.jsx";
import LobbyApp from "./lobby/LobbyApp.jsx";

export default function App() {
  return (
    <CmsProvider>
      <BrowserRouter>
        <Routes>
          {/* CMS lives under /cms */}
          <Route path="/cms/*" element={<CmsApp />} />
          {/* Everything else is the Lobby */}
          <Route path="/*" element={<LobbyApp />} />
          {/* (optional) legacy fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CmsProvider>
  );
}
