import type { SynergyLink } from "./types";

/**
 * PSIR ↔ GS synergy: which General Studies / Essay / Prelims areas a PSIR
 * unit also prepares. Shown on the PSIR hub and on every PSIR topic page
 * so one study session is consciously banked twice. All ids are verified
 * against the syllabus by tests.
 */
export const PSIR_SYNERGY: SynergyLink[] = [
  {
    psirId: "mains.psir1.theory",
    targets: ["mains.essay.philosophical", "mains.essay.polity-governance"],
    note: "Theories of the State give Essay introductions and conclusions real depth.",
  },
  {
    psirId: "mains.psir1.concepts",
    targets: ["mains.gs4.ethics-interface", "mains.essay.polity-governance", "mains.gs2.social-justice"],
    note: "Justice, equality and rights are the vocabulary of GS-IV and social-justice answers.",
  },
  {
    psirId: "mains.psir1.ideologies",
    targets: ["mains.gs1.world-history.political-philosophies", "mains.essay.philosophical"],
    note: "GS-I explicitly asks about communism, capitalism and socialism.",
  },
  {
    psirId: "mains.psir1.indian-thought",
    targets: ["mains.gs4.thinkers.indian", "mains.essay.social"],
    note: "Gandhi, Ambedkar and Kautilya are GS-IV's favourite Indian thinkers.",
  },
  {
    psirId: "mains.psir1.western-thought",
    targets: ["mains.gs4.thinkers.world", "mains.essay.philosophical"],
    note: "Plato, Aristotle, Mill and Arendt double as GS-IV moral philosophers.",
  },
  {
    psirId: "mains.psir1.nationalism",
    targets: ["mains.gs1.freedom-struggle", "prelims.gs.history.modern"],
    note: "Same movements — PSIR adds the strategy and perspective lens GS-I rewards.",
  },
  {
    psirId: "mains.psir1.constitution",
    targets: ["mains.gs2.constitution", "prelims.gs.polity.constitution"],
    note: "Near-total overlap with GS-II and Prelims polity.",
  },
  {
    psirId: "mains.psir1.organs",
    targets: ["mains.gs2.polity", "prelims.gs.polity.union-state"],
    note: "Parliament, executive and judiciary — the core of GS-II.",
  },
  {
    psirId: "mains.psir1.grassroots",
    targets: ["mains.gs2.constitution.devolution", "prelims.gs.polity.federalism-local"],
    note: "73rd/74th Amendments appear in GS-II and Prelims every cycle.",
  },
  {
    psirId: "mains.psir1.institutions",
    targets: ["mains.gs2.polity.constitutional-posts", "mains.gs2.polity.statutory-bodies", "prelims.gs.polity.bodies"],
    note: "ECI, CAG, Finance Commission and the national commissions.",
  },
  {
    psirId: "mains.psir1.federalism",
    targets: ["mains.gs2.constitution.federal-structure", "prelims.gs.polity.federalism-local"],
    note: "Centre–State relations is a perennial GS-II question.",
  },
  {
    psirId: "mains.psir1.planning",
    targets: ["mains.gs3.economy", "mains.gs1.post-independence"],
    note: "Planning, land reforms and liberalisation feed GS-III economy answers.",
  },
  {
    psirId: "mains.psir1.identity",
    targets: ["mains.gs1.society", "mains.essay.social"],
    note: "Caste, communalism and regionalism are GS-I society staples.",
  },
  {
    psirId: "mains.psir1.party-system",
    targets: ["mains.gs2.polity.rpa", "mains.gs2.polity.pressure-groups"],
    note: "Elections, RPA and pressure groups in GS-II.",
  },
  {
    psirId: "mains.psir1.social-movements",
    targets: ["mains.gs1.society", "mains.gs2.social-justice", "mains.gs3.environment"],
    note: "Women's and environmental movements double as GS-I/GS-III examples.",
  },
  {
    psirId: "mains.psir2.comparative",
    targets: ["mains.gs2.constitution.comparison", "mains.gs1.society.globalization"],
    note: "GS-II asks for comparisons of the Indian scheme with other countries.",
  },
  {
    psirId: "mains.psir2.ir-theory",
    targets: ["mains.gs2.ir", "mains.gs4.public-service-values.international-ethics", "mains.essay.international"],
    note: "Realism vs liberalism makes GS-II IR answers analytical, not descriptive.",
  },
  {
    psirId: "mains.psir2.world-order",
    targets: ["mains.gs1.world-history", "mains.essay.international"],
    note: "Cold War and its end close GS-I world history.",
  },
  {
    psirId: "mains.psir2.economic-system",
    targets: ["mains.gs3.economy", "prelims.gs.economy.basics.external-sector"],
    note: "Bretton Woods, WTO and globalisation in GS-III and Prelims.",
  },
  {
    psirId: "mains.psir2.un",
    targets: ["mains.gs2.ir.institutions", "prelims.gs.current-affairs.international"],
    note: "International institutions — structure and mandate — is a GS-II line item.",
  },
  {
    psirId: "mains.psir2.regionalisation",
    targets: ["mains.gs2.ir.groupings", "prelims.gs.current-affairs.international"],
    note: "Regional groupings involving India — GS-II and Prelims favourites.",
  },
  {
    psirId: "mains.psir2.global-concerns",
    targets: ["mains.gs3.environment", "mains.gs3.security", "mains.essay.international"],
    note: "Climate, terrorism and proliferation recur across GS-III and the Essay.",
  },
  {
    psirId: "mains.psir2.foreign-policy",
    targets: ["mains.gs2.ir", "mains.gs2.ir.policies-effect"],
    note: "Determinants and continuity/change frame every GS-II IR answer.",
  },
  {
    psirId: "mains.psir2.south-asia",
    targets: ["mains.gs2.ir.neighborhood", "mains.gs3.security"],
    note: "India and its neighbourhood is GS-II's single most asked IR theme.",
  },
  {
    psirId: "mains.psir2.global-south",
    targets: ["mains.gs2.ir.groupings", "mains.gs2.ir.policies-effect"],
    note: "Africa, Latin America and WTO coalitions in GS-II.",
  },
  {
    psirId: "mains.psir2.power-centres",
    targets: ["mains.gs2.ir.policies-effect", "mains.gs2.ir.groupings"],
    note: "US, China, Russia, EU and Japan — bilateral and grouping questions in GS-II.",
  },
  {
    psirId: "mains.psir2.un-system",
    targets: ["mains.gs2.ir.institutions"],
    note: "UNSC reform and peacekeeping are GS-II perennials.",
  },
  {
    psirId: "mains.psir2.nuclear",
    targets: ["mains.gs3.security", "mains.gs2.ir.groupings"],
    note: "NSG, NPT and doctrine overlap GS-III security and GS-II groupings.",
  },
  {
    psirId: "mains.psir2.recent",
    targets: ["mains.gs2.ir", "prelims.gs.current-affairs.international"],
    note: "The same current affairs serve Prelims, GS-II and PSIR — note them once.",
  },
];
