import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Dashboard from './pages/Dashboard';
import StrainDetails from './pages/StrainDetails';
import RecoveryDetails from './pages/RecoveryDetails';
import SleepDetails from './pages/SleepDetails';
import Trends from './pages/Trends';
import HealthMonitor from './pages/HealthMonitor';
import Activities from './pages/Activities';

import Report from './pages/Report';
import { useNavigate } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { handleDeepLink } from './services/auth';

const RootAuthHandler = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    // 1. Handle HTTP redirects (Root hash)
    if (window.location.hash && window.location.hash.includes('access_token')) {
      navigate('/callback' + window.location.hash);
    }

    // 2. Handle Custom Scheme (Deep Link)
    CapacitorApp.addListener('appUrlOpen', async data => {
      console.log('App opened with URL:', data.url);

      // Close the browser window (Custom Tab) if it's open
      await Browser.close();

      // HARD RESET STRATEGY:
      // Handle token immediately and force a hard app reload to Root (which renders Dashboard via PrivateRoute)
      const success = await handleDeepLink(data.url);
      if (success) {
        const token = localStorage.getItem('fitbit_access_token');
        // alert(`DeepLink Success...`); // REMOVED to reduce noise

        console.log("Token saved. executing safe reload sequence.");
        // Wait for browser close animation to finish to avoid WebView contention
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }
    });
  }, [navigate]);
  return null;
};

import Settings from './pages/Settings';
import { getAccessToken } from './services/auth';
import PrivateRoute from './components/auth/PrivateRoute';

function App() {
  // Handle native app redirect where it lands on root with hash
  React.useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      console.log('Detected access_token on root, redirecting to /callback');
      // Manually navigate to callback route processing
      // We can't use useNavigate here as it's outside Router, so we modify window.location
      // But since we are in Router context inside App, wait... App wraps Router.
      // Actually, we should do this inside a component inside Router.
    }
  }, []);

  return (
    <Router>
      <RootAuthHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/strain"
          element={
            <PrivateRoute>
              <StrainDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/recovery"
          element={
            <PrivateRoute>
              <RecoveryDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/sleep"
          element={
            <PrivateRoute>
              <SleepDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/trends"
          element={
            <PrivateRoute>
              <Trends />
            </PrivateRoute>
          }
        />
        <Route
          path="/health"
          element={
            <PrivateRoute>
              <HealthMonitor />
            </PrivateRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <PrivateRoute>
              <Activities />
            </PrivateRoute>
          }
        />

        <Route
          path="/report"
          element={
            <PrivateRoute>
              <Report />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
