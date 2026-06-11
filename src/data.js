const palette = [
  "#0f8a5f",
  "#d93636",
  "#285aa8",
  "#d6a83d",
  "#7c3aed",
  "#0e7490",
  "#c2410c",
  "#4338ca",
  "#be123c",
  "#047857",
  "#b45309",
  "#1d4ed8",
];

const flagCodes = {
  ALG: "dz",
  ARG: "ar",
  AUS: "au",
  AUT: "at",
  BEL: "be",
  BIH: "ba",
  BRA: "br",
  CAN: "ca",
  CIV: "ci",
  COD: "cd",
  COL: "co",
  CPV: "cv",
  CRO: "hr",
  CUW: "cw",
  CZE: "cz",
  ECU: "ec",
  EGY: "eg",
  ENG: "gb-eng",
  ESP: "es",
  FRA: "fr",
  GER: "de",
  GHA: "gh",
  HAI: "ht",
  IRN: "ir",
  IRQ: "iq",
  JOR: "jo",
  JPN: "jp",
  KOR: "kr",
  KSA: "sa",
  MAR: "ma",
  MEX: "mx",
  NED: "nl",
  NOR: "no",
  NZL: "nz",
  PAN: "pa",
  PAR: "py",
  POR: "pt",
  QAT: "qa",
  RSA: "za",
  SCO: "gb-sct",
  SEN: "sn",
  SUI: "ch",
  SWE: "se",
  TUN: "tn",
  TUR: "tr",
  URU: "uy",
  USA: "us",
  UZB: "uz",
};

const positionDates = {
  A: ["Jun 11", "Jun 11", "Jun 18", "Jun 18", "Jun 24", "Jun 24"],
  B: ["Jun 12", "Jun 13", "Jun 18", "Jun 18", "Jun 24", "Jun 24"],
  C: ["Jun 13", "Jun 13", "Jun 19", "Jun 19", "Jun 24", "Jun 24"],
  D: ["Jun 12", "Jun 13", "Jun 19", "Jun 19", "Jun 25", "Jun 25"],
  E: ["Jun 14", "Jun 14", "Jun 20", "Jun 20", "Jun 25", "Jun 25"],
  F: ["Jun 14", "Jun 14", "Jun 20", "Jun 20", "Jun 25", "Jun 25"],
  G: ["Jun 15", "Jun 15", "Jun 21", "Jun 21", "Jun 26", "Jun 26"],
  H: ["Jun 15", "Jun 15", "Jun 21", "Jun 21", "Jun 26", "Jun 26"],
  I: ["Jun 16", "Jun 16", "Jun 22", "Jun 22", "Jun 27", "Jun 27"],
  J: ["Jun 16", "Jun 16", "Jun 22", "Jun 22", "Jun 27", "Jun 27"],
  K: ["Jun 17", "Jun 17", "Jun 23", "Jun 23", "Jun 27", "Jun 27"],
  L: ["Jun 17", "Jun 17", "Jun 23", "Jun 23", "Jun 27", "Jun 27"],
};

const venues = {
  A: ["Mexico City", "Guadalajara", "Atlanta", "Guadalajara", "Mexico City", "Monterrey"],
  B: ["Toronto", "Santa Clara", "Los Angeles", "Vancouver", "Vancouver", "Seattle"],
  C: ["Miami", "Boston", "Philadelphia", "Houston", "Atlanta", "Miami"],
  D: ["Los Angeles", "Kansas City", "Seattle", "Los Angeles", "Los Angeles", "Santa Clara"],
  E: ["New Jersey", "Philadelphia", "Kansas City", "Vancouver", "Philadelphia", "New Jersey"],
  F: ["Dallas", "Houston", "Toronto", "Kansas City", "Kansas City", "Dallas"],
  G: ["Seattle", "Vancouver", "Los Angeles", "Vancouver", "Vancouver", "Seattle"],
  H: ["San Francisco Bay Area", "Miami", "Dallas", "Houston", "Houston", "Guadalajara"],
  I: ["New York/New Jersey", "Boston", "Philadelphia", "Toronto", "Boston", "Toronto"],
  J: ["Kansas City", "San Francisco Bay Area", "Dallas", "San Francisco Bay Area", "Kansas City", "Dallas"],
  K: ["Houston", "Mexico City", "Houston", "Guadalajara", "Miami", "Atlanta"],
  L: ["Dallas", "Toronto", "Boston", "Boston", "New York/New Jersey", "Philadelphia"],
};

