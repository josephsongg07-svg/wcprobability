import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Info,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
} from "lucide-react";
import { getGroupModel, groups, koreaSignals, marketNotes } from "./data.js";

const storageKey = "wcprobability-bracket-v1";
const bracketSlots = ["first", "second", "third", "fourth"];
const roundLabels = {
  round32: "R32",
  round16: "R16",
  quarterfinals: "QF",
  semifinals: "SF",
  final: "Final",
};

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

const getModelPick = (model) => {
  const byFirst = [...model.teams].sort((a, b) => model.odds[b.code].first - model.odds[a.code].first);
  const second = byFirst
    .slice(1)
    .sort((a, b) => model.odds[b.code].advance - model.odds[a.code].advance)[0];
  const third = byFirst
    .filter((team) => team.code !== byFirst[0]?.code && team.code !== second?.code)
    .sort((a, b) => model.odds[b.code].third - model.odds[a.code].third)[0];
  const fourth = byFirst.find(
    (team) => team.code !== byFirst[0]?.code && team.code !== second?.code && team.code !== third?.code,
  );

  return {
    first: byFirst[0]?.code,
    second: second?.code,
    third: third?.code,
    fourth: fourth?.code,
  };
};

const getTeamByCode = (model, code) => model.teams.find((team) => team.code === code);

const getGlobalTeam = (models, code) => models.flatMap((model) => model.teams).find((team) => team.code === code);

const makeBracketTeam = (models, model, code, source) => {
  const team = getTeamByCode(model, code);
  if (!team) return null;

  return {
    ...team,
    groupId: model.id,
    source,
    strength: model.odds[code]?.rating ?? team.adjustedSeed ?? 0,
    tiebreak: model.odds[code]?.advance ?? 0,
    model,
    globalTeam: getGlobalTeam(models, code) ?? team,
  };
};

const getQualifiers = (models, picks) => {
  const automatic = [];
  const thirdPool = [];

  models.forEach((model) => {
    const pick = picks[model.id] ?? {};
    const first = makeBracketTeam(models, model, pick.first, `Group ${model.id} winner`);
    const second = makeBracketTeam(models, model, pick.second, `Group ${model.id} runner-up`);
    const third = makeBracketTeam(models, model, pick.third, `Group ${model.id} 3rd-place pool`);

    if (first) automatic.push(first);
    if (second) automatic.push(second);
    if (third) thirdPool.push(third);
  });

  const sortedThirds = [...thirdPool].sort((a, b) => b.tiebreak - a.tiebreak || b.strength - a.strength);
  return {
    automatic,
    qualifiedThirds: sortedThirds.slice(0, 8),
    thirdPool: sortedThirds,
  };
};

const seedQualifiers = (qualifiers) =>
  [...qualifiers]
    .sort((a, b) => b.strength - a.strength || b.tiebreak - a.tiebreak)
    .map((team, index) => ({ ...team, bracketSeed: index + 1 }));

const makeMatches = (roundKey, entrants) => {
  const matches = [];
  for (let index = 0; index < entrants.length / 2; index += 1) {
    matches.push({
      id: `${roundKey}-${index}`,
      roundKey,
      teams: [entrants[index] ?? null, entrants[entrants.length - 1 - index] ?? null],
    });
  }
  return matches;
};

const pickWinners = (matches, knockoutPicks) =>
  matches.map((match) => {
    const selected = knockoutPicks[match.id];
    return match.teams.find((team) => team?.code === selected) ?? null;
  });

