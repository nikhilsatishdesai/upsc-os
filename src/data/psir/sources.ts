import type { StudySource } from "./types";

/**
 * The standard PSIR booklist, tiered: foundation (start here) → core (the
 * exam books) → supplementary (depth for specific units) → current (keeps
 * Paper II Section B fresh). Users track reading status in the practice
 * store.
 */
export const PSIR_SOURCES: StudySource[] = [
  /* ---------------- Paper I · Section A ---------------- */
  {
    id: "ncert-political-theory",
    title: "Political Theory (NCERT Class XI)",
    author: "NCERT",
    tier: "foundation",
    coversIds: ["mains.psir1.theory", "mains.psir1.concepts"],
    note: "Read first — clean, exam-friendly definitions of liberty, equality, justice and rights.",
  },
  {
    id: "gauba-political-theory",
    title: "An Introduction to Political Theory",
    author: "O.P. Gauba",
    tier: "core",
    coversIds: ["mains.psir1.theory", "mains.psir1.concepts", "mains.psir1.ideologies"],
    note: "The backbone for Section A concepts; build your notes on its chapter structure.",
  },
  {
    id: "heywood-political-theory",
    title: "Political Theory: An Introduction",
    author: "Andrew Heywood",
    tier: "core",
    coversIds: ["mains.psir1.theory", "mains.psir1.concepts"],
    note: "Sharper analytical framing and debates — great for 15/20-markers.",
  },
  {
    id: "heywood-ideologies",
    title: "Political Ideologies: An Introduction",
    author: "Andrew Heywood",
    tier: "core",
    coversIds: ["mains.psir1.ideologies"],
    note: "Liberalism, socialism, Marxism, fascism and feminism — one chapter each.",
  },
  {
    id: "bhargava-acharya",
    title: "Political Theory: An Introduction",
    author: "Rajeev Bhargava & Ashok Acharya (eds.)",
    tier: "supplementary",
    coversIds: ["mains.psir1.concepts"],
    note: "Indian-context essays on rights, equality, democracy and secularism.",
  },
  {
    id: "mukherjee-ramaswamy",
    title: "A History of Political Thought: Plato to Marx",
    author: "Subrata Mukherjee & Sushila Ramaswamy",
    tier: "core",
    coversIds: ["mains.psir1.western-thought"],
    note: "The standard text for Western thinkers; pair with one-page thinker sheets.",
  },
  {
    id: "jha-western-thought",
    title: "Western Political Thought: From Plato to Marx",
    author: "Shefali Jha",
    tier: "supplementary",
    coversIds: ["mains.psir1.western-thought"],
    note: "Concise alternative; useful for quick revision of arguments.",
  },
  {
    id: "singh-roy-indian-thought",
    title: "Indian Political Thought: Themes and Thinkers",
    author: "Mahendra Prasad Singh & Himanshu Roy (eds.)",
    tier: "core",
    coversIds: ["mains.psir1.indian-thought"],
    note: "Covers every Indian thinker named in the syllabus.",
  },
  {
    id: "mehta-foundations",
    title: "Foundations of Indian Political Thought",
    author: "V.R. Mehta",
    tier: "supplementary",
    coversIds: ["mains.psir1.indian-thought"],
    note: "Depth on Dharmashastra, Arthashastra and the classical traditions.",
  },
  {
    id: "kymlicka",
    title: "Contemporary Political Philosophy: An Introduction",
    author: "Will Kymlicka",
    tier: "supplementary",
    coversIds: ["mains.psir1.concepts"],
    note: "Rawls, Nozick, communitarians and feminists — for value-addition quotes.",
  },

  /* ---------------- Paper I · Section B ---------------- */
  {
    id: "ncert-constitution-at-work",
    title: "Indian Constitution at Work (NCERT Class XI)",
    author: "NCERT",
    tier: "foundation",
    coversIds: ["mains.psir1.constitution", "mains.psir1.organs", "mains.psir1.federalism"],
    note: "Envisaged-role framing, straight from the Constituent Assembly debates.",
  },
  {
    id: "ncert-politics-since-independence",
    title: "Politics in India since Independence (NCERT Class XII)",
    author: "NCERT",
    tier: "foundation",
    coversIds: ["mains.psir1.party-system", "mains.psir1.planning", "mains.psir1.social-movements"],
    note: "Party system, planning, coalition era and movements in one readable book.",
  },
  {
    id: "laxmikanth",
    title: "Indian Polity",
    author: "M. Laxmikanth",
    tier: "core",
    coversIds: ["mains.psir1.constitution", "mains.psir1.organs", "mains.psir1.grassroots", "mains.psir1.institutions"],
    note: "Factual base for institutions and bodies; add PSIR analysis on top.",
  },
  {
    id: "bipan-struggle",
    title: "India's Struggle for Independence",
    author: "Bipan Chandra et al.",
    tier: "core",
    coversIds: ["mains.psir1.nationalism"],
    note: "Strategies of the freedom struggle — pair with the perspectives debate.",
  },
  {
    id: "bipan-since-independence",
    title: "India Since Independence",
    author: "Bipan Chandra et al.",
    tier: "core",
    coversIds: ["mains.psir1.planning", "mains.psir1.identity", "mains.psir1.party-system", "mains.psir1.federalism"],
    note: "Planning, land reforms, regionalism and party politics after 1947.",
  },
  {
    id: "austin-cornerstone",
    title: "The Indian Constitution: Cornerstone of a Nation",
    author: "Granville Austin",
    tier: "supplementary",
    coversIds: ["mains.psir1.constitution"],
    note: "Making of the Constitution — quotable framing for B2–B3.",
  },
  {
    id: "kothari-politics-in-india",
    title: "Politics in India",
    author: "Rajni Kothari",
    tier: "supplementary",
    coversIds: ["mains.psir1.party-system", "mains.psir1.identity"],
    note: "The 'Congress system' and caste-in-politics arguments examiners love.",
  },
  {
    id: "oxford-companion",
    title: "The Oxford Companion to Politics in India",
    author: "Niraja Gopal Jayal & Pratap Bhanu Mehta (eds.)",
    tier: "supplementary",
    coversIds: ["mains.psir1.organs", "mains.psir1.party-system", "mains.psir1.social-movements", "mains.psir1.identity"],
    note: "Scholarly chapters for 20-mark depth on institutions and movements.",
  },

  /* ---------------- Paper II · Section A ---------------- */
  {
    id: "ncert-contemporary-world",
    title: "Contemporary World Politics (NCERT Class XII)",
    author: "NCERT",
    tier: "foundation",
    coversIds: ["mains.psir2.world-order", "mains.psir2.un", "mains.psir2.regionalisation", "mains.psir2.global-concerns"],
    note: "Cold War, unipolarity, UN and regional organisations — the perfect start.",
  },
  {
    id: "hague-harrop",
    title: "Comparative Government and Politics: An Introduction",
    author: "Rod Hague, Martin Harrop & John McCormick",
    tier: "core",
    coversIds: ["mains.psir2.comparative"],
    note: "Approaches, the state, parties and participation in comparative frame.",
  },
  {
    id: "baylis-smith",
    title: "The Globalization of World Politics",
    author: "John Baylis, Steve Smith & Patricia Owens (eds.)",
    tier: "core",
    coversIds: ["mains.psir2.ir-theory", "mains.psir2.world-order", "mains.psir2.economic-system", "mains.psir2.global-concerns"],
    note: "The IR bible — theories and global issues with clear structure.",
  },
  {
    id: "heywood-global-politics",
    title: "Global Politics",
    author: "Andrew Heywood",
    tier: "core",
    coversIds: ["mains.psir2.ir-theory", "mains.psir2.comparative", "mains.psir2.global-concerns"],
    note: "Concise theory chapters; excellent for debates and diagrams.",
  },
  {
    id: "pavneet-singh-ir",
    title: "International Relations",
    author: "Pavneet Singh",
    tier: "supplementary",
    coversIds: ["mains.psir2.ir-theory", "mains.psir2.world-order", "mains.psir2.un", "mains.psir2.economic-system"],
    note: "Written for the UPSC optional — good for gap-filling Section A.",
  },

  /* ---------------- Paper II · Section B ---------------- */
  {
    id: "malone-elephant",
    title: "Does the Elephant Dance? Contemporary Indian Foreign Policy",
    author: "David M. Malone",
    tier: "core",
    coversIds: ["mains.psir2.foreign-policy", "mains.psir2.south-asia", "mains.psir2.power-centres"],
    note: "Determinants and bilateral chapters — the base for Section B.",
  },
  {
    id: "sikri-challenge",
    title: "Challenge and Strategy: Rethinking India's Foreign Policy",
    author: "Rajiv Sikri",
    tier: "core",
    coversIds: ["mains.psir2.south-asia", "mains.psir2.power-centres", "mains.psir2.foreign-policy"],
    note: "A practitioner's region-by-region analysis.",
  },
  {
    id: "jaishankar-india-way",
    title: "The India Way: Strategies for an Uncertain World",
    author: "S. Jaishankar",
    tier: "core",
    coversIds: ["mains.psir2.foreign-policy", "mains.psir2.recent", "mains.psir2.power-centres"],
    note: "Current doctrine — multi-alignment, strategic autonomy; highly quotable.",
  },
  {
    id: "tharoor-pax-indica",
    title: "Pax Indica: India and the World of the 21st Century",
    author: "Shashi Tharoor",
    tier: "supplementary",
    coversIds: ["mains.psir2.foreign-policy", "mains.psir2.un-system", "mains.psir2.global-south"],
    note: "Soft power, UN and the Global South — good examples.",
  },
  {
    id: "oxford-handbook-ifp",
    title: "The Oxford Handbook of Indian Foreign Policy",
    author: "David M. Malone, C. Raja Mohan & Srinath Raghavan (eds.)",
    tier: "supplementary",
    coversIds: ["mains.psir2.foreign-policy", "mains.psir2.nuclear", "mains.psir2.un-system", "mains.psir2.global-south"],
    note: "Deep chapters on nuclear policy, multilateralism and regions.",
  },
  {
    id: "mea-and-editorials",
    title: "MEA statements & joint statements + IR editorials",
    author: "Ministry of External Affairs · The Hindu · Indian Express",
    tier: "current",
    coversIds: ["mains.psir2.recent", "mains.psir2.power-centres", "mains.psir2.south-asia"],
    note: "Weekly habit: summarise one development per relationship into Current Affairs.",
  },
];

export const SOURCE_TIER_META: Record<
  StudySource["tier"],
  { label: string; badge: string }
> = {
  foundation: {
    label: "Foundation",
    badge: "tag-blue",
  },
  core: {
    label: "Core",
    badge: "tag-purple",
  },
  supplementary: {
    label: "Depth",
    badge: "tag-gray",
  },
  current: {
    label: "Current",
    badge: "tag-yellow",
  },
};
