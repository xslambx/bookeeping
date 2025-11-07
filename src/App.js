import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard';
import ClientPortal from './components/ClientPortal';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function Dashboard() {
  const { userRole } = useAuth();

  if (userRole === 'admin') {
    return <AdminDashboard />;
  } else if (userRole === 'client') {
    return <ClientPortal />;
  }

  return <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
