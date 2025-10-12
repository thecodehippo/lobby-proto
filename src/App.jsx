import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { CmsProvider } from "./cms/CmsContext.jsx";
import CmsApp from "./cms/CmsApp.jsx";
import LobbyApp from "./lobby/LobbyApp.jsx";

function AppNav() {
  const location = useLocation();
  const isCms = location.pathname.startsWith('/cms');
  
  return (
    <nav style={{
      background: '#f3f4f6',
      borderBottom: '1px solid #e5e7eb',
      padding: '8px 16px',
      display: 'flex',
      gap: 8
    }}>
      <Link 
        to="/cms" 
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          textDecoration: 'none',
          background: isCms ? '#111827' : '#fff',
          color: isCms ? '#fff' : '#111827',
          border: '1px solid #d1d5db',
          fontSize: 14
        }}
      >
        CMS
      </Link>
      <Link 
        to="/" 
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          textDecoration: 'none',
          background: !isCms ? '#111827' : '#fff',
          color: !isCms ? '#fff' : '#111827',
          border: '1px solid #d1d5db',
          fontSize: 14
        }}
      >
        Lobby
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <CmsProvider>
      <BrowserRouter>
        <AppNav />
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
