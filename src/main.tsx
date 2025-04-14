
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add a debug message to help troubleshoot
console.log("App initializing...");

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
} else {
  console.error("Root element not found");
}
