import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DreamPage from './pages/DreamPage'
import FeedPage from './pages/FeedPage'
import DreamDetailPage from './pages/DreamDetailPage'
import LoginPage from './pages/LoginPage'
import AuthCompletePage from './pages/AuthCompletePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DreamPage />} />
      <Route path="/feed" element={<FeedPage />} />
      <Route path="/dream/:id" element={<DreamDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/complete" element={<AuthCompletePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
