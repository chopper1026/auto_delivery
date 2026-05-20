import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "./pages/admin/AdminShell";
import { CardsPage } from "./pages/admin/CardsPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { GoodsPage } from "./pages/admin/GoodsPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { LogsPage } from "./pages/admin/LogsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { AlreadyDownloadedPage } from "./pages/public/AlreadyDownloadedPage";
import { ReceiptPage } from "./pages/public/ReceiptPage";
import { RedeemPage } from "./pages/public/RedeemPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RedeemPage />} />
      <Route path="/receipt/:token" element={<ReceiptPage />} />
      <Route path="/download/already-downloaded" element={<AlreadyDownloadedPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="goods" element={<GoodsPage />} />
        <Route path="cards" element={<CardsPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
