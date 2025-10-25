import "./App.css";
import { Routes, Route, Link } from "react-router-dom";
import Messages from "./pages/Messages";
import Status from "./pages/Status";
import Homepage from "./pages/Homepage";
import Template from "./pages/Template";
import Ecommerce from "./pages/Ecommerce";
import PhoneNumberList from "./pages/PhoneNumberList";
import AppMessages from "./pages/AppMessages";
import WbRouter from "./pages/whatsapp/WBRouter";
import Login from "./pages/LoginPage";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Homepage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/whatsapp/*"
          element={
            <ProtectedRoute>
              <WbRouter />
            </ProtectedRoute>
          }
        ></Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

{
  /* <ReceivedTextMessage />
      <MessageSecrurityNotification />
      <ImageMessage />
      <StickerMessage />
      <ContactMessage />
      <LocationMessage />
      <ReferralMessage />
      <UnknownMessage />
      <ButtonMessage /> */
}
