import { Link } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="nav">
      <Link to="/" className="nav__brand" style={{ textDecoration: 'none' }}>
        <span>🗳️</span>
        <div>
          <div>Flower Mound Voter Guide</div>
          <div className="nav__tagline">November 2026 · Non-Partisan</div>
        </div>
      </Link>
    </nav>
  )
}
