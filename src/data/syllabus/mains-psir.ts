import type { SyllabusNodeDef } from "./types";

/**
 * Optional subject: Political Science & International Relations (PSIR).
 *
 * Structured from the official UPSC CSE notification. Each numbered
 * syllabus item becomes a unit (the planner's "subject" for rotation) and
 * its explicit sub-points become trackable leaf topics, so every thinker,
 * theory and relationship UPSC names can be studied, revised and planned
 * on its own. Ids are permanent — never rename them.
 */

export const mainsPsir1: SyllabusNodeDef = {
  id: "psir1",
  title: "PSIR Paper I — Political Theory & Indian Politics",
  description:
    "Optional · 250 marks · 3 hours. Section A: Political Theory & Thought. Section B: Indian Government & Politics. Answer 5 of 8 questions — Q1 & Q5 compulsory.",
  children: [
    /* ---------------- Section A — Political Theory ---------------- */
    {
      id: "theory",
      title: "A1–2 · Political Theory & Theories of the State",
      description:
        "Meaning and approaches of political theory; Liberal, Neo-liberal, Marxist, Pluralist, Post-colonial and Feminist theories of the State.",
      children: [
        {
          id: "meaning-approaches",
          title:
            "Political theory: meaning & approaches (normative, historical, empirical, behavioural, post-behavioural; decline & resurgence debate)",
        },
        { id: "state-liberal", title: "Theories of the State: Liberal & Neo-liberal" },
        { id: "state-marxist-pluralist", title: "Theories of the State: Marxist & Pluralist" },
        { id: "state-postcolonial-feminist", title: "Theories of the State: Post-colonial & Feminist" },
      ],
    },
    {
      id: "concepts",
      title: "A3–7 · Justice, Equality, Rights, Democracy & Power",
      description:
        "The core concepts of political theory — the most frequently examined block of Paper I.",
      children: [
        {
          id: "justice",
          title: "Justice: conceptions of justice; Rawls' theory of justice & its communitarian critiques",
        },
        {
          id: "equality",
          title: "Equality: social, political & economic; equality vs freedom; affirmative action",
        },
        {
          id: "rights",
          title: "Rights: meaning & theories; kinds of rights; the concept of human rights",
        },
        {
          id: "democracy",
          title:
            "Democracy: classical & contemporary theories; representative, participatory & deliberative models",
        },
        { id: "power-hegemony", title: "Power, hegemony, ideology & legitimacy" },
      ],
    },
    {
      id: "ideologies",
      title: "A8 · Political Ideologies",
      children: [
        { id: "liberalism", title: "Liberalism" },
        { id: "socialism", title: "Socialism" },
        { id: "marxism", title: "Marxism" },
        { id: "fascism", title: "Fascism" },
        { id: "gandhism", title: "Gandhism" },
        { id: "feminism", title: "Feminism" },
      ],
    },
    {
      id: "indian-thought",
      title: "A9 · Indian Political Thought",
      children: [
        { id: "traditions", title: "Dharmashastra, Arthashastra & Buddhist traditions" },
        { id: "sir-syed", title: "Sir Syed Ahmed Khan" },
        { id: "aurobindo", title: "Sri Aurobindo" },
        { id: "gandhi", title: "M.K. Gandhi" },
        { id: "ambedkar", title: "B.R. Ambedkar" },
        { id: "mn-roy", title: "M.N. Roy" },
      ],
    },
    {
      id: "western-thought",
      title: "A10 · Western Political Thought",
      children: [
        { id: "plato", title: "Plato" },
        { id: "aristotle", title: "Aristotle" },
        { id: "machiavelli", title: "Machiavelli" },
        { id: "hobbes", title: "Hobbes" },
        { id: "locke", title: "Locke" },
        { id: "mill", title: "John Stuart Mill" },
        { id: "marx", title: "Karl Marx" },
        { id: "gramsci", title: "Antonio Gramsci" },
        { id: "arendt", title: "Hannah Arendt" },
      ],
    },

    /* ---------------- Section B — Indian Government & Politics ---------------- */
    {
      id: "nationalism",
      title: "B1 · Indian Nationalism",
      children: [
        {
          id: "strategies",
          title:
            "Political strategies of the freedom struggle: constitutionalism to mass satyagraha, Non-cooperation, Civil Disobedience",
        },
        {
          id: "militant-movements",
          title: "Militant & revolutionary movements; peasant & workers' movements",
        },
        {
          id: "perspectives",
          title:
            "Perspectives on the national movement: Liberal, Socialist, Marxist, Radical humanist & Dalit",
        },
      ],
    },
    {
      id: "constitution",
      title: "B2–3 · Making & Salient Features of the Constitution",
      children: [
        {
          id: "making",
          title: "Making of the Constitution: legacies of British rule; social & political perspectives",
        },
        {
          id: "preamble-rights",
          title: "The Preamble, Fundamental Rights & Duties, Directive Principles",
        },
        {
          id: "parliamentary-amendment",
          title: "Parliamentary system & amendment procedures",
        },
        { id: "judicial-review", title: "Judicial review & the basic structure doctrine" },
      ],
    },
    {
      id: "organs",
      title: "B4 · Principal Organs of the Union & State Governments",
      description: "Envisaged role versus actual working — the recurring frame of every question here.",
      children: [
        { id: "union-executive", title: "Union executive: envisaged role & actual working" },
        { id: "parliament", title: "Union legislature (Parliament): envisaged role & actual working" },
        {
          id: "supreme-court",
          title: "Supreme Court: envisaged role & actual working (judicial activism, PIL)",
        },
        {
          id: "state-government",
          title: "State executive, legislature & High Courts: envisaged role & actual working",
        },
      ],
    },
    {
      id: "grassroots",
      title: "B5 · Grassroots Democracy",
      children: [
        {
          id: "panchayati-raj",
          title: "Panchayati Raj & municipal government; significance of the 73rd & 74th Amendments",
        },
        { id: "grassroot-movements", title: "Grassroot movements" },
      ],
    },
    {
      id: "institutions",
      title: "B6 · Statutory Institutions & Commissions",
      children: [
        {
          id: "ec-cag-fc-upsc",
          title: "Election Commission, CAG, Finance Commission & UPSC",
        },
        {
          id: "commissions",
          title:
            "National Commissions: SCs, STs, Women, Human Rights, Minorities & Backward Classes",
        },
      ],
    },
    {
      id: "federalism",
      title: "B7 · Federalism",
      children: [
        {
          id: "provisions-relations",
          title: "Constitutional provisions; changing nature of Centre–State relations",
        },
        {
          id: "regionalism-disputes",
          title: "Integrationist tendencies, regional aspirations & inter-state disputes",
        },
      ],
    },
    {
      id: "planning",
      title: "B8 · Planning & Economic Development",
      children: [
        {
          id: "perspectives",
          title: "Nehruvian & Gandhian perspectives; role of planning & the public sector",
        },
        { id: "agrarian", title: "Green Revolution, land reforms & agrarian relations" },
        { id: "liberalisation", title: "Liberalisation & economic reforms" },
      ],
    },
    {
      id: "identity",
      title: "B9 · Caste, Religion & Ethnicity in Indian Politics",
      children: [
        { id: "caste", title: "Caste in Indian politics" },
        { id: "religion", title: "Religion, secularism & communalism in Indian politics" },
        { id: "ethnicity", title: "Ethnicity & identity politics" },
      ],
    },
    {
      id: "party-system",
      title: "B10 · Party System & Electoral Behaviour",
      children: [
        {
          id: "parties",
          title: "National & regional parties; ideological & social bases of parties",
        },
        { id: "coalitions", title: "Patterns of coalition politics" },
        { id: "pressure-groups", title: "Pressure groups" },
        {
          id: "electoral-behaviour",
          title: "Trends in electoral behaviour; changing socio-economic profile of legislators",
        },
      ],
    },
    {
      id: "social-movements",
      title: "B11 · Social Movements",
      children: [
        { id: "civil-liberties", title: "Civil liberties & human rights movements" },
        { id: "womens", title: "Women's movements" },
        { id: "environmental", title: "Environmentalist movements" },
      ],
    },
  ],
};

