import { Link, useLocation } from "react-router-dom"

function Header() {
  const location = useLocation()

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <h1>Wave Power Potential</h1>
          </Link>
        </div>
        <nav className="main-nav">
          <ul>
            <li className={location.pathname === "/" ? "active" : ""}>
              <Link to="/">Home</Link>
            </li>
            <li className={location.pathname === "/explore" ? "active" : ""}>
              <Link to="/explore">Explore Data</Link>
            </li>
            <li className={location.pathname === "/prediction" ? "active" : ""}>
              <Link to="/prediction">Prediction</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header
