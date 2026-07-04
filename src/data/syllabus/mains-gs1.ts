import type { SyllabusNodeDef } from "./types";

export const mainsGS1: SyllabusNodeDef = {
  id: "gs1",
  title: "GS Paper I — Heritage, History, Geography & Society",
  description:
    "250 marks · Indian Heritage and Culture, History and Geography of the World and Society.",
  children: [
    {
      id: "culture",
      title: "Indian Heritage & Culture",
      children: [
        { id: "art-forms", title: "Salient aspects of art forms from ancient to modern times" },
        { id: "literature", title: "Indian literature through the ages" },
        { id: "architecture", title: "Architecture from ancient to modern times" },
      ],
    },
    {
      id: "modern-history",
      title: "Modern Indian History",
      children: [
        { id: "events-mid-18th", title: "Significant events from the mid-18th century to the present" },
        { id: "personalities", title: "Important personalities & their contributions" },
        { id: "issues", title: "Key issues of the colonial period" },
      ],
    },
    {
      id: "freedom-struggle",
      title: "The Freedom Struggle",
      children: [
        { id: "stages", title: "Various stages of the freedom struggle" },
        { id: "contributors", title: "Important contributors from different parts of the country" },
        { id: "contributions", title: "Different streams: moderates, extremists, revolutionaries, Gandhian mass movements" },
      ],
    },
    {
      id: "post-independence",
      title: "Post-Independence India",
      children: [
        { id: "consolidation", title: "Consolidation of the nation (integration of states, linguistic reorganisation)" },
        { id: "reorganization", title: "Reorganisation within the country after 1947" },
      ],
    },
    {
      id: "world-history",
      title: "History of the World (from the 18th century)",
      children: [
        { id: "industrial-revolution", title: "Industrial Revolution" },
        { id: "world-wars", title: "World Wars I & II" },
        { id: "boundaries", title: "Redrawal of national boundaries" },
        { id: "colonization", title: "Colonisation & decolonisation" },
        { id: "political-philosophies", title: "Political philosophies (communism, capitalism, socialism) & their effects on society" },
      ],
    },
    {
      id: "society",
      title: "Indian Society",
      children: [
        { id: "salient-features", title: "Salient features of Indian society; diversity of India" },
        { id: "women", title: "Role of women & women's organisations" },
        { id: "population", title: "Population & associated issues" },
        { id: "poverty-development", title: "Poverty & developmental issues" },
        { id: "urbanization", title: "Urbanisation — problems & remedies" },
        { id: "globalization", title: "Effects of globalisation on Indian society" },
        { id: "empowerment", title: "Social empowerment" },
        { id: "communalism", title: "Communalism, regionalism & secularism" },
      ],
    },
    {
      id: "geography",
      title: "Geography of the World",
      children: [
        { id: "physical-features", title: "Salient features of the world's physical geography" },
        { id: "resources", title: "Distribution of key natural resources (South Asia, Indian subcontinent, world)" },
        { id: "industries-location", title: "Factors for the location of industries (primary, secondary, tertiary) in India & the world" },
        { id: "geophysical-phenomena", title: "Important geophysical phenomena (earthquakes, tsunami, volcanic activity, cyclones)" },
        { id: "changing-features", title: "Changes in critical geographical features (water bodies, ice caps, flora & fauna) & their effects" },
      ],
    },
  ],
};
