import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportAllData, importAllData } from '../store/store';

export default function HomePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('merge');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleExport = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fif-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ text: 'Export téléchargé!', type: 'success' });
  };

  const handleImport = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = importAllData(reader.result as string, mode);
        setMessage({
          text: `Import réussi (${mode === 'replace' ? 'remplacement' : 'fusion'}): ${result.spells} sorts, ${result.characters} personnages, ${result.monsters} monstres`,
          type: 'success',
        });
      } catch (err) {
        setMessage({ text: `Erreur: ${err instanceof Error ? err.message : 'Import échoué'}`, type: 'error' });
      }
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  };

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

      <section className="data-section">
        <h2>Données</h2>
        <p>Exporter ou importer l'intégralité des sorts, personnages et monstres en JSON.</p>

        <div className="form-row">
          <button className="btn btn-primary" onClick={handleExport}>Exporter (JSON)</button>

          <div className="import-group">
            <label className="mode-toggle">
              <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> Fusionner
            </label>
            <label className="mode-toggle">
              <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Remplacer
            </label>
            <button className="btn" onClick={handleImport}>Importer (JSON)</button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>
        </div>

        {message && (
          <p className={message.type === 'success' ? 'text-success' : 'text-danger'}>
            {message.text}
          </p>
        )}
      </section>
    </div>
  );
}
