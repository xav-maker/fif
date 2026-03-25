import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SpellEditorPage from './pages/SpellEditorPage';
import CharacterEditorPage from './pages/CharacterEditorPage';
import MonsterEditorPage from './pages/MonsterEditorPage';
import SettingsPage from './pages/SettingsPage';
import CombatSetupPage from './pages/CombatSetupPage';
import CombatPage from './pages/CombatPage';

export default function App() {
  return (
    <HashRouter>
      <nav className="top-nav">
        <Link to="/" className="nav-brand">fif</Link>
        <div className="nav-links">
          <Link to="/spells">Sorts</Link>
          <Link to="/characters">Personnages</Link>
          <Link to="/monsters">Monstres</Link>
          <Link to="/settings">Réglages</Link>
          <Link to="/combat-setup">Combat</Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/spells" element={<SpellEditorPage />} />
        <Route path="/characters" element={<CharacterEditorPage />} />
        <Route path="/monsters" element={<MonsterEditorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/combat-setup" element={<CombatSetupPage />} />
        <Route path="/combat" element={<CombatPage />} />
      </Routes>
    </HashRouter>
  );
}
