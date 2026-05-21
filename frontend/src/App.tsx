import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Centered } from "./components/Centered";

const RedeemPage = lazy(() => import("./features/public/redeem/RedeemPage").then((module) => ({ default: module.RedeemPage })));
const ReceiptPage = lazy(() => import("./features/public/receipt/ReceiptPage").then((module) => ({ default: module.ReceiptPage })));
const AlreadyDownloadedPage = lazy(() => import("./features/public/receipt/AlreadyDownloadedPage").then((module) => ({ default: module.AlreadyDownloadedPage })));
const LoginPage = lazy(() => import("./features/admin/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const AdminShell = lazy(() => import("./features/admin/shell/AdminShell").then((module) => ({ default: module.AdminShell })));
const DashboardPage = lazy(() => import("./features/admin/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const GoodsPage = lazy(() => import("./features/admin/goods/GoodsPage").then((module) => ({ default: module.GoodsPage })));
const CardsPage = lazy(() => import("./features/admin/cards/CardsPage").then((module) => ({ default: module.CardsPage })));
const LogsPage = lazy(() => import("./features/admin/logs/LogsPage").then((module) => ({ default: module.LogsPage })));
const SettingsPage = lazy(() => import("./features/admin/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));

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
