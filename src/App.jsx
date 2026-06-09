import React from "react";
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Info,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { fixtures, koreaSignals, marketNotes, teams } from "./data.js";

const teamByCode = Object.fromEntries(teams.map((team) => [team.code, team]));

function ProbabilityBar({ rows }) {
  return (
    <div className="prob-stack" aria-label="match probabilities">
      <div className="prob-track">
        {rows.map(([label, value]) => {
          const team = teamByCode[label];
          return (
            <span
              className="prob-segment"
              key={label}
              style={{
                width: `${value}%`,
                background: team?.color ?? "#8b95a7",
              }}
              title={`${label}: ${value}%`}
            />
          );
        })}
      </div>
      <div className="prob-labels">
        {rows.map(([label, value]) => (
          <span key={label}>
            {label} <b>{value}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamRow({ team }) {
  return (
    <article className="team-row">
      <div className="team-mark" style={{ background: team.color }}>
        {team.code}
      </div>
      <div className="team-main">
        <div className="team-name-line">
          <h3>{team.name}</h3>
          <span>FIFA #{team.rank}</span>
        </div>
        <p>{team.profile}</p>
        <div className="market-bars">
          <label>
            Advance
            <span>{team.odds.advance}%</span>
          </label>
          <meter min="0" max="100" value={team.odds.advance} />
        </div>
      </div>
    </article>
  );
}

function FixtureCard({ fixture }) {
  return (
    <article className="fixture-card">
      <div className="fixture-head">
        <div>
          <p>{fixture.date} · {fixture.venue}</p>
          <h3>{fixture.match}</h3>
        </div>
        <span>{fixture.note}</span>
      </div>
      <ProbabilityBar rows={fixture.probs} />
    </article>
  );
}

function Signal({ signal }) {
  return (
    <div className={`signal ${signal.tone}`}>
      <div className="signal-top">
        <span>{signal.label}</span>
        <b>{signal.value}</b>
      </div>
      <meter min="0" max="100" value={signal.value} />
    </div>
  );
}

function App() {
  return (
    <main>
      <section className="hero">
        <nav>
          <div className="brand">
            <span className="brand-icon">WC</span>
            <span>Probability</span>
          </div>
          <div className="nav-actions">
            <button type="button" aria-label="Open market view" title="Market view">
              <BarChart3 size={18} />
            </button>
            <button type="button" aria-label="Open scoring" title="Scoring">
              <Trophy size={18} />
            </button>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">2026 Group A public-data prototype</p>
            <h1>Build the bracket like a market.</h1>
            <p className="lede">
              A World Cup bracket game where every pick carries a probability,
              an upset price, and a quick reason why.
            </p>
            <div className="hero-metrics">
              <div>
                <span>Korea advance</span>
                <strong>61%</strong>
              </div>
              <div>
                <span>Group favorite</span>
                <strong>Mexico</strong>
              </div>
              <div>
                <span>Swing match</span>
                <strong>KOR-CZE</strong>
              </div>
            </div>
          </div>

          <div className="bracket-panel" aria-label="Group A bracket preview">
            <div className="bracket-title">
              <div>
                <p>Group A</p>
                <h2>Probability Board</h2>
              </div>
              <Activity size={22} />
            </div>
            <div className="team-list">
              {teams.map((team) => (
                <TeamRow team={team} key={team.code} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="section-head">
          <div>
            <p className="eyebrow">Match cards</p>
            <h2>Group A Prices</h2>
          </div>
          <span>Static public-data v0.1</span>
        </div>
        <div className="fixture-grid">
          {fixtures.map((fixture) => (
            <FixtureCard fixture={fixture} key={fixture.match} />
          ))}
        </div>
      </section>

      <section className="analysis-grid">
        <div className="korea-card">
          <div className="section-head compact">
            <div>
              <p className="eyebrow">Korea card</p>
              <h2>Where the model is nervous</h2>
            </div>
            <ShieldAlert size={24} />
          </div>
          <div className="signal-grid">
            {koreaSignals.map((signal) => (
              <Signal signal={signal} key={signal.label} />
            ))}
          </div>
        </div>

        <div className="notes-panel">
          <div className="section-head compact">
            <div>
              <p className="eyebrow">Model notes</p>
              <h2>Why this is playable</h2>
            </div>
            <Info size={24} />
          </div>
          <ul>
            {marketNotes.map((note) => (
              <li key={note}>
                <CircleDollarSign size={17} />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

export default App;
