export const teams = [
  {
    code: "MEX",
    name: "Mexico",
    rank: 15,
    seed: 80,
    color: "#0f8a5f",
    profile: "Host edge, altitude, pressure, direct attacks.",
    odds: { advance: 76, first: 43, ro32: 58 },
  },
  {
    code: "KOR",
    name: "Korea Republic",
    rank: 25,
    seed: 75,
    color: "#d93636",
    profile: "Son + Lee Kang-in creation, transition threat, formation uncertainty.",
    odds: { advance: 61, first: 22, ro32: 39 },
  },
  {
    code: "CZE",
    name: "Czechia",
    rank: 41,
    seed: 74,
    color: "#285aa8",
    profile: "Schick/Soucek/Krejci spine, dangerous aerial set pieces.",
    odds: { advance: 55, first: 21, ro32: 33 },
  },
  {
    code: "RSA",
    name: "South Africa",
    rank: 60,
    seed: 68,
    color: "#d6a83d",
    profile: "Compact, athletic in transition, Williams can steal a game.",
    odds: { advance: 34, first: 14, ro32: 20 },
  },
];

export const fixtures = [
  {
    match: "Mexico vs South Africa",
    date: "Jun 11",
    venue: "Mexico City",
    note: "Opening host boost",
    probs: [
      ["MEX", 58],
      ["Draw", 26],
      ["RSA", 16],
    ],
  },
  {
    match: "Korea Republic vs Czechia",
    date: "Jun 11",
    venue: "Guadalajara",
    note: "Group swing match",
    probs: [
      ["KOR", 37],
      ["Draw", 30],
      ["CZE", 33],
    ],
  },
  {
    match: "Czechia vs South Africa",
    date: "Jun 18",
    venue: "Atlanta",
    note: "Travel reset",
    probs: [
      ["CZE", 45],
      ["Draw", 29],
      ["RSA", 26],
    ],
  },
  {
    match: "Mexico vs Korea Republic",
    date: "Jun 18",
    venue: "Guadalajara",
    note: "Korea pressure test",
    probs: [
      ["MEX", 47],
      ["Draw", 27],
      ["KOR", 26],
    ],
  },
  {
    match: "Czechia vs Mexico",
    date: "Jun 24",
    venue: "Mexico City",
    note: "Likely first-place lane",
    probs: [
      ["CZE", 27],
      ["Draw", 28],
      ["MEX", 45],
    ],
  },
  {
    match: "South Africa vs Korea Republic",
    date: "Jun 24",
    venue: "Monterrey",
    note: "Advancement safety valve",
    probs: [
      ["RSA", 22],
      ["Draw", 27],
      ["KOR", 51],
    ],
  },
];

export const koreaSignals = [
  { label: "Attack", value: 78, tone: "good" },
  { label: "Defense", value: 73, tone: "steady" },
  { label: "Set-piece defense", value: 62, tone: "risk" },
  { label: "Transition attack", value: 78, tone: "good" },
  { label: "Aerial duels", value: 66, tone: "risk" },
  { label: "Altitude prep", value: 74, tone: "steady" },
];

export const marketNotes = [
  "Czechia opener drives Korea's whole group path.",
  "Four points should be a strong advancement state in the 48-team format.",
  "Mexico match needs a host/altitude modifier, not just team strength.",
  "South Africa is the trap match: lower baseline, enough keeper/transition quality to hurt loose teams.",
];
