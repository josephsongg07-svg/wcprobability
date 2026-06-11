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
import { getGroupModel, getTeamSignals, groups, marketNotes } from "./data.js";

const storageKey = "wcprobability-bracket-v1";
const bracketSlots = ["first", "second", "third", "fourth"];
const roundLabels = {
  round32: "Round of 32",
  round16: "Round of 16",
  quarterfinals: "Quarter final",
  semifinals: "Semi final",
  final: "Final",
};

const shortRoundLabels = {
  round32: "R32",
  round16: "R16",
  quarterfinals: "QF",
  semifinals: "SF",
  final: "Final",
};

const roundScoring = {
  round32: 8,
  round16: 12,
  quarterfinals: 18,
  semifinals: 26,
  final: 40,
};

const scoreGroupPicks = (picks, models) =>
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
  const finishScore = (team) => {
    const odds = model.odds[team.code];
    return odds.first * 1 + odds.second * 2 + odds.third * 3 + odds.fourth * 4;
  };
  const ordered = [...model.teams].sort(
    (a, b) =>
      finishScore(a) - finishScore(b) ||
      model.odds[b.code].expectedPoints - model.odds[a.code].expectedPoints ||
      model.odds[b.code].rating - model.odds[a.code].rating,
  );

  return {
    first: ordered[0]?.code,
    second: ordered[1]?.code,
    third: ordered[2]?.code,
    fourth: ordered[3]?.code,
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

const getQualifiers = (models, picks, thirdPoolOverrides = {}) => {
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
  const forcedIn = sortedThirds.filter((team) => thirdPoolOverrides[team.code] === "in");
  const autoEligible = sortedThirds.filter(
    (team) => thirdPoolOverrides[team.code] !== "in" && thirdPoolOverrides[team.code] !== "out",
  );
  return {
    automatic,
    qualifiedThirds: [...forcedIn, ...autoEligible].slice(0, 8),
    thirdPool: sortedThirds,
  };
};

const fifaRound32Slots = [
  { matchNo: 73, slots: [{ finish: "second", groupId: "A" }, { finish: "second", groupId: "B" }] },
  { matchNo: 75, slots: [{ finish: "first", groupId: "F" }, { finish: "second", groupId: "C" }] },
  { matchNo: 74, slots: [{ finish: "first", groupId: "E" }, { finish: "third", eligibleGroups: ["A", "B", "C", "D", "F"] }] },
  { matchNo: 77, slots: [{ finish: "first", groupId: "I" }, { finish: "third", eligibleGroups: ["C", "D", "F", "G", "H"] }] },
  { matchNo: 83, slots: [{ finish: "second", groupId: "K" }, { finish: "second", groupId: "L" }] },
  { matchNo: 84, slots: [{ finish: "first", groupId: "H" }, { finish: "second", groupId: "J" }] },
  { matchNo: 81, slots: [{ finish: "first", groupId: "D" }, { finish: "third", eligibleGroups: ["B", "E", "F", "I", "J"] }] },
  { matchNo: 82, slots: [{ finish: "first", groupId: "G" }, { finish: "third", eligibleGroups: ["A", "E", "H", "I", "J"] }] },
  { matchNo: 76, slots: [{ finish: "first", groupId: "C" }, { finish: "second", groupId: "F" }] },
  { matchNo: 78, slots: [{ finish: "second", groupId: "E" }, { finish: "second", groupId: "I" }] },
  { matchNo: 79, slots: [{ finish: "first", groupId: "A" }, { finish: "third", eligibleGroups: ["C", "E", "F", "H", "I"] }] },
  { matchNo: 80, slots: [{ finish: "first", groupId: "L" }, { finish: "third", eligibleGroups: ["E", "H", "I", "J", "K"] }] },
  { matchNo: 86, slots: [{ finish: "first", groupId: "J" }, { finish: "second", groupId: "H" }] },
  { matchNo: 88, slots: [{ finish: "second", groupId: "D" }, { finish: "second", groupId: "G" }] },
  { matchNo: 85, slots: [{ finish: "first", groupId: "B" }, { finish: "third", eligibleGroups: ["E", "F", "G", "I", "J"] }] },
  { matchNo: 87, slots: [{ finish: "first", groupId: "K" }, { finish: "third", eligibleGroups: ["D", "E", "I", "J", "L"] }] },
];

const fifaNextRoundSlots = {
  round16: [
    { matchNo: 89, sourceMatches: [73, 75] },
    { matchNo: 90, sourceMatches: [74, 77] },
    { matchNo: 93, sourceMatches: [83, 84] },
    { matchNo: 94, sourceMatches: [81, 82] },
    { matchNo: 91, sourceMatches: [76, 78] },
    { matchNo: 92, sourceMatches: [79, 80] },
    { matchNo: 95, sourceMatches: [86, 88] },
    { matchNo: 96, sourceMatches: [85, 87] },
  ],
  quarterfinals: [
    { matchNo: 97, sourceMatches: [89, 90] },
    { matchNo: 98, sourceMatches: [93, 94] },
    { matchNo: 99, sourceMatches: [91, 92] },
    { matchNo: 100, sourceMatches: [95, 96] },
  ],
  semifinals: [
    { matchNo: 101, sourceMatches: [97, 98] },
    { matchNo: 102, sourceMatches: [99, 100] },
  ],
  final: [{ matchNo: 104, sourceMatches: [101, 102] }],
};

const finishLabels = {
  first: "winner",
  second: "runner-up",
  third: "3rd place",
};

const makeFifaMatch = (roundKey, matchNo, teams, sourceMatches = []) => ({
  id: `${roundKey}-${matchNo}`,
  matchNo,
  roundKey,
  sourceMatches,
  teams,
});

const getPickedGroupTeam = (models, picks, groupId, finish) => {
  const model = models.find((item) => item.id === groupId);
  if (!model) return null;
  const code = picks[groupId]?.[finish];
  return makeBracketTeam(models, model, code, `Group ${groupId} ${finishLabels[finish]}`);
};

const assignThirdPlaceSlots = (thirdPlaceSlots, qualifiedThirds) => {
  const orderedSlotIndexes = thirdPlaceSlots
    .map((slot, index) => ({ ...slot, index }))
    .sort((a, b) => a.eligibleGroups.length - b.eligibleGroups.length || a.index - b.index);
  const assignment = {};
  const usedCodes = new Set();

  const backtrack = (slotIndex) => {
    if (slotIndex === orderedSlotIndexes.length) return true;
    const slot = orderedSlotIndexes[slotIndex];
    const candidates = qualifiedThirds.filter(
      (team) => slot.eligibleGroups.includes(team.groupId) && !usedCodes.has(team.code),
    );

    for (const team of candidates) {
      assignment[slot.index] = team;
      usedCodes.add(team.code);
      if (backtrack(slotIndex + 1)) return true;
      usedCodes.delete(team.code);
      delete assignment[slot.index];
    }

    return false;
  };

  if (backtrack(0)) return assignment;

  thirdPlaceSlots.forEach((slot, index) => {
    const team = qualifiedThirds.find((item) => slot.eligibleGroups.includes(item.groupId) && !usedCodes.has(item.code));
    if (team) {
      assignment[index] = team;
      usedCodes.add(team.code);
    }
  });

  return assignment;
};

const buildRound32 = (models, picks, qualifiedThirds) => {
  const thirdPlaceSlots = fifaRound32Slots.flatMap((match) =>
    match.slots
      .map((slot, slotIndex) => ({ ...slot, matchNo: match.matchNo, slotIndex }))
      .filter((slot) => slot.finish === "third"),
  );
  const thirdAssignments = assignThirdPlaceSlots(thirdPlaceSlots, qualifiedThirds);
  let thirdSlotIndex = 0;

  return fifaRound32Slots.map((match) =>
    makeFifaMatch(
      "round32",
      match.matchNo,
      match.slots.map((slot) => {
        if (slot.finish === "third") {
          const team = thirdAssignments[thirdSlotIndex] ?? null;
          thirdSlotIndex += 1;
          return team;
        }

        return getPickedGroupTeam(models, picks, slot.groupId, slot.finish);
      }),
    ),
  );
};

const getMatchWinner = (match, knockoutPicks) => {
  const selected = knockoutPicks[match.id];
  return match.teams.find((team) => team?.code === selected) ?? null;
};

const buildFifaRound = (roundKey, previousMatchesByNumber, knockoutPicks) =>
  fifaNextRoundSlots[roundKey].map((slot) =>
    makeFifaMatch(
      roundKey,
      slot.matchNo,
      slot.sourceMatches.map((matchNo) => {
        const sourceMatch = previousMatchesByNumber[matchNo];
        return sourceMatch ? getMatchWinner(sourceMatch, knockoutPicks) : null;
      }),
      slot.sourceMatches,
    ),
  );

const indexMatchesByNumber = (matches) => Object.fromEntries(matches.map((match) => [match.matchNo, match]));

const buildKnockoutRounds = (models, picks, knockoutPicks, thirdPoolOverrides = {}) => {
  const { automatic, qualifiedThirds, thirdPool } = getQualifiers(models, picks, thirdPoolOverrides);
  const round32 = buildRound32(models, picks, qualifiedThirds);
  const round16 = buildFifaRound("round16", indexMatchesByNumber(round32), knockoutPicks);
  const quarterfinals = buildFifaRound("quarterfinals", indexMatchesByNumber(round16), knockoutPicks);
  const semifinals = buildFifaRound("semifinals", indexMatchesByNumber(quarterfinals), knockoutPicks);
  const final = buildFifaRound("final", indexMatchesByNumber(semifinals), knockoutPicks);
  const champion = getMatchWinner(final[0], knockoutPicks);

  return {
    champion,
    qualifiedCount: automatic.length + qualifiedThirds.length,
    qualifiedThirds,
    rounds: { round32, round16, quarterfinals, semifinals, final },
    thirdPool,
  };
};

const getMatchFavorite = (match) =>
  match.teams
    .filter(Boolean)
    .sort((a, b) => b.strength - a.strength || (a.bracketSeed ?? 99) - (b.bracketSeed ?? 99))[0];

const getModelKnockoutPicks = (models, picks, thirdPoolOverrides = {}) => {
  const knockoutPicks = {};

  for (const roundKey of Object.keys(roundLabels)) {
    const bracket = buildKnockoutRounds(models, picks, knockoutPicks, thirdPoolOverrides);
    bracket.rounds[roundKey].forEach((match) => {
      const favorite = getMatchFavorite(match);
      if (favorite) knockoutPicks[match.id] = favorite.code;
    });
  }

  return knockoutPicks;
};

const getBracketHighlights = (models, picks, knockoutPicks, thirdPoolOverrides = {}) => {
  const bracket = buildKnockoutRounds(models, picks, knockoutPicks, thirdPoolOverrides);
  const finalMatch = bracket.rounds.final[0];
  const champion = bracket.champion;
  const runnerUp = champion ? finalMatch?.teams.find((team) => team && team.code !== champion.code) : null;
  const semifinalLosers = bracket.rounds.semifinals
    .map((match) => {
      const winnerCode = knockoutPicks[match.id];
      return winnerCode ? match.teams.find((team) => team && team.code !== winnerCode) : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.strength - a.strength);

  return {
    champion,
    projectedThird: semifinalLosers[0] ?? null,
    qualifiedCount: bracket.qualifiedCount,
    runnerUp,
  };
};

const getKnockoutScoreDetails = (models, picks, knockoutPicks, thirdPoolOverrides = {}) => {
  const bracket = buildKnockoutRounds(models, picks, knockoutPicks, thirdPoolOverrides);
  const rows = Object.entries(bracket.rounds).map(([roundKey, matches]) => {
    const points = matches.reduce((total, match) => {
      const winner = match.teams.find((team) => team?.code === knockoutPicks[match.id]);
      if (!winner) return total;
      const opponent = match.teams.find((team) => team && team.code !== winner.code);
      const upsetBonus = opponent && winner.strength < opponent.strength ? Math.round((opponent.strength - winner.strength) * 0.6) : 0;
      return total + roundScoring[roundKey] + upsetBonus;
    }, 0);

    return {
      label: roundLabels[roundKey],
      matches: matches.length,
      picked: matches.filter((match) => knockoutPicks[match.id]).length,
      points,
      roundKey,
      weight: roundScoring[roundKey],
    };
  });

  return {
    rows,
    total: rows.reduce((sum, row) => sum + row.points, 0),
  };
};

const scorePicks = (picks, knockoutPicks, thirdPoolOverrides, models) =>
  scoreGroupPicks(picks, models) + getKnockoutScoreDetails(models, picks, knockoutPicks, thirdPoolOverrides).total;

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
            <span>2nd {odds.second}%</span>
            <span>3rd-place pool {odds.third}%</span>
            <span>4th {odds.fourth}%</span>
            <span>xPts {odds.expectedPoints}</span>
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
        <PickChip code={pick?.second} label="2nd" model={model} slot={`${pick?.second ? model.odds[pick.second].second : 0}%`} />
        <PickChip code={pick?.third} label="3rd" model={model} slot={`${pick?.third ? model.odds[pick.third].third : 0}%`} />
        <PickChip code={pick?.fourth} label="4th" model={model} slot={`${pick?.fourth ? model.odds[pick.fourth].fourth : 0}%`} />
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
        <b>{team.name}</b>
      </span>
      <small>{team.source}</small>
    </button>
  );
}

