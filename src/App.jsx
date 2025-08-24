import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BSignup from "./BSignup";
import Profile from "./Profile";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BSignup />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
