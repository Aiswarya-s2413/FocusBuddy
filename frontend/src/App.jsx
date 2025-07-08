import { BrowserRouter, Routes, Route } from "react-router-dom";
import UserRoutes from "./routes/userRoutes";
import AdminRoutes from "./routes/adminRoutes";
import MentorRoutes from "./routes/mentorRoutes";
import ErrorBoundary from "./components/ErrorBoundary";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { hydrateUserFromLocalStorage } from "./store/userSlice";

function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(hydrateUserFromLocalStorage());
  }, [dispatch]);
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
