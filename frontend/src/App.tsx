import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Centered } from "./components/Centered";

const RedeemPage = lazy(() => import("./pages/public/RedeemPage").then((module) => ({ default: module.RedeemPage })));
const ReceiptPage = lazy(() => import("./pages/public/ReceiptPage").then((module) => ({ default: module.ReceiptPage })));
const AlreadyDownloadedPage = lazy(() => import("./pages/public/AlreadyDownloadedPage").then((module) => ({ default: module.AlreadyDownloadedPage })));
const LoginPage = lazy(() => import("./pages/admin/LoginPage").then((module) => ({ default: module.LoginPage })));
const AdminShell = lazy(() => import("./pages/admin/AdminShell").then((module) => ({ default: module.AdminShell })));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const GoodsPage = lazy(() => import("./pages/admin/GoodsPage").then((module) => ({ default: module.GoodsPage })));
const CardsPage = lazy(() => import("./pages/admin/CardsPage").then((module) => ({ default: module.CardsPage })));
const LogsPage = lazy(() => import("./pages/admin/LogsPage").then((module) => ({ default: module.LogsPage })));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage").then((module) => ({ default: module.SettingsPage })));

export default function App() {
  return (
    <Suspense fallback={<Centered message="加载页面" />}>
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
    </Suspense>
  );
}
