import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="page home-page">
      <h1>Simulateur de Combat</h1>
      <p>Prototype de test des mécaniques de combat au tour par tour.</p>
      <nav className="home-nav">
        <Link to="/spells" className="nav-card">
          <h2>Sorts</h2>
          <p>Créer et modifier les sorts</p>
        </Link>
        <Link to="/characters" className="nav-card">
          <h2>Personnages</h2>
          <p>Créer et modifier les personnages</p>
        </Link>
        <Link to="/monsters" className="nav-card">
          <h2>Monstres</h2>
          <p>Créer et modifier les monstres</p>
        </Link>
        <Link to="/settings" className="nav-card">
          <h2>Réglages</h2>
          <p>Paramètres de scaling</p>
        </Link>
        <Link to="/combat-setup" className="nav-card nav-card-accent">
          <h2>Combat</h2>
          <p>Lancer une simulation</p>
        </Link>
      </nav>
    </div>
  );
}