const buildKnockoutRounds = (models, picks, knockoutPicks) => {
  const { automatic, qualifiedThirds, thirdPool } = getQualifiers(models, picks);
  const seeded = seedQualifiers([...automatic, ...qualifiedThirds]);
  const padded = [...seeded, ...Array.from({ length: Math.max(0, 32 - seeded.length) }, () => null)];
  const round32 = makeMatches("round32", padded);
  const round16 = makeMatches("round16", pickWinners(round32, knockoutPicks));
  const quarterfinals = makeMatches("quarterfinals", pickWinners(round16, knockoutPicks));
  const semifinals = makeMatches("semifinals", pickWinners(quarterfinals, knockoutPicks));
  const final = makeMatches("final", pickWinners(semifinals, knockoutPicks));
  const champion = pickWinners(final, knockoutPicks)[0];

  return {
    champion,
    qualifiedCount: seeded.filter(Boolean).length,
    rounds: { round32, round16, quarterfinals, semifinals, final },
    thirdPool,
  };
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
      <div className="team-mark" style={{ borderColor: team.color }}>
        <img alt={`${team.name} flag`} src={team.flag} loading="lazy" />
        <span>{team.code}</span>
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
            <span>3rd-place pool {odds.third}%</span>
            {pickedSlot ? <span>Your pick: {pickedSlot}</span> : null}
          </div>
          <div className="pick-buttons">
            {bracketSlots.map((slot, index) => (
              <button
                className={pick?.[slot] === team.code ? "active" : ""}
                key={slot}
                type="button"
                onClick={() => onPick(groupId, slot, team.code)}
              >
                {index + 1}
                {index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function PickChip({ code, label, model, slot }) {
  const team = getTeamByCode(model, code);

  return (
    <div className={team ? "pick-chip filled" : "pick-chip"}>
      <span>{label}</span>
      {team ? (
        <>
          <img alt="" src={team.flag} loading="lazy" />
          <b>{team.code}</b>
        </>
      ) : (
        <b>Pick</b>
      )}
      <small>{slot}</small>
    </div>
  );
}

function GroupPickCard({ model, onPick, onSelect, pick }) {
  const complete = bracketSlots.every((slot) => pick?.[slot]);

  return (
    <article className={complete ? "all-group-card complete" : "all-group-card"}>
      <button className="group-card-head" type="button" onClick={onSelect}>
        <span>Group {model.id}</span>
        <strong>{model.title}</strong>
        {complete ? <CheckCircle2 size={18} /> : <Activity size={18} />}
      </button>
      <div className="quick-picks">
        {model.teams.map((team) => (
          <div className="quick-team" key={team.code}>
            <button className="quick-team-name" type="button" onClick={onSelect}>
              <img alt="" src={team.flag} loading="lazy" />
              <span>{team.code}</span>
            </button>
            <div className="quick-buttons" aria-label={`${team.name} pick buttons`}>
              {bracketSlots.map((slot, index) => (
                <button
                  className={pick?.[slot] === team.code ? "active" : ""}
                  key={slot}
                  type="button"
                  onClick={() => onPick(model.id, slot, team.code)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="card-picks">
        <PickChip code={pick?.first} label="1st" model={model} slot={`${pick?.first ? model.odds[pick.first].first : 0}%`} />
        <PickChip code={pick?.second} label="2nd" model={model} slot={`${pick?.second ? model.odds[pick.second].advance : 0}%`} />
        <PickChip code={pick?.third} label="3rd" model={model} slot={`${pick?.third ? model.odds[pick.third].third : 0}%`} />
        <PickChip code={pick?.fourth} label="4th" model={model} slot="out" />
      </div>
    </article>
  );
}

function LiveBracket({ models, picks, score }) {
  return (
    <aside className="live-bracket" aria-label="Live bracket preview">
      <div className="live-bracket-head">
        <div>
          <p className="eyebrow">Live bracket</p>
          <h2>Changes as you pick</h2>
        </div>
        <strong>{score} pts</strong>
      </div>
      <div className="bracket-lanes">
        {models.map((model) => {
          const pick = picks[model.id] ?? {};

          return (
            <div className="bracket-lane" key={model.id}>
              <span>Group {model.id}</span>
              <PickChip code={pick.first} label="1" model={model} slot="winner" />
              <PickChip code={pick.second} label="2" model={model} slot="auto" />
              <PickChip code={pick.third} label="3" model={model} slot="pool" />
              <PickChip code={pick.fourth} label="4" model={model} slot="out" />
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function BracketTeamButton({ match, onPick, team, winnerCode }) {
  if (!team) {
    return (
      <button className="bracket-team empty" type="button" disabled>
        <span>TBD</span>
        <small>{match.roundKey === "round32" ? "make group picks" : "pick prior winner"}</small>
      </button>
    );
  }

  return (
    <button
      className={winnerCode === team.code ? "bracket-team active" : "bracket-team"}
      type="button"
      onClick={() => onPick(match.id, team.code)}
    >
      <span>
        <img alt="" src={team.flag} loading="lazy" />
        <b>{team.code}</b>
      </span>
      <small>
        #{team.bracketSeed ?? "-"} · {team.source}
      </small>
    </button>
  );
}

function KnockoutBracket({ knockoutPicks, models, onClear, onPick, picks }) {
  const bracket = useMemo(() => buildKnockoutRounds(models, picks, knockoutPicks), [knockoutPicks, models, picks]);
  const qualifiedThirdCodes = new Set(bracket.thirdPool.slice(0, 8).map((team) => team.code));

  return (
    <section className="knockout-board" aria-label="Interactive knockout bracket">
      <div className="knockout-head">
        <div>
          <p className="eyebrow">Interactive bracket</p>
          <h2>Click winners through the knockout rounds</h2>
        </div>
        <div className="knockout-actions">
          <div>
            <span>Qualified</span>
            <strong>{bracket.qualifiedCount}/32</strong>
          </div>
          <button type="button" onClick={onClear}>
            Clear knockout
          </button>
        </div>
      </div>

      <div className="knockout-scroll">
        <div className="knockout-rounds">
          {Object.entries(bracket.rounds).map(([roundKey, matches]) => (
            <div className="knockout-round" key={roundKey}>
              <h3>{roundLabels[roundKey]}</h3>
              <div className="knockout-matches">
                {matches.map((match, index) => (
                  <article className="knockout-match" key={match.id}>
                    <span className="match-label">
                      {roundLabels[roundKey]} {index + 1}
                    </span>
                    {match.teams.map((team, teamIndex) => (
                      <BracketTeamButton
                        key={`${match.id}-${team?.code ?? teamIndex}`}
                        match={match}
                        onPick={onPick}
                        team={team}
                        winnerCode={knockoutPicks[match.id]}
                      />
                    ))}
                  </article>
                ))}
              </div>
            </div>
          ))}
          <div className="champion-card">
            <p className="eyebrow">Champion</p>
            {bracket.champion ? (
              <>
                <img alt="" src={bracket.champion.flag} loading="lazy" />
                <strong>{bracket.champion.name}</strong>
                <span>{bracket.champion.source}</span>
              </>
            ) : (
              <>
                <Trophy size={34} />
                <strong>TBD</strong>
                <span>Pick the final winner</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="third-pool-strip" aria-label="Third-place pool">
        <span>3rd-place pool</span>
        {bracket.thirdPool.map((team, index) => (
          <div className={qualifiedThirdCodes.has(team.code) ? "pool-team in" : "pool-team out"} key={team.code}>
            <img alt="" src={team.flag} loading="lazy" />
            <b>{team.code}</b>
            <small>{qualifiedThirdCodes.has(team.code) ? `in #${index + 1}` : "out"}</small>
          </div>
        ))}
      </div>
    </section>
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
  const [knockoutPicks, setKnockoutPicks] = useState({});
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
        return bracketSlots.every((slot) => groupPick?.[slot]);
      }).length,
    [allModels, picks],
  );
  const score = useMemo(() => scorePicks(picks, allModels), [allModels, picks]);
  const shareLink = useMemo(() => {
    const payload = { knockoutPicks, playerName, picks };
    const base = typeof window === "undefined" ? "https://wcprobability.com" : window.location.origin;
    return `${base}/?bracket=${encodeBracket(payload)}`;
  }, [knockoutPicks, picks, playerName]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("bracket");
    if (shared) {
      const decoded = decodeBracket(shared);
      if (decoded?.picks) {
        setPicks(decoded.picks);
        setKnockoutPicks(decoded.knockoutPicks ?? {});
        setPlayerName(decoded.playerName ? `${decoded.playerName}'s bracket` : "");
      }
    }

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (!shared && saved.picks) {
      setPicks(saved.picks);
      setKnockoutPicks(saved.knockoutPicks ?? {});
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
        knockoutPicks,
        picks,
        playerName,
        registered,
      }),
    );
  }, [knockoutPicks, leaderboard, picks, playerName, registered]);

  const handlePick = (groupId, slot, code) => {
    setPicks((current) => {
      const groupPick = { ...(current[groupId] ?? {}) };
      for (const key of bracketSlots) {
        if (groupPick[key] === code) delete groupPick[key];
      }
      groupPick[slot] = code;
      return {
        ...current,
        [groupId]: groupPick,
      };
    });
    setKnockoutPicks({});
  };

  const handleAutoFill = () => {
    setPicks(Object.fromEntries(allModels.map((groupModel) => [groupModel.id, getModelPick(groupModel)])));
    setKnockoutPicks({});
  };

  const handleClear = () => {
    setPicks({});
    setKnockoutPicks({});
    setRegistered(false);
  };

  const handleKnockoutPick = (matchId, code) => {
    setKnockoutPicks((current) => {
      const next = { ...current };
      if (next[matchId] === code) {
        delete next[matchId];
      } else {
        next[matchId] = code;
      }
      return next;
    });
  };

  const handleClearKnockout = () => {
    setKnockoutPicks({});
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
            <h1>Build the whole bracket from one screen.</h1>
            <p className="lede">
              Pick every group at once, watch the live bracket change, register a username,
              and send the result to friends.
            </p>
            <div className="hero-actions">
              <button type="button" onClick={handleAutoFill}>
                <Sparkles size={18} />
                Model autofill
              </button>
              <button type="button" onClick={handleClear}>
                <RotateCcw size={18} />
                Clear picks
              </button>
            </div>
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

          <KnockoutBracket
            knockoutPicks={knockoutPicks}
            models={allModels}
            onClear={handleClearKnockout}
            onPick={handleKnockoutPick}
            picks={picks}
          />
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

      <section className="group-builder content-band">
        <div className="section-head">
          <div>
            <p className="eyebrow">All groups at once</p>
            <h2>Fast Bracket Builder</h2>
          </div>
          <span>Tap 1 / 2 / 3 / 4 for every group</span>
        </div>
        <div className="all-groups-grid">
          {allModels.map((groupModel) => (
            <GroupPickCard
              key={groupModel.id}
              model={groupModel}
              onPick={handlePick}
              onSelect={() => setSelectedGroup(groupModel.id)}
              pick={picks[groupModel.id]}
            />
          ))}
        </div>
      </section>

      <section className="group-control content-band">
        <div className="section-head">
          <div>
            <p className="eyebrow">Deep dive</p>
            <h2>Group {model.id} Probability Board</h2>
          </div>
          <span>{model.title}</span>
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
        <div className="bracket-panel detail-panel" aria-label={`Group ${model.id} bracket preview`}>
          <div className="bracket-title">
            <div>
              <p>{model.title}</p>
              <h2>Group {model.id} Team Cards</h2>
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
