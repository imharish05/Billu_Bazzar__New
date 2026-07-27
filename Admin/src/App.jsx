import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsAdminPage from './pages/ProductsAdminPage';
import VariantsAdminPage from './pages/VariantsAdminPage';
import CategoriesAdminPage from './pages/CategoriesAdminPage';
import SubCategoriesAdminPage from './pages/SubCategoriesAdminPage';
import SubSubCategoriesAdminPage from './pages/SubSubCategoriesAdminPage';
import OrdersAdminPage from './pages/OrdersAdminPage';
import CustomersAdminPage from './pages/CustomersAdminPage';
import AbandonedCartsAdminPage from './pages/AbandonedCartsAdminPage';
import BannersAdminPage from './pages/BannersAdminPage';
import VendorsAdminPage from './pages/VendorsAdminPage';
import WarehousesAdminPage from './pages/WarehousesAdminPage';
import CouponsAdminPage from './pages/CouponsAdminPage';
import GiftServicesAdminPage from './pages/GiftServicesAdminPage';
import AffiliatesAdminPage from './pages/AffiliatesAdminPage';
import LoyaltyAdminPage from './pages/LoyaltyAdminPage';
import PaymentsAdminPage from './pages/PaymentsAdminPage';
import ReportsAdminPage from './pages/ReportsAdminPage';
import SettingsAdminPage from './pages/SettingsAdminPage';
import SiteSettingsAdminPage from './pages/SiteSettingsAdminPage';
import SliderMessagesAdminPage from './pages/SliderMessagesAdminPage';
import ReviewsAdminPage from './pages/ReviewsAdminPage';
import StockAlertsAdminPage from './pages/StockAlertsAdminPage';
import DeliveryZonesAdminPage from './pages/DeliveryZonesAdminPage';
import ContactEnquiriesAdminPage from './pages/ContactEnquiriesAdminPage';
import NotFoundAdminPage from './pages/NotFoundAdminPage';

/* Protected route — redirect to /login if no admin token */
const Protected = ({ children }) => {
  const token = localStorage.getItem('bb_admin_token');
  return token ? children : <Navigate to="/login" replace />;
};

import { Toaster } from 'react-hot-toast';

const App = () => (
  <>
    <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard"   element={<Protected><DashboardPage /></Protected>} />
      <Route path="/products"    element={<Protected><ProductsAdminPage /></Protected>} />
      <Route path="/reviews"     element={<Protected><ReviewsAdminPage /></Protected>} />
      <Route path="/stock-alerts" element={<Protected><StockAlertsAdminPage /></Protected>} />
      <Route path="/variants"    element={<Protected><VariantsAdminPage /></Protected>} />
      <Route path="/categories"  element={<Protected><CategoriesAdminPage /></Protected>} />
      <Route path="/sub-categories" element={<Protected><SubCategoriesAdminPage /></Protected>} />
      <Route path="/sub-sub-categories" element={<Protected><SubSubCategoriesAdminPage /></Protected>} />
      <Route path="/orders"      element={<Protected><OrdersAdminPage /></Protected>} />
      <Route path="/customers"   element={<Protected><CustomersAdminPage /></Protected>} />
      <Route path="/contact-enquiries" element={<Protected><ContactEnquiriesAdminPage /></Protected>} />
      <Route path="/abandoned-carts" element={<Protected><AbandonedCartsAdminPage /></Protected>} />
      <Route path="/slider-messages" element={<Protected><SliderMessagesAdminPage /></Protected>} />
      <Route path="/banners"     element={<Protected><BannersAdminPage /></Protected>} />
      <Route path="/vendors"     element={<Protected><VendorsAdminPage /></Protected>} />
      <Route path="/warehouses"  element={<Protected><WarehousesAdminPage /></Protected>} />
      <Route path="/delivery-zones" element={<Protected><DeliveryZonesAdminPage /></Protected>} />
      <Route path="/coupons"     element={<Protected><CouponsAdminPage /></Protected>} />
      <Route path="/gift-services" element={<Protected><GiftServicesAdminPage /></Protected>} />
      <Route path="/affiliates"  element={<Protected><AffiliatesAdminPage /></Protected>} />
      <Route path="/loyalty"     element={<Protected><LoyaltyAdminPage /></Protected>} />
      <Route path="/payments"    element={<Protected><PaymentsAdminPage /></Protected>} />
      <Route path="/reports"     element={<Protected><ReportsAdminPage /></Protected>} />
      <Route path="/settings"    element={<Protected><SettingsAdminPage /></Protected>} />
      <Route path="/site-settings" element={<Protected><SiteSettingsAdminPage /></Protected>} />
      <Route path="*"            element={<NotFoundAdminPage />} />
    </Routes>
  </>
);

export default App;
