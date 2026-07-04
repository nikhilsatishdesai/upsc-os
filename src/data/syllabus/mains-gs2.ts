import type { SyllabusNodeDef } from "./types";

export const mainsGS2: SyllabusNodeDef = {
  id: "gs2",
  title: "GS Paper II — Governance, Constitution, Polity, Social Justice & IR",
  description:
    "250 marks · Governance, Constitution, Polity, Social Justice and International Relations.",
  children: [
    {
      id: "constitution",
      title: "Indian Constitution",
      children: [
        { id: "evolution", title: "Historical underpinnings, evolution, features, amendments, significant provisions & basic structure" },
        { id: "federal-structure", title: "Functions & responsibilities of the Union and States; federal structure issues & challenges" },
        { id: "devolution", title: "Devolution of powers & finances to local levels; challenges therein" },
        { id: "separation-powers", title: "Separation of powers; dispute-redressal mechanisms & institutions" },
        { id: "comparison", title: "Comparison of the Indian constitutional scheme with other countries" },
      ],
    },
    {
      id: "polity",
      title: "Polity & Institutions",
      children: [
        { id: "parliament-legislatures", title: "Parliament & State legislatures — structure, functioning, conduct of business, powers & privileges" },
        { id: "executive-judiciary", title: "Executive & judiciary — structure, organisation & functioning; ministries & departments" },
        { id: "pressure-groups", title: "Pressure groups & formal/informal associations in the polity" },
        { id: "rpa", title: "Salient features of the Representation of People's Act" },
        { id: "constitutional-posts", title: "Appointment to constitutional posts; powers, functions & responsibilities of constitutional bodies" },
        { id: "statutory-bodies", title: "Statutory, regulatory & quasi-judicial bodies" },
      ],
    },
    {
      id: "governance",
      title: "Governance",
      children: [
        { id: "policies", title: "Government policies & interventions; issues in design & implementation" },
        { id: "development-industry", title: "Development processes & the development industry — NGOs, SHGs, groups, donors, charities" },
        { id: "transparency", title: "Transparency & accountability; e-governance (models, successes, limitations, potential)" },
        { id: "citizens-charters", title: "Citizens' charters & institutional measures" },
        { id: "civil-services", title: "Role of civil services in a democracy" },
      ],
    },
    {
      id: "social-justice",
      title: "Social Justice",
      children: [
        { id: "welfare-schemes", title: "Welfare schemes for vulnerable sections; performance of these schemes" },
        { id: "protection-bodies", title: "Mechanisms, laws, institutions & bodies for protection of vulnerable sections" },
        { id: "health-education-hr", title: "Issues in development & management of health, education & human resources" },
        { id: "poverty-hunger", title: "Issues relating to poverty & hunger" },
      ],
    },
    {
      id: "ir",
      title: "International Relations",
      children: [
        { id: "neighborhood", title: "India & its neighbourhood — relations" },
        { id: "groupings", title: "Bilateral, regional & global groupings involving India or affecting India's interests" },
        { id: "policies-effect", title: "Effect of policies of developed & developing countries on India's interests; Indian diaspora" },
        { id: "institutions", title: "Important international institutions & agencies — structure & mandate" },
      ],
    },
  ],
};
