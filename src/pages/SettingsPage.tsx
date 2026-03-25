import { useState, useEffect } from 'react';
import type { ScalingSettings } from '../models/types';
import { DEFAULT_SETTINGS } from '../models/types';
import { getSettings, saveSettings } from '../store/store';

const FIELDS: { key: keyof ScalingSettings; label: string; step?: number }[] = [
  { key: 'defenseCap', label: 'Cap réduction défense (0-1)', step: 0.05 },
  { key: 'cooldownCap', label: 'Cap réduction cooldown (0-1)', step: 0.05 },
  { key: 'passBaseDuration', label: 'Durée base passer (UT)' },
  { key: 'passMinDuration', label: 'Durée min passer (UT)' },
  { key: 'rageGainMultiplier', label: 'Multiplicateur gain rage' },
  { key: 'rageMax', label: 'Rage max' },
  { key: 'weatherMinInterval', label: 'Météo: intervalle min (UT)' },
  { key: 'weatherMaxInterval', label: 'Météo: intervalle max (UT)' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<ScalingSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setSettings(getSettings()); }, []);

  const upd = (key: keyof ScalingSettings, val: string) => {
    setSettings({ ...settings, [key]: parseFloat(val) || 0 });
    setSaved(false);
  };

  const save = () => { saveSettings(settings); setSaved(true); };
  const reset = () => { setSettings({ ...DEFAULT_SETTINGS }); setSaved(false); };

  return (
    <div className="page">
      <h1>Réglages de Scaling</h1>
      <div className="settings-form">
        {FIELDS.map(f => (
          <label key={f.key} className="stat-row">
            <span className="stat-label">{f.label}</span>
            <input
              type="number"
              step={f.step ?? 1}
              value={settings[f.key]}
              onChange={e => upd(f.key, e.target.value)}
            />
          </label>
        ))}
        <div className="form-actions">
          <button className="btn btn-primary" onClick={save}>Sauvegarder</button>
          <button className="btn" onClick={reset}>Réinitialiser</button>
          {saved && <span className="text-success">Sauvegardé!</span>}
        </div>
      </div>
    </div>
  );
}
