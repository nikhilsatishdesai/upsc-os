import type { SyllabusNodeDef } from "./types";

export const prelimsGS: SyllabusNodeDef = {
  id: "gs",
  title: "Paper I — General Studies",
  description:
    "200 marks · 100 questions · 2 hours. Merit-ranking paper of the Preliminary Examination.",
  children: [
    {
      id: "history",
      title: "History of India & Indian National Movement",
      children: [
        {
          id: "ancient",
          title: "Ancient India",
          children: [
            { id: "prehistory", title: "Prehistoric cultures (Palaeolithic to Chalcolithic)" },
            { id: "ivc", title: "Indus Valley Civilisation" },
            { id: "vedic", title: "Vedic Age (Early & Later Vedic society)" },
            { id: "mahajanapadas", title: "Mahajanapadas & rise of Magadha" },
            { id: "religious-movements", title: "Buddhism, Jainism & other heterodox movements" },
            { id: "mauryan", title: "Mauryan Empire & Ashoka" },
            { id: "post-mauryan", title: "Post-Mauryan India (Shungas, Kushanas, Satavahanas, Indo-Greeks)" },
            { id: "gupta", title: "Gupta Empire & the classical age" },
            { id: "sangam", title: "Sangam Age & early South India" },
            { id: "post-gupta", title: "Post-Gupta kingdoms (Harsha, Chalukyas, Pallavas)" },
          ],
        },
        {
          id: "medieval",
          title: "Medieval India",
          children: [
            { id: "early-medieval", title: "Early medieval polities (Rajputs, Cholas, Rashtrakutas)" },
            { id: "delhi-sultanate", title: "Delhi Sultanate (1206–1526)" },
            { id: "vijayanagara", title: "Vijayanagara & Bahmani kingdoms" },
            { id: "mughals", title: "Mughal Empire (administration, economy, culture)" },
            { id: "marathas", title: "Rise of the Marathas" },
            { id: "bhakti-sufi", title: "Bhakti & Sufi movements" },
          ],
        },
        {
          id: "modern",
          title: "Modern India & the National Movement",
          children: [
            { id: "company-rule", title: "Advent of Europeans & expansion of Company rule" },
            { id: "colonial-economy", title: "Economic impact of colonial rule" },
            { id: "revolt-1857", title: "Revolt of 1857" },
            { id: "socio-religious-reform", title: "Socio-religious reform movements" },
            { id: "inc-early", title: "Foundation of INC · Moderates & Extremists" },
            { id: "swadeshi", title: "Partition of Bengal & Swadeshi movement" },
            { id: "revolutionary", title: "Revolutionary movements in India & abroad" },
            { id: "gandhian-era", title: "Gandhian era (Non-Cooperation, Civil Disobedience, Quit India)" },
            { id: "constitutional-devs", title: "Constitutional developments (1773–1947 Acts)" },
            { id: "peasant-tribal", title: "Peasant, tribal & working-class movements" },
            { id: "towards-freedom", title: "Independence & Partition (1940–47)" },
          ],
        },
        {
          id: "culture",
          title: "Art & Culture",
          children: [
            { id: "architecture", title: "Architecture (temple styles, Indo-Islamic, colonial)" },
            { id: "sculpture-painting", title: "Sculpture & painting traditions" },
            { id: "performing-arts", title: "Music, dance & theatre" },
            { id: "literature", title: "Languages & literature" },
            { id: "religion-philosophy", title: "Religion & schools of philosophy" },
            { id: "crafts-festivals", title: "Crafts, fairs & festivals; GI-tagged heritage" },
            { id: "institutions", title: "Cultural institutions & UNESCO listings" },
          ],
        },
      ],
    },
    {
      id: "geography",
      title: "Indian & World Geography",
      children: [
        {
          id: "physical",
          title: "Physical Geography",
          children: [
            { id: "geomorphology", title: "Geomorphology (earth's interior, landforms, plate tectonics)" },
            { id: "climatology", title: "Climatology (atmosphere, winds, cyclones, climate types)" },
            { id: "oceanography", title: "Oceanography (currents, tides, ocean resources)" },
            { id: "biogeography", title: "Soils & biogeography" },
          ],
        },
        {
          id: "india",
          title: "Geography of India",
          children: [
            { id: "physiography", title: "Physiographic divisions" },
            { id: "drainage", title: "Drainage systems & river basins" },
            { id: "climate", title: "Climate & the monsoon" },
            { id: "soils", title: "Soils of India" },
            { id: "vegetation", title: "Natural vegetation & wildlife" },
            { id: "agriculture", title: "Agriculture (cropping patterns, irrigation)" },
            { id: "resources", title: "Mineral & energy resources" },
            { id: "industries", title: "Industries & industrial regions" },
            { id: "population", title: "Population, migration & urbanisation" },
            { id: "transport", title: "Transport & communication networks" },
          ],
        },
        {
          id: "world",
          title: "World Geography & Map Work",
          children: [
            { id: "continents", title: "Continents & major regions overview" },
            { id: "economic", title: "World economic geography (resources, industries)" },
            { id: "mapping", title: "Places in news & map-based questions" },
          ],
        },
      ],
    },
    {
      id: "polity",
      title: "Indian Polity & Governance",
      children: [
        {
          id: "constitution",
          title: "Constitutional Framework",
          children: [
            { id: "making", title: "Making & sources of the Constitution" },
            { id: "features-preamble", title: "Salient features & the Preamble" },
            { id: "citizenship", title: "Citizenship" },
            { id: "fundamental-rights", title: "Fundamental Rights" },
            { id: "dpsp", title: "Directive Principles of State Policy" },
            { id: "fundamental-duties", title: "Fundamental Duties" },
            { id: "amendment", title: "Amendment procedure & Basic Structure doctrine" },
          ],
        },
        {
          id: "union-state",
          title: "Union & State Governments",
          children: [
            { id: "president", title: "President & Vice-President" },
            { id: "pm-com", title: "Prime Minister & Council of Ministers" },
            { id: "parliament", title: "Parliament (structure, functioning, privileges)" },
            { id: "judiciary", title: "Supreme Court, High Courts & the judicial system" },
            { id: "state-executive", title: "Governor, CM & State Legislatures" },
          ],
        },
        {
          id: "federalism-local",
          title: "Federalism & Local Governance",
          children: [
            { id: "centre-state", title: "Centre–State relations" },
            { id: "emergency", title: "Emergency provisions" },
            { id: "panchayati-raj", title: "Panchayati Raj & municipalities (73rd/74th Amendments)" },
            { id: "ut-special", title: "Union Territories & special-status provisions" },
          ],
        },
        {
          id: "bodies",
          title: "Constitutional & Non-Constitutional Bodies",
          children: [
            { id: "election-commission", title: "Election Commission & electoral process (RPA)" },
            { id: "constitutional-bodies", title: "Constitutional bodies (CAG, UPSC, Finance Commission, AG)" },
            { id: "statutory-bodies", title: "Statutory & regulatory bodies (NHRC, CIC, NITI Aayog, others)" },
          ],
        },
        {
          id: "governance",
          title: "Governance & Public Policy",
          children: [
            { id: "rights-issues", title: "Rights issues & landmark judgments" },
            { id: "acts-policies", title: "Important acts & policies (RTI, RTE, others)" },
          ],
        },
      ],
    },
    {
      id: "economy",
      title: "Economic & Social Development",
      children: [
        {
          id: "basics",
          title: "Core Economic Concepts",
          children: [
            { id: "national-income", title: "National income & growth accounting (GDP, GNP)" },
            { id: "money-banking", title: "Money, banking & RBI (monetary policy)" },
            { id: "inflation", title: "Inflation & price indices" },
            { id: "fiscal-policy", title: "Fiscal policy, budget & taxation" },
            { id: "financial-markets", title: "Financial markets & institutions" },
            { id: "external-sector", title: "External sector (BoP, trade, exchange rate, FDI)" },
          ],
        },
        {
          id: "development",
          title: "Development & Inclusion",
          children: [
            { id: "planning", title: "Planning & economic reforms since 1991" },
            { id: "poverty", title: "Poverty, inequality & unemployment" },
            { id: "hdi-demographics", title: "Human development & demographics" },
            { id: "inclusion", title: "Financial & social inclusion" },
            { id: "sustainable-development", title: "Sustainable development & SDGs" },
          ],
        },
        {
          id: "sectors",
          title: "Sectors of the Economy",
          children: [
            { id: "agriculture", title: "Agriculture & allied sectors (MSP, subsidies, reforms)" },
            { id: "industry", title: "Industry & infrastructure" },
            { id: "services", title: "Services & the digital economy" },
          ],
        },
        {
          id: "schemes",
          title: "Government Schemes & Social-Sector Initiatives",
          children: [
            { id: "welfare-schemes", title: "Major welfare & flagship schemes" },
            { id: "health-education", title: "Health & education initiatives" },
          ],
        },
      ],
    },
    {
      id: "environment",
      title: "Environment, Ecology & Climate Change",
      children: [
        { id: "ecology-basics", title: "Ecology & ecosystem fundamentals" },
        { id: "biodiversity", title: "Biodiversity & its conservation (hotspots, protected areas)" },
        { id: "climate-change", title: "Climate change (science, impacts, mitigation, adaptation)" },
        { id: "pollution", title: "Pollution (air, water, soil, waste management)" },
        { id: "conventions", title: "International conventions & organisations (UNFCCC, CBD, others)" },
        { id: "laws-bodies", title: "Indian environmental laws & institutions" },
      ],
    },
    {
      id: "science",
      title: "General Science & Technology",
      children: [
        { id: "physics", title: "Physics in everyday life" },
        { id: "chemistry", title: "Chemistry in everyday life" },
        { id: "biology", title: "Biology (human body, diseases, nutrition)" },
        { id: "biotech", title: "Biotechnology & genetics" },
        { id: "space", title: "Space technology & ISRO missions" },
        { id: "it-emerging", title: "IT, AI & emerging technologies" },
        { id: "defence-nuclear", title: "Defence & nuclear technology" },
      ],
    },
    {
      id: "current-affairs",
      title: "Current Events of National & International Importance",
      children: [
        { id: "national", title: "National developments" },
        { id: "international", title: "International developments" },
        { id: "reports-indices", title: "Reports, indices & summits" },
        { id: "awards-sports", title: "Awards, persons & sports in news" },
      ],
    },
  ],
};

export const prelimsCSAT: SyllabusNodeDef = {
  id: "csat",
  title: "Paper II — CSAT (Qualifying)",
  description:
    "200 marks · 80 questions · 2 hours. Qualifying paper — requires 33% (66 marks).",
  children: [
    { id: "comprehension", title: "Comprehension" },
    { id: "communication", title: "Interpersonal skills including communication skills" },
    { id: "reasoning", title: "Logical reasoning & analytical ability" },
    { id: "decision-making", title: "Decision making & problem solving" },
    { id: "mental-ability", title: "General mental ability" },
    { id: "numeracy", title: "Basic numeracy (numbers, magnitudes — Class X level)" },
    { id: "data-interpretation", title: "Data interpretation (charts, graphs, tables — Class X level)" },
  ],
};
