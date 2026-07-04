import type { SyllabusNodeDef } from "./types";

export const mainsGS4: SyllabusNodeDef = {
  id: "gs4",
  title: "GS Paper IV — Ethics, Integrity & Aptitude",
  description:
    "250 marks · Tests attitude and approach to issues of integrity and probity in public life; includes case studies.",
  children: [
    {
      id: "ethics-interface",
      title: "Ethics & Human Interface",
      children: [
        { id: "essence", title: "Essence, determinants & consequences of ethics in human actions" },
        { id: "dimensions", title: "Dimensions of ethics; ethics in private & public relationships" },
        { id: "human-values", title: "Human values — lessons from great leaders, reformers & administrators" },
        { id: "value-inculcation", title: "Role of family, society & educational institutions in inculcating values" },
      ],
    },
    {
      id: "attitude",
      title: "Attitude",
      children: [
        { id: "content-structure", title: "Content, structure & function of attitude" },
        { id: "influence", title: "Attitude's influence & relation with thought and behaviour" },
        { id: "moral-political", title: "Moral & political attitudes" },
        { id: "persuasion", title: "Social influence & persuasion" },
      ],
    },
    {
      id: "aptitude-values",
      title: "Aptitude & Foundational Values for Civil Service",
      children: [
        { id: "integrity", title: "Integrity, impartiality & non-partisanship" },
        { id: "objectivity", title: "Objectivity, dedication to public service" },
        { id: "empathy", title: "Empathy, tolerance & compassion towards weaker sections" },
      ],
    },
    {
      id: "emotional-intelligence",
      title: "Emotional Intelligence",
      children: [
        { id: "concepts", title: "Concepts of emotional intelligence" },
        { id: "application", title: "Utility & application in administration & governance" },
      ],
    },
    {
      id: "thinkers",
      title: "Moral Thinkers & Philosophers",
      children: [
        { id: "indian", title: "Contributions of moral thinkers & philosophers from India" },
        { id: "world", title: "Contributions of moral thinkers & philosophers from the world" },
      ],
    },
    {
      id: "public-service-values",
      title: "Public/Civil Service Values & Ethics in Public Administration",
      children: [
        { id: "status-problems", title: "Status & problems; ethical concerns & dilemmas in government & private institutions" },
        { id: "guidance-sources", title: "Laws, rules, regulations & conscience as sources of ethical guidance" },
        { id: "accountability", title: "Accountability & ethical governance" },
        { id: "strengthening", title: "Strengthening ethical & moral values in governance" },
        { id: "international-ethics", title: "Ethical issues in international relations & funding" },
        { id: "corporate-governance", title: "Corporate governance" },
      ],
    },
    {
      id: "probity",
      title: "Probity in Governance",
      children: [
        { id: "concept", title: "Concept of public service; philosophical basis of governance & probity" },
        { id: "information-sharing", title: "Information sharing & transparency; Right to Information" },
        { id: "codes", title: "Codes of ethics & codes of conduct" },
        { id: "citizens-charters", title: "Citizens' charters" },
        { id: "work-culture", title: "Work culture & quality of service delivery" },
        { id: "public-funds", title: "Utilisation of public funds" },
        { id: "corruption", title: "Challenges of corruption" },
      ],
    },
    {
      id: "case-studies",
      title: "Case Studies",
      children: [
        { id: "practice", title: "Case studies on the above issues" },
      ],
    },
  ],
};