function BracketRoundColumn({ align = "left", matches, onPick, roundKey, startIndex = 0, knockoutPicks }) {
  return (
    <div className={`knockout-round ${align === "right" ? "mirror" : ""}`}>
      <h3>{roundLabels[roundKey]}</h3>
      <div className="knockout-matches">
        {matches.map((match, index) => (
          <article className="knockout-match" key={match.id}>
            <span className="match-label">
              {match.matchNo ? `M${match.matchNo}` : `${shortRoundLabels[roundKey]} ${startIndex + index + 1}`}
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
  );
}

function KnockoutBracket({ knockoutPicks, models, onAuto, onClear, onPick, picks, thirdPoolOverrides }) {
  const bracket = useMemo(
    () => buildKnockoutRounds(models, picks, knockoutPicks, thirdPoolOverrides),
    [knockoutPicks, models, picks, thirdPoolOverrides],
  );
  const qualifiedThirdCodes = new Set(bracket.qualifiedThirds.map((team) => team.code));
  const leftRounds = [
    { roundKey: "round32", matches: bracket.rounds.round32.slice(0, 8), startIndex: 0 },
    { roundKey: "round16", matches: bracket.rounds.round16.slice(0, 4), startIndex: 0 },
    { roundKey: "quarterfinals", matches: bracket.rounds.quarterfinals.slice(0, 2), startIndex: 0 },
    { roundKey: "semifinals", matches: bracket.rounds.semifinals.slice(0, 1), startIndex: 0 },
  ];
  const rightRounds = [
    { roundKey: "semifinals", matches: bracket.rounds.semifinals.slice(1, 2), startIndex: 1 },
    { roundKey: "quarterfinals", matches: bracket.rounds.quarterfinals.slice(2, 4), startIndex: 2 },
    { roundKey: "round16", matches: bracket.rounds.round16.slice(4, 8), startIndex: 4 },
    { roundKey: "round32", matches: bracket.rounds.round32.slice(8, 16), startIndex: 8 },
  ];
  const runnerUp = bracket.champion
    ? bracket.rounds.final[0]?.teams.find((team) => team && team.code !== bracket.champion.code)
    : null;

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
          <button type="button" onClick={onAuto}>
            Run model bracket
          </button>
          <button type="button" onClick={onClear}>
            Clear knockout
          </button>
        </div>
      </div>

      <div className="champion-banner">
        <p className="eyebrow">
          <Trophy size={13} />
          Predicted champion
        </p>
        {bracket.champion ? (
          <div className="champion-banner-main">
            <img alt="" src={bracket.champion.flag} loading="lazy" />
            <strong>{bracket.champion.name}</strong>
          </div>
        ) : (
          <div className="champion-banner-main muted">
            <Trophy size={30} />
            <strong>TBD</strong>
          </div>
        )}
        <div className="champion-banner-meta">
          <span>Runner-up {runnerUp ? `${runnerUp.name}` : "TBD"}</span>
          <span>{bracket.qualifiedCount}/32 qualified</span>
        </div>
      </div>

      <div className="knockout-scroll">
        <div className="knockout-canvas">
          <div className="bracket-side left">
            {leftRounds.map((round) => (
              <BracketRoundColumn
                key={`left-${round.roundKey}`}
                knockoutPicks={knockoutPicks}
                matches={round.matches}
                onPick={onPick}
                roundKey={round.roundKey}
                startIndex={round.startIndex}
              />
            ))}
          </div>
          <div className="final-column">
            <h3>The final</h3>
            <article className="knockout-match final-match">
              <span className="match-label">M{bracket.rounds.final[0].matchNo}</span>
              {bracket.rounds.final[0].teams.map((team, teamIndex) => (
                <BracketTeamButton
                  key={`final-${team?.code ?? teamIndex}`}
                  match={bracket.rounds.final[0]}
                  onPick={onPick}
                  team={team}
                  winnerCode={knockoutPicks[bracket.rounds.final[0].id]}
                />
              ))}
            </article>
          </div>
          <div className="bracket-side right">
            {rightRounds.map((round) => (
              <BracketRoundColumn
                align="right"
                key={`right-${round.roundKey}`}
                knockoutPicks={knockoutPicks}
                matches={round.matches}
                onPick={onPick}
                roundKey={round.roundKey}
                startIndex={round.startIndex}
              />
            ))}
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

function ThirdPoolSelector({ models, onOverride, overrides, picks }) {
  const { qualifiedThirds, thirdPool } = useMemo(() => getQualifiers(models, picks, overrides), [models, overrides, picks]);
  const qualifiedCodes = new Set(qualifiedThirds.map((team) => team.code));

  return (
    <section className="third-selector content-band" aria-label="Third-place knockout pool selector">
      <div className="section-head">
        <div>
          <p className="eyebrow">Step 1B</p>
          <h2>Choose the 8 Third-Place Teams</h2>
        </div>
        <span>{qualifiedThirds.length}/8 currently in</span>
      </div>
      <div className="third-selector-grid">
        {thirdPool.map((team, index) => {
          const override = overrides[team.code] ?? "auto";
          const isIn = qualifiedCodes.has(team.code);

          return (
            <article className={isIn ? "third-team-card in" : "third-team-card out"} key={team.code}>
              <div className="third-team-main">
                <img alt="" src={team.flag} loading="lazy" />
                <div>
                  <span>
                    #{index + 1} model pool rank · Group {team.groupId}
                  </span>
                  <strong>{team.name}</strong>
                  <small>
                    {team.tiebreak}% advance rating · adjusted {team.strength}
                  </small>
                </div>
                <b>{isIn ? "IN" : "OUT"}</b>
              </div>
              <div className="third-controls">
                {["auto", "in", "out"].map((mode) => (
                  <button
                    className={override === mode ? "active" : ""}
                    key={mode}
                    type="button"
                    onClick={() => onOverride(team.code, mode)}
                  >
                    {mode === "auto" ? "Auto" : mode === "in" ? "Force in" : "Force out"}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SummaryTeam({ label, team }) {
  return (
    <div className="summary-stat-card">
      <span>{label}</span>
      {team ? (
        <>
          <img alt="" src={team.flag} loading="lazy" />
          <strong>{team.name}</strong>
          <small>{team.source}</small>
        </>
      ) : (
        <>
          <Trophy size={27} />
          <strong>TBD</strong>
          <small>run or click bracket</small>
        </>
      )}
    </div>
  );
}

function PredictionSnapshot({ completedGroups, highlights, score }) {
  return (
    <section className="prediction-snapshot content-band" aria-label="Prediction summary">
      <div className="snapshot-grid">
        <SummaryTeam label="Champion" team={highlights.champion} />
        <SummaryTeam label="Runner up" team={highlights.runnerUp} />
        <SummaryTeam label="Projected 3rd" team={highlights.projectedThird} />
        <div className="summary-stat-card numeric">
          <span>Groups done</span>
          <strong>{completedGroups}/12</strong>
          <small>{highlights.qualifiedCount}/32 knockout qualifiers</small>
        </div>
      </div>
      <div className="model-explainer">
        <div>
          <span>Model score</span>
          <strong>{score}</strong>
        </div>
        <p>
          Group picks use win-group, advance, and third-place pool probabilities. Knockout paths are driven by
          adjusted ratings that include confederation strength, regional schedule quality, and host effects.
        </p>
      </div>
    </section>
  );
}

function ScoringPanel({ groupScore, knockoutScore, totalScore }) {
  return (
    <section className="scoring-panel content-band" aria-label="Scoring and model statistics">
      <div className="section-head">
        <div>
          <p className="eyebrow">Scoring statistics</p>
          <h2>How knockout picks turn into points</h2>
        </div>
        <span>Total model score {totalScore}</span>
      </div>
      <div className="scoring-grid">
        <article className="scoring-card primary">
          <span>Group-stage score</span>
          <strong>{groupScore}</strong>
          <p>1st uses win-group probability, 2nd uses advance probability, and 3rd uses third-place pool probability.</p>
        </article>
        <article className="scoring-card primary">
          <span>Knockout score</span>
          <strong>{knockoutScore.total}</strong>
          <p>Later rounds are worth more. Upsets add a small bonus when a lower adjusted-rating team beats a stronger team.</p>
        </article>
        <article className="scoring-card wide">
          <span>Round weights</span>
          <div className="round-score-grid">
            {knockoutScore.rows.map((row) => (
              <div key={row.roundKey}>
                <b>{row.label}</b>
                <strong>+{row.weight}</strong>
                <small>
                  {row.picked}/{row.matches} picked · {row.points} pts
                </small>
              </div>
            ))}
          </div>
        </article>
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

function TeamLab({ models, selectedCode, onSelect, onSelectGroup }) {
  const teams = models.flatMap((model) =>
    model.teams.map((team) => ({
      ...team,
      groupId: model.id,
      odds: model.odds[team.code],
    })),
  );
  const selected = teams.find((team) => team.code === selectedCode) ?? teams[0];
  const selectedSignals = getTeamSignals(selected, selected.odds);

  return (
    <section className="team-lab analysis-grid">
      <div className="team-lab-panel">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Team lab</p>
            <h2>Every Team Has a Probability Card</h2>
          </div>
          <ShieldAlert size={24} />
        </div>
        <div className="featured-team">
          <img alt="" src={selected.flag} loading="lazy" />
          <div>
            <span>
              Group {selected.groupId} · FIFA #{selected.rank} · {selected.confed}
            </span>
            <strong>{selected.name}</strong>
            <small>
              {selected.odds.first}% 1st · {selected.odds.second}% 2nd · {selected.odds.third}% 3rd ·{" "}
              {selected.odds.fourth}% 4th · {selected.odds.expectedPoints} xPts
            </small>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectGroup(selected.groupId);
              document.querySelector(".group-control")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Open group
          </button>
        </div>
        <div className="signal-grid">
          {selectedSignals.map((signal) => (
            <Signal signal={signal} key={signal.label} />
          ))}
        </div>
      </div>

      <div className="team-picker-panel">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Toggle cards</p>
            <h2>48-team selector</h2>
          </div>
          <span>{selected.code}</span>
        </div>
        <div className="team-card-grid">
          {teams.map((team) => (
            <button
              className={team.code === selected.code ? "team-mini-card active" : "team-mini-card"}
              key={team.code}
              type="button"
              onClick={() => onSelect(team.code)}
            >
              <img alt="" src={team.flag} loading="lazy" />
              <span>{team.code}</span>
              <small>
                G{team.groupId} · {team.odds.advance}% adv
              </small>
            </button>
          ))}
        </div>
      </div>
    </section>
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
  const modelPick = getModelPick(model);
  const favorite = getTeamByCode(model, modelPick.first);
  const second = getTeamByCode(model, modelPick.second);

  return (
    <button className="group-summary" type="button" onClick={onSelect}>
      <span>Group {model.id}</span>
      <strong>{favorite.name}</strong>
      <small>
        Favorite {model.odds[favorite.code].first}% · rating {model.odds[favorite.code].rating} · next{" "}
        {second.code} {model.odds[second.code].second}% 2nd
      </small>
    </button>
  );
}

function CreatorPanel({
  completedGroups,
  leaderboard,
  onRegister,
  onShare,
  playerEmail,
  playerName,
  registered,
  registerError,
  setPlayerEmail,
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
          <input
            aria-label="Email"
            onChange={(event) => setPlayerEmail(event.target.value)}
            placeholder="email"
            type="email"
            value={playerEmail}
          />
          <button type="button" onClick={onRegister}>
            {registered ? "Registered" : "Register"}
          </button>
        </div>
        {registerError ? <p className="register-error">{registerError}</p> : null}
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
  const [selectedTeamCode, setSelectedTeamCode] = useState("KOR");
  const [playerEmail, setPlayerEmail] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [picks, setPicks] = useState({});
  const [knockoutPicks, setKnockoutPicks] = useState({});
  const [thirdPoolOverrides, setThirdPoolOverrides] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const model = useMemo(() => getGroupModel(selectedGroup), [selectedGroup]);
  const allModels = useMemo(() => groups.map((group) => getGroupModel(group.id)), []);
  const teamByCode = useMemo(
    () => Object.fromEntries(model.teams.map((team) => [team.code, team])),
    [model],
  );
  const topTeam = getTeamByCode(model, getModelPick(model).first);
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
  const score = useMemo(
    () => scorePicks(picks, knockoutPicks, thirdPoolOverrides, allModels),
    [allModels, knockoutPicks, picks, thirdPoolOverrides],
  );
  const knockoutScore = useMemo(
    () => getKnockoutScoreDetails(allModels, picks, knockoutPicks, thirdPoolOverrides),
    [allModels, knockoutPicks, picks, thirdPoolOverrides],
  );
  const highlights = useMemo(
    () => getBracketHighlights(allModels, picks, knockoutPicks, thirdPoolOverrides),
    [allModels, knockoutPicks, picks, thirdPoolOverrides],
  );
  const shareLink = useMemo(() => {
    const payload = { knockoutPicks, playerName, picks, thirdPoolOverrides };
    const base = typeof window === "undefined" ? "https://wcprobability.com" : window.location.origin;
    return `${base}/?bracket=${encodeBracket(payload)}`;
  }, [knockoutPicks, picks, playerName, thirdPoolOverrides]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("bracket");
    if (shared) {
      const decoded = decodeBracket(shared);
      if (decoded?.picks) {
        setPicks(decoded.picks);
        setKnockoutPicks(decoded.knockoutPicks ?? {});
        setThirdPoolOverrides(decoded.thirdPoolOverrides ?? {});
        setPlayerName(decoded.playerName ? `${decoded.playerName}'s bracket` : "");
      }
    }

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (!shared && saved.picks) {
      setPicks(saved.picks);
      setKnockoutPicks(saved.knockoutPicks ?? {});
      setThirdPoolOverrides(saved.thirdPoolOverrides ?? {});
      setPlayerName(saved.playerName ?? "");
      setPlayerEmail(saved.playerEmail ?? "");
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
        playerEmail,
        picks,
        playerName,
        registered,
        thirdPoolOverrides,
      }),
    );
  }, [knockoutPicks, leaderboard, picks, playerEmail, playerName, registered, thirdPoolOverrides]);

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
    setThirdPoolOverrides({});
  };

  const handleAutoFill = () => {
    setPicks(Object.fromEntries(allModels.map((groupModel) => [groupModel.id, getModelPick(groupModel)])));
    setKnockoutPicks({});
    setThirdPoolOverrides({});
  };

  const handleClear = () => {
    setPicks({});
    setKnockoutPicks({});
    setThirdPoolOverrides({});
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

  const handleAutoKnockout = () => {
    setKnockoutPicks(getModelKnockoutPicks(allModels, picks, thirdPoolOverrides));
  };

  const handleThirdPoolOverride = (code, mode) => {
    setThirdPoolOverrides((current) => {
      const next = { ...current };
      if (mode === "auto") {
        delete next[code];
      } else {
        next[code] = mode;
      }
      return next;
    });
    setKnockoutPicks({});
  };

  const handleRegister = () => {
    const cleanName = playerName.trim() || "anonymous";
    const cleanEmail = playerEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setRegisterError("Enter a real email to register this bracket.");
      setRegistered(false);
      return;
    }
    const existingEmail = leaderboard.find(
      (item) => item.email?.toLowerCase() === cleanEmail && item.name.toLowerCase() !== cleanName.toLowerCase(),
    );
    if (existingEmail) {
      setRegisterError("That email already has a bracket on this device.");
      setRegistered(false);
      return;
    }
    const entry = {
      completedGroups,
      createdAt: Date.now(),
      email: cleanEmail,
      name: cleanName,
      score,
    };
    setPlayerName(cleanName);
    setPlayerEmail(cleanEmail);
    setRegistered(true);
    setRegisterError("");
    setLeaderboard((current) =>
      [entry, ...current.filter((item) => item.email?.toLowerCase() !== cleanEmail)]
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
            <h1>Start with the group stage.</h1>
            <p className="lede">
              Rank every group 1st through 4th, let the third-place pool settle, then push those teams into the knockout bracket.
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

          <LiveBracket models={allModels} picks={picks} score={score} />
        </div>
      </section>

      <section className="group-builder content-band">
        <div className="section-head">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2>Group Stage Builder</h2>
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

      <ThirdPoolSelector
        models={allModels}
        onOverride={handleThirdPoolOverride}
        overrides={thirdPoolOverrides}
        picks={picks}
      />

      <section className="content-band">
        <div className="section-head">
          <div>
            <p className="eyebrow">Step 2</p>
            <h2>Interactive Knockout Bracket</h2>
          </div>
          <span>Top 2 from each group + 8 third-place pool teams</span>
        </div>
        <KnockoutBracket
          knockoutPicks={knockoutPicks}
          models={allModels}
          onAuto={handleAutoKnockout}
          onClear={handleClearKnockout}
          onPick={handleKnockoutPick}
          picks={picks}
          thirdPoolOverrides={thirdPoolOverrides}
        />
      </section>

      <PredictionSnapshot completedGroups={completedGroups} highlights={highlights} score={score} />

      <ScoringPanel groupScore={scoreGroupPicks(picks, allModels)} knockoutScore={knockoutScore} totalScore={score} />

      <section className="content-band">
        <CreatorPanel
          completedGroups={completedGroups}
          leaderboard={leaderboard}
          onRegister={handleRegister}
          onShare={handleShare}
          playerEmail={playerEmail}
          playerName={playerName}
          registered={registered}
          registerError={registerError}
          setPlayerEmail={setPlayerEmail}
          score={score}
          setPlayerName={setPlayerName}
          shareLink={shareLink}
        />
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

      <TeamLab
        models={allModels}
        onSelect={setSelectedTeamCode}
        onSelectGroup={setSelectedGroup}
        selectedCode={selectedTeamCode}
      />

      <section className="analysis-grid notes-only">
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
