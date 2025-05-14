import { BrowserRouter, Routes, Route } from "react-router-dom";
import UserRoutes from "./routes/userRoutes";
import AdminRoutes from "./routes/adminRoutes";
import MentorRoutes from "./routes/mentorRoutes";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="/mentor/*" element={<MentorRoutes />} />
        <Route path="/*" element={<UserRoutes />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
