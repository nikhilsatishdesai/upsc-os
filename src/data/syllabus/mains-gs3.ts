import type { SyllabusNodeDef } from "./types";

export const mainsGS3: SyllabusNodeDef = {
  id: "gs3",
  title: "GS Paper III — Economy, Technology, Environment, Security & DM",
  description:
    "250 marks · Technology, Economic Development, Bio-diversity, Environment, Security and Disaster Management.",
  children: [
    {
      id: "economy",
      title: "Indian Economy & Development",
      children: [
        { id: "planning-growth", title: "Indian economy — planning, mobilisation of resources, growth, development & employment" },
        { id: "inclusive-growth", title: "Inclusive growth & issues arising from it" },
        { id: "budgeting", title: "Government budgeting" },
        { id: "liberalization", title: "Effects of liberalisation on the economy; changes in industrial policy & their effects on industrial growth" },
        { id: "infrastructure", title: "Infrastructure — energy, ports, roads, airports, railways" },
        { id: "investment-models", title: "Investment models (PPP & others)" },
      ],
    },
    {
      id: "agriculture",
      title: "Agriculture & Food Management",
      children: [
        { id: "cropping", title: "Major crops & cropping patterns; irrigation systems; storage, transport & marketing of produce" },
        { id: "farmers-aids", title: "E-technology in aid of farmers" },
        { id: "subsidies-msp", title: "Farm subsidies & MSP; issues of direct & indirect subsidies" },
        { id: "pds-food-security", title: "PDS (objectives, functioning, limitations); buffer stocks & food security" },
        { id: "technology-missions", title: "Technology missions" },
        { id: "animal-rearing", title: "Economics of animal-rearing" },
        { id: "food-processing", title: "Food processing & related industries — scope, significance, location, supply-chain management" },
        { id: "land-reforms", title: "Land reforms in India" },
      ],
    },
    {
      id: "science-tech",
      title: "Science & Technology",
      children: [
        { id: "developments", title: "S&T developments & their applications and effects in everyday life" },
        { id: "achievements", title: "Achievements of Indians in S&T; indigenisation & developing new technology" },
        { id: "awareness-fields", title: "Awareness in IT, space, computers, robotics, nanotechnology, biotechnology" },
        { id: "ipr", title: "Issues relating to intellectual property rights" },
      ],
    },
    {
      id: "environment",
      title: "Environment & Disaster Management",
      children: [
        { id: "conservation", title: "Conservation; environmental pollution & degradation; environmental impact assessment" },
        { id: "disaster-management", title: "Disaster & disaster management" },
      ],
    },
    {
      id: "security",
      title: "Internal Security",
      children: [
        { id: "extremism", title: "Linkages between development & spread of extremism" },
        { id: "external-actors", title: "Role of external state & non-state actors in creating internal security challenges" },
        { id: "cyber-media", title: "Challenges via communication networks, media & social media; cyber security basics; money laundering & its prevention" },
        { id: "border-security", title: "Security challenges & their management in border areas; linkages of organised crime with terrorism" },
        { id: "security-forces", title: "Various security forces & agencies and their mandate" },
      ],
    },
  ],
};
