import { useState } from 'react'
import Welcome from './pages/Welcome/Welcome.jsx'
import Dashboard from './pages/Dashboard/Dashboard.jsx'
import Projects from './pages/Projects.jsx'
import { Route, Routes } from 'react-router';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/projects" element={<Projects />} />
    </Routes>
  );
}

export default App