const team = (code, name, rank, seed, profile, confed = "") => ({
  code,
  name,
  rank,
  seed,
  confed,
  color: palette[Math.abs([...code].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palette.length],
  flag: `https://flagcdn.com/w80/${flagCodes[code] ?? code.toLowerCase()}.png`,
  profile,
});

const confedScheduleAdjustment = {
  CONMEBOL: 4,
  UEFA: 3,
  CAF: 0,
  AFC: -1,
  CONCACAF: -2,
  OFC: -5,
};

const teamScheduleAdjustment = {
  ARG: 2,
  BRA: 2,
  COL: 2,
  ECU: 2,
  PAR: 1,
  URU: 2,
  AUT: 2,
  CRO: 2,
  CZE: 1,
  ENG: 2,
  FRA: 2,
  GER: 2,
  NED: 2,
  NOR: 1,
  POR: 2,
  SCO: 1,
  ESP: 2,
  SUI: 1,
  SWE: 1,
  TUR: 1,
  BEL: 1,
  MAR: 2,
  SEN: 1,
  JPN: 2,
  IRN: 1,
  KOR: 1,
  AUS: 0,
  MEX: -2,
  USA: -1,
  CAN: -1,
  PAN: -3,
  QAT: -2,
  KSA: -2,
  NZL: -4,
};

const hostBoost = {
  CAN: 3,
  MEX: 4,
  USA: 3,
};

const scheduleContext = {
  CONMEBOL: "CONMEBOL grind",
  UEFA: "UEFA depth",
  CAF: "CAF variance",
  AFC: "AFC mixed sample",
  CONCACAF: "CONCACAF inflation check",
  OFC: "OFC sample penalty",
};

function enrichTeam(teamItem) {
  const confedAdjustment = confedScheduleAdjustment[teamItem.confed] ?? 0;
  const scheduleAdjustment = teamScheduleAdjustment[teamItem.code] ?? 0;
  const homeAdjustment = hostBoost[teamItem.code] ?? 0;
  const adjustedSeed = clamp(teamItem.seed + confedAdjustment + scheduleAdjustment + homeAdjustment, 45, 96);
  const totalAdjustment = adjustedSeed - teamItem.seed;

  return {
    ...teamItem,
    adjustedSeed,
    totalAdjustment,
    scheduleContext: scheduleContext[teamItem.confed] ?? "Neutral sample",
  };
}

export const groups = [
  {
    id: "A",
    title: "Mexico host lane",
    note: "Altitude, Korea-Czechia, and third-place math make this one volatile.",
    teams: [
      team("MEX", "Mexico", 15, 82, "Host boost, altitude comfort, aggressive wide attacks.", "CONCACAF"),
      team("RSA", "South Africa", 60, 67, "Compact block, athletic counters, keeper can steal points.", "CAF"),
      team("KOR", "Korea Republic", 25, 76, "Son + Lee Kang-in creation, transition threat, set-piece risk.", "AFC"),
      team("CZE", "Czechia", 41, 74, "Schick/Soucek spine, aerial power, dangerous restarts.", "UEFA"),
    ],
  },
  {
    id: "B",
    title: "Canada home pressure",
    note: "Switzerland are the model favorite; Canada need the opener clean.",
    teams: [
      team("CAN", "Canada", 32, 73, "Home energy, Davies transition game, defensive spacing questions.", "CONCACAF"),
      team("BIH", "Bosnia & Herzegovina", 55, 67, "Veteran control, sturdy midfield, needs enough final-third pace.", "UEFA"),
      team("QAT", "Qatar", 53, 66, "Tournament experience, compact shape, lower chance creation ceiling.", "AFC"),
      team("SUI", "Switzerland", 17, 80, "Tournament-tested spine, low-variance defending, clean set pieces.", "UEFA"),
    ],
  },
  {
    id: "C",
    title: "Brazil plus a trap",
    note: "Brazil should win it, but Morocco vs Scotland sets the bracket path.",
    teams: [
      team("BRA", "Brazil", 7, 88, "Elite ball-winning and runners; ceiling depends on finishing form.", "CONMEBOL"),
      team("HAI", "Haiti", 86, 58, "Direct, emotional underdog profile, needs chaos to stay alive.", "CONCACAF"),
      team("MAR", "Morocco", 12, 82, "Disciplined tournament side with transition bite and defensive pride.", "CAF"),
      team("SCO", "Scotland", 34, 73, "Physical midfield, set-piece threat, narrow-margin match profile.", "UEFA"),
    ],
  },
  {
    id: "D",
    title: "USMNT leverage group",
    note: "USA are favored, but Paraguay and Turkiye both punish loose buildup.",
    teams: [
      team("USA", "United States", 14, 81, "Home crowd, athletic press, needs control when ahead.", "CONCACAF"),
      team("PAR", "Paraguay", 38, 72, "Hard duels, disciplined defending, dangerous in low-scoring games.", "CONMEBOL"),
      team("AUS", "Australia", 26, 73, "Tournament grit, set pieces, direct pressure late in matches.", "AFC"),
      team("TUR", "Turkiye", 28, 75, "Technical midfield, emotional swings, real upset ceiling.", "UEFA"),
    ],
  },
  {
    id: "E",
    title: "Germany reset test",
    note: "Germany are clear favorites; Ecuador-Ivory Coast is the expensive match.",
    teams: [
      team("GER", "Germany", 9, 86, "High technical floor, layered chance creation, title-level upside.", "UEFA"),
      team("CUW", "Curacao", 82, 58, "Historic debut feel, disciplined shape, underdog counter chances.", "CONCACAF"),
      team("ECU", "Ecuador", 24, 77, "Athletic, young, pressing-friendly, strong second-place profile.", "CONMEBOL"),
      team("CIV", "Ivory Coast", 45, 70, "Powerful runners and transition bursts, consistency is the question.", "CAF"),
    ],
  },
  {
    id: "F",
    title: "Most annoying group",
    note: "Netherlands lead, but Japan and Sweden make every favorite pay tax.",
    teams: [
      team("NED", "Netherlands", 8, 86, "Elite defenders, deep midfield, set-piece and control edge.", "UEFA"),
      team("TUN", "Tunisia", 49, 68, "Compact, stubborn, comfortable making games ugly.", "CAF"),
      team("JPN", "Japan", 18, 80, "Press resistance, speed, coordinated rotations, upset equity.", "AFC"),
      team("SWE", "Sweden", 29, 75, "Aerial strength, clean spacing, hard to separate from Japan.", "UEFA"),
    ],
  },
  {
    id: "G",
    title: "Belgium cannot sleepwalk",
    note: "Belgium are ahead, but Egypt-Iran is a third-place tiebreaker factory.",
    teams: [
      team("BEL", "Belgium", 11, 84, "Veteran quality with enough creators to win the group.", "UEFA"),
      team("NZL", "New Zealand", 90, 57, "Organized, physical, needs set-piece variance.", "OFC"),
      team("IRN", "Iran", 20, 77, "Direct attacks, experienced core, low-block comfort.", "AFC"),
      team("EGY", "Egypt", 35, 74, "Salah gravity, transition danger, defensive concentration key.", "CAF"),
    ],
  },
  {
    id: "H",
    title: "Spain-Uruguay headline",
    note: "Spain have the highest floor here; Uruguay have the punch to steal first.",
    teams: [
      team("ESP", "Spain", 1, 92, "Best control profile, elite wide talent, favorite to sweep.", "UEFA"),
      team("CPV", "Cabo Verde", 71, 62, "Historic run, compact shape, needs one big upset point.", "CAF"),
      team("KSA", "Saudi Arabia", 58, 66, "Technical spells, pressing ambition, defensive transition risk.", "AFC"),
      team("URU", "Uruguay", 16, 83, "Intensity, ball-winners, elite forwards, real first-place threat.", "CONMEBOL"),
    ],
  },
  {
    id: "I",
    title: "France with teeth behind",
    note: "France are elite; Senegal-Norway is one of the best second-place fights.",
    teams: [
      team("FRA", "France", 2, 91, "World-class depth, transition speed, knockout favorite profile.", "UEFA"),
      team("IRQ", "Iraq", 59, 65, "Compact, spirited, needs efficient finishing to threaten.", "AFC"),
      team("SEN", "Senegal", 19, 79, "Physical, experienced, strong defensive base.", "CAF"),
      team("NOR", "Norway", 31, 77, "Haaland/Odegaard ceiling, defensive balance decides it.", "UEFA"),
    ],
  },
  {
    id: "J",
    title: "Argentina control group",
    note: "Argentina should manage it; Austria are the team nobody wants next.",
    teams: [
      team("ARG", "Argentina", 3, 90, "Champion habits, game management, elite penalty-box quality.", "CONMEBOL"),
      team("JOR", "Jordan", 64, 63, "Fast wide attacks, underdog confidence, needs defensive discipline.", "AFC"),
      team("ALG", "Algeria", 37, 73, "Technical front line, emotional momentum, capable of a swing result.", "CAF"),
      team("AUT", "Austria", 22, 80, "Pressing machine, organized rotations, serious second-place favorite.", "UEFA"),
    ],
  },
  {
    id: "K",
    title: "Portugal-Colombia price fight",
    note: "Portugal and Colombia are both bracket-dangerous; DR Congo can complicate third.",
    teams: [
      team("POR", "Portugal", 6, 88, "Star depth, chance creation, clean favorite but not risk-free.", "UEFA"),
      team("COD", "DR Congo", 56, 67, "Athletic, playoff-tested, enough power to make it uncomfortable.", "CAF"),
      team("UZB", "Uzbekistan", 50, 68, "Debutant with discipline, center-back quality, low-event upside.", "AFC"),
      team("COL", "Colombia", 13, 83, "Luis Diaz threat, mature midfield, genuine group-winning shot.", "CONMEBOL"),
    ],
  },
  {
    id: "L",
    title: "England-Croatia rematch energy",
    note: "England are clear favorites; Croatia and Ghana make this sharper than it looks.",
    teams: [
      team("ENG", "England", 4, 89, "Elite attacking depth, set pieces, title-contender baseline.", "UEFA"),
      team("CRO", "Croatia", 10, 82, "Tournament IQ, midfield calm, aging curve is the only question.", "UEFA"),
      team("GHA", "Ghana", 72, 65, "Explosive moments, physical forwards, variance-heavy profile.", "CAF"),
      team("PAN", "Panama", 30, 70, "CONCACAF-tested, organized, can drag favorites into duels.", "CONCACAF"),
    ],
  },
];

const pairings = [
  [0, 1, "Opener"],
  [2, 3, "First swing match"],
  [0, 2, "Control check"],
  [3, 1, "Second-place pressure"],
  [3, 0, "Top-seed test"],
  [1, 2, "Third-place math"],
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalize = (counts, total) =>
  Object.fromEntries(Object.entries(counts).map(([code, count]) => [code, Math.round((count / total) * 100)]));

const seededRandom = (seed) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

function matchProb(a, b) {
  const diff = a.adjustedSeed - b.adjustedSeed;
  const draw = clamp(27 - Math.abs(diff) * 0.12, 19, 29);
  const matchHostBoost = ["MEX", "CAN", "USA"].includes(a.code) ? 2 : 0;
  const awayHostDrag = ["MEX", "CAN", "USA"].includes(b.code) ? -2 : 0;
  const baseA = clamp(36 + diff * 1.08 + matchHostBoost + awayHostDrag, 14, 72);
  const winA = Math.round(clamp(baseA, 8, 100 - draw - 8));
  const winB = 100 - winA - Math.round(draw);
  return [
    [a.code, winA],
    ["Draw", Math.round(draw)],
    [b.code, winB],
  ];
}

function teamOdds(group) {
  const simulations = 6000;
  const seed = group.id.charCodeAt(0) * 1009;
  const random = seededRandom(seed);
  const positionCounts = {
    first: Object.fromEntries(group.teams.map((teamItem) => [teamItem.code, 0])),
    second: Object.fromEntries(group.teams.map((teamItem) => [teamItem.code, 0])),
    third: Object.fromEntries(group.teams.map((teamItem) => [teamItem.code, 0])),
    fourth: Object.fromEntries(group.teams.map((teamItem) => [teamItem.code, 0])),
  };
  const expectedPoints = Object.fromEntries(group.teams.map((teamItem) => [teamItem.code, 0]));
  const teamByIndex = Object.fromEntries(group.teams.map((teamItem, index) => [index, teamItem]));

  for (let run = 0; run < simulations; run += 1) {
    const table = Object.fromEntries(
      group.teams.map((teamItem) => [
        teamItem.code,
        {
          code: teamItem.code,
          points: 0,
          goalDiff: 0,
          goalsFor: 0,
          rating: teamItem.adjustedSeed,
        },
      ]),
    );

    pairings.forEach(([aIndex, bIndex]) => {
      const a = teamByIndex[aIndex];
      const b = teamByIndex[bIndex];
      const probs = matchProb(a, b);
      const roll = random() * 100;
      const ratingGap = Math.abs(a.adjustedSeed - b.adjustedSeed);
      const margin = ratingGap > 13 ? 2 : 1;

      if (roll < probs[0][1]) {
        table[a.code].points += 3;
        table[a.code].goalDiff += margin;
        table[a.code].goalsFor += margin + 1;
        table[b.code].goalDiff -= margin;
        table[b.code].goalsFor += 1;
      } else if (roll < probs[0][1] + probs[1][1]) {
        table[a.code].points += 1;
        table[b.code].points += 1;
        table[a.code].goalsFor += 1;
        table[b.code].goalsFor += 1;
      } else {
        table[b.code].points += 3;
        table[b.code].goalDiff += margin;
        table[b.code].goalsFor += margin + 1;
        table[a.code].goalDiff -= margin;
        table[a.code].goalsFor += 1;
      }
    });

    Object.values(table).forEach((row) => {
      expectedPoints[row.code] += row.points;
    });

    const ordered = Object.values(table).sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor ||
        b.rating - a.rating,
    );
    positionCounts.first[ordered[0].code] += 1;
    positionCounts.second[ordered[1].code] += 1;
    positionCounts.third[ordered[2].code] += 1;
    positionCounts.fourth[ordered[3].code] += 1;
  }

  const first = normalize(positionCounts.first, simulations);
  const second = normalize(positionCounts.second, simulations);
  const third = normalize(positionCounts.third, simulations);
  const fourth = normalize(positionCounts.fourth, simulations);
  const sorted = [...group.teams].sort((a, b) => b.adjustedSeed - a.adjustedSeed);

  return Object.fromEntries(
    group.teams.map((teamItem) => {
      const groupRank = sorted.findIndex((candidate) => candidate.code === teamItem.code) + 1;
      const topTwo = first[teamItem.code] + second[teamItem.code];
      const advance = clamp(Math.round(topTwo + third[teamItem.code] * 0.67), 1, 99);
      return [
        teamItem.code,
        {
          advance,
          expectedPoints: Number((expectedPoints[teamItem.code] / simulations).toFixed(1)),
          first: first[teamItem.code],
          second: second[teamItem.code],
          third: third[teamItem.code],
          fourth: fourth[teamItem.code],
          rating: teamItem.adjustedSeed,
          baseRating: teamItem.seed,
          adjustment: teamItem.totalAdjustment,
          groupRank,
        },
      ];
    }),
  );
}

function fixtureModel(group) {
  return pairings.map(([aIndex, bIndex, note], index) => {
    const a = group.teams[aIndex];
    const b = group.teams[bIndex];
    return {
      match: `${a.name} vs ${b.name}`,
      date: positionDates[group.id][index],
      venue: venues[group.id][index],
      note,
      probs: matchProb(a, b),
    };
  });
}

export function getGroupModel(groupId) {
  const group = groups.find((item) => item.id === groupId) ?? groups[0];
  const modeledGroup = {
    ...group,
    teams: group.teams.map(enrichTeam),
  };

  return {
    ...modeledGroup,
    odds: teamOdds(modeledGroup),
    fixtures: fixtureModel(modeledGroup),
  };
}

export const getTeamSignals = (teamItem, odds) => {
  const attack = clamp(Math.round(teamItem.adjustedSeed * 0.72 + (teamItem.confed === "CONMEBOL" ? 12 : 7)), 42, 96);
  const defense = clamp(Math.round(teamItem.adjustedSeed * 0.7 + (teamItem.confed === "UEFA" ? 12 : 8)), 42, 96);
  const setPieces = clamp(Math.round(teamItem.adjustedSeed * 0.58 + (teamItem.rank <= 20 ? 21 : 17)), 38, 92);
  const transition = clamp(Math.round(teamItem.adjustedSeed * 0.63 + (["AFC", "CAF", "CONCACAF"].includes(teamItem.confed) ? 19 : 16)), 40, 94);
  const form = clamp(Math.round(odds.expectedPoints * 19 + odds.advance * 0.22), 35, 94);
  const volatility = clamp(Math.round(100 - odds.advance * 0.54 + odds.third * 0.72 + odds.fourth * 0.18), 18, 85);

  return [
    { label: "Attack", value: attack, tone: attack >= 78 ? "good" : attack >= 66 ? "steady" : "risk" },
    { label: "Defense", value: defense, tone: defense >= 78 ? "good" : defense >= 66 ? "steady" : "risk" },
    { label: "Set pieces", value: setPieces, tone: setPieces >= 76 ? "good" : setPieces >= 63 ? "steady" : "risk" },
    { label: "Transition", value: transition, tone: transition >= 76 ? "good" : transition >= 63 ? "steady" : "risk" },
    { label: "Group form", value: form, tone: form >= 74 ? "good" : form >= 58 ? "steady" : "risk" },
    { label: "Volatility", value: volatility, tone: volatility >= 64 ? "risk" : volatility >= 44 ? "steady" : "good" },
  ];
};

export const marketNotes = [
  "Top two advance automatically; only eight of twelve third-place teams survive through the third-place pool.",
  "Group probabilities now come from a deterministic 6,000-run fixture simulation, so 1st/2nd/3rd/4th probabilities stay internally consistent.",
  "Autofill ranks teams by their simulated finish order instead of mixing separate probability columns.",
  "Knockout seeding uses adjusted rating plus group-stage advancement strength, then users can override the third-place pool.",
];
