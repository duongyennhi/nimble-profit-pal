import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "./pages/LoginPage";
import Index from "./pages/Index";
import ProductsPage from "./pages/ProductsPage";
import PurchasesPage from "./pages/PurchasesPage";
import SalesPage from "./pages/SalesPage";
import InvoicesPage from "./pages/InvoicesPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <Index />
                </AppLayout>
              }
            />

            <Route
              path="/products"
              element={
                <AppLayout>
                  <ProductsPage />
                </AppLayout>
              }
            />

            <Route
              path="/purchases"
              element={
                <AppLayout>
                  <PurchasesPage />
                </AppLayout>
              }
            />

            <Route
              path="/sales"
              element={
                <AppLayout>
                  <SalesPage />
                </AppLayout>
              }
            />

            <Route
              path="/invoices"
              element={
                <AppLayout>
                  <InvoicesPage />
                </AppLayout>
              }
            />

            <Route
              path="/reports"
              element={
                <AppLayout>
                  <ReportsPage />
                </AppLayout>
              }
            />

            <Route
              path="/users"
              element={
                <AppLayout>
                  <UsersPage />
                </AppLayout>
              }
            />

            <Route
              path="/settings"
              element={
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;