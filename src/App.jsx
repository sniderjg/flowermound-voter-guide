import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import CandidateDetail from './pages/CandidateDetail'
import './App.css'

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>
      <Nav />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/results" element={<Results />} />
          <Route path="/candidate/:name" element={<CandidateDetail />} />
        </Routes>
      </main>
      <footer style={{
        textAlign: 'center',
        padding: '1.5rem',
        fontSize: '.8rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border)',
        background: '#fff'
      }}>
        Flower Mound Voter Guide · Non-partisan · November 2026 ·
        Data last updated June 2026 · <a href="mailto:hello@flowermoundvotes.com">Contact</a>
      </footer>
    </div>
  )
}
