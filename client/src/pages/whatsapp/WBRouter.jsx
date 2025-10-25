import { Routes, Route } from "react-router-dom";
import WAPhoneNumberListPage from "./phone-numbers/WAPhoneNumberListPage";
import WATempateListPage from "./template/WATemplateListPage";
import WAIncomingMessagePage from "./incoming/WAIncomingMessagePage";
import WAOutgoingStatusMessagePage from "./outgoing/WAOutgoingStatusMessagePage";
import WAClientListPage from "./clients/WAClientListPage";
import WAChatWindowPage from "./chat/WAChatWindowPage";
import OrderMessagePage from "./ecommerce/OrderMessagePage";
import CatalogMessagePage from "./catalog/CatalogMessagePage";
function WBAppRouter() {
  return (
    <Routes>
      <Route path="/">
        <Route index element={<WAPhoneNumberListPage />} />
        <Route path="template/:wba_id" element={<WATempateListPage />} />
        <Route
          path="client/:wba_id/:phone_number_id"
          element={<WAClientListPage />}
        />
        <Route
          path="chat/:wba_id/:phone_number_id/:wa_id"
          element={<WAChatWindowPage />}
        />
        <Route
          path="incoming/:wba_id/:phone_number_id"
          element={<WAIncomingMessagePage />}
        />
         <Route
          path="ecommerce/:wba_id/:phone_number_id"
          element={<OrderMessagePage />}
        />
        <Route
          path="catalog/:wba_id/:catalog_id"
          element={<CatalogMessagePage />}
        />
        <Route
          path="message-status"
          element={<WAOutgoingStatusMessagePage />}
        />
      </Route>
    </Routes>
  );
}

export default WBAppRouter;
