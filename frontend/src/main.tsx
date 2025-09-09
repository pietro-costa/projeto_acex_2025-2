import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initTheme } from "@/lib/theme";
initTheme(); // aplica 'dark' ou 'light' assim que a página carrega

createRoot(document.getElementById("root")!).render(<App />);
