import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Header from "./components/Header"
import Footer from "./components/Footer"
import IntroPage from "./pages/IntroPage"
import ExploreDataPage from "./pages/ExploreDataPage"
import PredictionPage from "./pages/PredictionPage"
import "./App.css"

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<IntroPage />} />
            <Route path="/explore" element={<ExploreDataPage />} />
            <Route path="/prediction" element={<PredictionPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
