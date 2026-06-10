import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Info,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { getGroupModel, groups, koreaSignals, marketNotes } from "./data.js";

const storageKey = "wcprobability-bracket-v1";

const scorePicks = (picks, models) =>
  models.reduce((total, model) => {
    const groupPick = picks[model.id] ?? {};
    return (
      total +
      (groupPick.first ? model.odds[groupPick.first]?.first ?? 0 : 0) +
      (groupPick.second ? Math.round((model.odds[groupPick.second]?.advance ?? 0) * 0.72) : 0) +
      (groupPick.third ? Math.round((model.odds[groupPick.third]?.third ?? 0) * 0.45) : 0)
    );
  }, 0);

const encodeBracket = (payload) => btoa(encodeURIComponent(JSON.stringify(payload)));

const decodeBracket = (value) => {
  try {
    return JSON.parse(decodeURIComponent(atob(value)));
  } catch {
    return null;
  }
};

function ProbabilityBar({ rows, teamByCode }) {
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

function TeamRow({ groupId, odds, onPick, pick, team }) {
  const adjustmentLabel = odds.adjustment > 0 ? `+${odds.adjustment}` : `${odds.adjustment}`;
  const pickedSlot = Object.entries(pick ?? {}).find(([, code]) => code === team.code)?.[0];

  return (
    <article className={pickedSlot ? "team-row picked" : "team-row"}>
      <div className="team-mark" style={{ background: team.color }}>
        {team.code}
      </div>
      <div className="team-main">
        <div className="team-name-line">
          <h3>{team.name}</h3>
          <span>FIFA #{team.rank}</span>
        </div>
        <div className="rating-line">
          <span>{team.confed}</span>
          <span>{team.scheduleContext}</span>
          <span>Adj rating {odds.rating} ({adjustmentLabel})</span>
        </div>
        <p>{team.profile}</p>
        <div className="team-odds">
          <div className="market-bars">
            <label>
              Advance
              <span>{odds.advance}%</span>
            </label>
            <meter min="0" max="100" value={odds.advance} />
          </div>
          <div className="micro-odds">
            <span>Win group {odds.first}%</span>
            <span>3rd lane {odds.third}%</span>
            {pickedSlot ? <span>Your pick: {pickedSlot}</span> : null}
          </div>
          <div className="pick-buttons">
            <button
              className={pick?.first === team.code ? "active" : ""}
              type="button"
              onClick={() => onPick(groupId, "first", team.code)}
            >
              1st
            </button>
            <button
              className={pick?.second === team.code ? "active" : ""}
              type="button"
              onClick={() => onPick(groupId, "second", team.code)}
            >
              2nd
            </button>
            <button
              className={pick?.third === team.code ? "active" : ""}
              type="button"
              onClick={() => onPick(groupId, "third", team.code)}
            >
              3rd
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function FixtureCard({ fixture, teamByCode }) {
  return (
    <article className="fixture-card">
      <div className="fixture-head">
        <div>
          <p>
            {fixture.date} · {fixture.venue}
          </p>
          <h3>{fixture.match}</h3>
        </div>
        <span>{fixture.note}</span>
      </div>
      <ProbabilityBar rows={fixture.probs} teamByCode={teamByCode} />
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

function GroupButton({ active, group, model, onClick }) {
  const favorite = [...model.teams].sort((a, b) => model.odds[b.code].first - model.odds[a.code].first)[0];

  return (
    <button className={active ? "group-tab active" : "group-tab"} type="button" onClick={onClick}>
      <span>Group {group.id}</span>
      <b>{favorite.code}</b>
    </button>
  );
}

function GroupSummary({ model, onSelect }) {
  const favorite = [...model.teams].sort((a, b) => model.odds[b.code].first - model.odds[a.code].first)[0];
  const second = [...model.teams].sort((a, b) => model.odds[b.code].advance - model.odds[a.code].advance)[1];

  return (
    <button className="group-summary" type="button" onClick={onSelect}>
      <span>Group {model.id}</span>
      <strong>{favorite.name}</strong>
      <small>
        Favorite {model.odds[favorite.code].first}% · rating {model.odds[favorite.code].rating} · next{" "}
        {second.code} {model.odds[second.code].advance}%
      </small>
    </button>
  );
}

function CreatorPanel({
  completedGroups,
  leaderboard,
  onRegister,
  onShare,
  playerName,
  registered,
  score,
  setPlayerName,
  shareLink,
}) {
  return (
    <section className="creator-panel" aria-label="Create bracket">
      <div className="creator-main">
        <div>
          <p className="eyebrow">Create your bracket</p>
          <h2>Register, make picks, share the link.</h2>
        </div>
        <div className="register-row">
          <input
            aria-label="Username"
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="username"
            value={playerName}
          />
          <button type="button" onClick={onRegister}>
            {registered ? "Registered" : "Register"}
          </button>
        </div>
      </div>

      <div className="creator-stats">
        <div>
          <span>Groups picked</span>
          <strong>{completedGroups}/12</strong>
        </div>
        <div>
          <span>Model score</span>
          <strong>{score}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{registered ? "Live entry" : "Draft"}</strong>
        </div>
      </div>

      <div className="share-row">
        <input aria-label="Share link" readOnly value={shareLink} />
        <button type="button" onClick={onShare}>
          Share
        </button>
      </div>

      <div className="leaderboard-strip">
        {leaderboard.slice(0, 4).map((entry, index) => (
          <div key={`${entry.name}-${entry.createdAt}`}>
            <span>#{index + 1}</span>
            <strong>{entry.name}</strong>
            <small>{entry.score} pts</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [selectedGroup, setSelectedGroup] = useState("A");
  const [playerName, setPlayerName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [picks, setPicks] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const model = useMemo(() => getGroupModel(selectedGroup), [selectedGroup]);
  const allModels = useMemo(() => groups.map((group) => getGroupModel(group.id)), []);
  const teamByCode = useMemo(
    () => Object.fromEntries(model.teams.map((team) => [team.code, team])),
    [model],
  );
  const topTeam = [...model.teams].sort((a, b) => model.odds[b.code].first - model.odds[a.code].first)[0];
  const swingFixture = model.fixtures
    .map((fixture) => ({
      ...fixture,
      spread: Math.abs(fixture.probs[0][1] - fixture.probs[2][1]),
    }))
    .sort((a, b) => a.spread - b.spread)[0];
  const completedGroups = useMemo(
    () =>
      allModels.filter((groupModel) => {
        const groupPick = picks[groupModel.id];
        return groupPick?.first && groupPick?.second;
      }).length,
    [allModels, picks],
  );
  const score = useMemo(() => scorePicks(picks, allModels), [allModels, picks]);
  const shareLink = useMemo(() => {
    const payload = { playerName, picks };
    const base = typeof window === "undefined" ? "https://wcprobability.com" : window.location.origin;
    return `${base}/?bracket=${encodeBracket(payload)}`;
  }, [picks, playerName]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("bracket");
    if (shared) {
      const decoded = decodeBracket(shared);
      if (decoded?.picks) {
        setPicks(decoded.picks);
        setPlayerName(decoded.playerName ? `${decoded.playerName}'s bracket` : "");
      }
    }

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (!shared && saved.picks) {
      setPicks(saved.picks);
      setPlayerName(saved.playerName ?? "");
      setRegistered(Boolean(saved.registered));
    }
    setLeaderboard(saved.leaderboard ?? []);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        leaderboard,
        picks,
        playerName,
        registered,
      }),
    );
  }, [leaderboard, picks, playerName, registered]);

  const handlePick = (groupId, slot, code) => {
    setPicks((current) => {
      const groupPick = { ...(current[groupId] ?? {}) };
      for (const key of ["first", "second", "third"]) {
        if (groupPick[key] === code) delete groupPick[key];
      }
      groupPick[slot] = code;
      return {
        ...current,
        [groupId]: groupPick,
      };
    });
  };

  const handleRegister = () => {
    const cleanName = playerName.trim() || "anonymous";
    const entry = {
      completedGroups,
      createdAt: Date.now(),
      name: cleanName,
      score,
    };
    setPlayerName(cleanName);
    setRegistered(true);
    setLeaderboard((current) =>
      [entry, ...current.filter((item) => item.name.toLowerCase() !== cleanName.toLowerCase())]
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
    );
  };

  const handleShare = async () => {
    const text = `My World Cup bracket: ${shareLink}`;
    if (navigator.share) {
      await navigator.share({ title: "WC Probability bracket", text, url: shareLink });
      return;
    }
    await navigator.clipboard.writeText(shareLink);
  };

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
            <p className="eyebrow">2026 adjusted group-stage probability board</p>
            <h1>Create a bracket priced like a market.</h1>
            <p className="lede">
              Pick every group from the opening stage, register a username, track an estimated score,
              and send your bracket to friends.
            </p>
            <div className="hero-metrics">
              <div>
                <span>Your progress</span>
                <strong>{completedGroups}/12</strong>
              </div>
              <div>
                <span>Group favorite</span>
                <strong>{topTeam.name}</strong>
              </div>
              <div>
                <span>Swing match</span>
                <strong>{swingFixture.probs[0][0]}-{swingFixture.probs[2][0]}</strong>
              </div>
            </div>
          </div>

          <div className="bracket-panel" aria-label={`Group ${model.id} bracket preview`}>
            <div className="bracket-title">
              <div>
                <p>{model.title}</p>
                <h2>Group {model.id} Probability Board</h2>
              </div>
              <Activity size={22} />
            </div>
            <p className="group-note">{model.note}</p>
            <div className="team-list">
              {model.teams.map((team) => (
                <TeamRow
                  groupId={model.id}
                  odds={model.odds[team.code]}
                  onPick={handlePick}
                  pick={picks[model.id]}
                  team={team}
                  key={team.code}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="content-band">
        <CreatorPanel
          completedGroups={completedGroups}
          leaderboard={leaderboard}
          onRegister={handleRegister}
          onShare={handleShare}
          playerName={playerName}
          registered={registered}
          score={score}
          setPlayerName={setPlayerName}
          shareLink={shareLink}
        />
      </section>

      <section className="group-control content-band">
        <div className="section-head">
          <div>
            <p className="eyebrow">All groups</p>
            <h2>Jump Between Groups A-L</h2>
          </div>
          <span>Schedule-adjusted v0.3</span>
        </div>
        <div className="group-tabs" aria-label="Select group">
          {allModels.map((groupModel) => (
            <GroupButton
              active={groupModel.id === selectedGroup}
              group={groupModel}
              key={groupModel.id}
              model={groupModel}
              onClick={() => setSelectedGroup(groupModel.id)}
            />
          ))}
        </div>
      </section>

      <section className="content-band">
        <div className="section-head">
          <div>
            <p className="eyebrow">Match cards</p>
            <h2>Group {model.id} Prices</h2>
          </div>
          <span>{model.fixtures.length} group matches</span>
        </div>
        <div className="fixture-grid">
          {model.fixtures.map((fixture) => (
            <FixtureCard fixture={fixture} key={fixture.match} teamByCode={teamByCode} />
          ))}
        </div>
      </section>

      <section className="content-band">
        <div className="section-head">
          <div>
            <p className="eyebrow">Tournament view</p>
            <h2>Projected Group Favorites</h2>
          </div>
          <span>Tap a group to load its board</span>
        </div>
        <div className="summary-grid">
          {allModels.map((groupModel) => (
            <GroupSummary
              key={groupModel.id}
              model={groupModel}
              onSelect={() => setSelectedGroup(groupModel.id)}
            />
          ))}
        </div>
      </section>

      <section className="analysis-grid">
        <div className="korea-card">
          <div className="section-head compact">
            <div>
              <p className="eyebrow">Korea card</p>
              <h2>Where Group A is nervous</h2>
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
              <h2>What changed</h2>
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