export const mainsPsir2: SyllabusNodeDef = {
  id: "psir2",
  title: "PSIR Paper II — Comparative Politics & International Relations",
  description:
    "Optional · 250 marks · 3 hours. Section A: Comparative Analysis & International Politics. Section B: India & the World. Answer 5 of 8 questions — Q1 & Q5 compulsory.",
  children: [
    /* ---------------- Section A — Comparative & International Politics ---------------- */
    {
      id: "comparative",
      title: "A1–4 · Comparative Politics",
      children: [
        {
          id: "nature-approaches",
          title:
            "Comparative politics: nature & major approaches; political economy & political sociology perspectives; limitations of the comparative method",
        },
        {
          id: "state",
          title:
            "The State in comparative perspective: capitalist vs socialist economies; advanced industrial vs developing societies",
        },
        {
          id: "representation",
          title:
            "Politics of representation & participation: parties, pressure groups & social movements",
        },
        {
          id: "globalisation",
          title: "Globalisation: responses from developed & developing societies",
        },
      ],
    },
    {
      id: "ir-theory",
      title: "A5–6 · Approaches & Key Concepts in IR",
      children: [
        {
          id: "approaches",
          title: "Approaches to IR: Idealist, Realist, Marxist, Functionalist & Systems theory",
        },
        {
          id: "power-security",
          title: "National interest, security & power; balance of power & deterrence",
        },
        { id: "transnational", title: "Transnational actors & collective security" },
        { id: "world-economy", title: "World capitalist economy & globalisation" },
      ],
    },
    {
      id: "world-order",
      title: "A7 · Changing International Political Order",
      children: [
        {
          id: "cold-war",
          title: "Rise of superpowers; strategic & ideological bipolarity, arms race, Cold War & nuclear threat",
        },
        { id: "nam", title: "Non-Aligned Movement: aims & achievements" },
        {
          id: "unipolarity",
          title:
            "Collapse of the Soviet Union; unipolarity & American hegemony; relevance of non-alignment today",
        },
      ],
    },
    {
      id: "economic-system",
      title: "A8 · Evolution of the International Economic System",
      children: [
        { id: "bretton-woods-wto", title: "From Bretton Woods to the WTO" },
        {
          id: "cmea-nieo",
          title: "Socialist economies & the CMEA; Third World demand for a New International Economic Order",
        },
        { id: "globalisation", title: "Globalisation of the world economy" },
      ],
    },
    {
      id: "un",
      title: "A9 · United Nations",
      children: [
        { id: "role-record", title: "UN: envisaged role & actual record" },
        { id: "agencies", title: "Specialised UN agencies: aims & functioning" },
        { id: "reforms", title: "Need for UN reforms" },
      ],
    },
    {
      id: "regionalisation",
      title: "A10 · Regionalisation of World Politics",
      children: [
        { id: "eu", title: "European Union" },
        { id: "asean-apec", title: "ASEAN & APEC" },
        { id: "saarc", title: "SAARC" },
        { id: "nafta", title: "NAFTA (now USMCA)" },
      ],
    },
    {
      id: "global-concerns",
      title: "A11 · Contemporary Global Concerns",
      children: [
        { id: "democracy-hr", title: "Democracy & human rights" },
        { id: "environment", title: "Environment & climate politics" },
        { id: "gender", title: "Gender justice" },
        { id: "terrorism", title: "Terrorism" },
        { id: "nuclear", title: "Nuclear proliferation" },
      ],
    },

    /* ---------------- Section B — India and the World ---------------- */
    {
      id: "foreign-policy",
      title: "B1–2 · Indian Foreign Policy & Non-Alignment",
      children: [
        {
          id: "determinants",
          title: "Determinants of foreign policy; institutions of policy-making; continuity & change",
        },
        { id: "nam-role", title: "India's contribution to NAM: different phases & current role" },
      ],
    },
    {
      id: "south-asia",
      title: "B3 · India & South Asia",
      children: [
        {
          id: "saarc-safta",
          title: "Regional co-operation: SAARC's record & prospects; South Asia as a free-trade area",
        },
        { id: "look-east", title: "Look East / Act East policy" },
        {
          id: "impediments",
          title:
            "Impediments to co-operation: river-water disputes, illegal migration, ethnic conflicts & insurgencies, border disputes",
        },
        { id: "neighbours", title: "Bilateral relations with each neighbour" },
      ],
    },
    {
      id: "global-south",
      title: "B4 · India & the Global South",
      children: [
        { id: "africa-latam", title: "Relations with Africa & Latin America" },
        {
          id: "nieo-wto",
          title: "Leadership role in the demand for NIEO & in WTO negotiations",
        },
      ],
    },
    {
      id: "power-centres",
      title: "B5 · India & the Global Centres of Power",
      children: [
        { id: "usa", title: "India & the USA" },
        { id: "eu", title: "India & the European Union" },
        { id: "japan", title: "India & Japan" },
        { id: "china", title: "India & China" },
        { id: "russia", title: "India & Russia" },
      ],
    },
    {
      id: "un-system",
      title: "B6 · India & the UN System",
      children: [
        { id: "peacekeeping", title: "Role in UN peacekeeping" },
        { id: "unsc-seat", title: "Demand for a permanent seat in the Security Council" },
      ],
    },
    {
      id: "nuclear",
      title: "B7 · India & the Nuclear Question",
      children: [
        {
          id: "policy",
          title:
            "Changing perceptions & policy: NPT, CTBT, Pokhran, nuclear doctrine, Indo-US deal, NSG",
        },
      ],
    },
    {
      id: "recent",
      title: "B8 · Recent Developments in Indian Foreign Policy",
      description:
        "The current-affairs engine of Paper II — keep linking news here from the Current Affairs section of each topic.",
      children: [
        { id: "afghanistan-west-asia", title: "India's position on Afghanistan, Iraq & West Asia" },
        { id: "us-israel", title: "Growing relations with the US & Israel" },
        { id: "new-world-order", title: "Vision of a new world order (multipolarity, Global South, multi-alignment)" },
      ],
    },
  ],
};
