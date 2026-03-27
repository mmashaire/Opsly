import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import { ItemDetail } from "./ItemDetail";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/items/:itemId" element={<ItemDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
