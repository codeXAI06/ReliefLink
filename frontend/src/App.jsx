import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import LanguageSelector from './components/LanguageSelector';
import Home from './pages/Home';
import RequestHelp from './pages/RequestHelp';
import Feed from './pages/Feed';
import MapView from './pages/MapView';
import HelperDashboard from './pages/HelperDashboard';
import RequestDetail from './pages/RequestDetail';
import Login from './pages/Login';
import Signup from './pages/Signup';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <LanguageSelector />
            <Header />
            <main className="pb-20">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/request" element={<RequestHelp />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/helper" element={<HelperDashboard />} />
                <Route path="/request/:id" element={<RequestDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
