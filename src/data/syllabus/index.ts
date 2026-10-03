import type { SyllabusNodeDef } from "./types";
import { prelimsGS, prelimsCSAT } from "./prelims";
import { mainsGS1 } from "./mains-gs1";
import { mainsGS2 } from "./mains-gs2";
import { mainsGS3 } from "./mains-gs3";
import { mainsGS4 } from "./mains-gs4";
import { mainsEssay, mainsLanguages } from "./mains-other";
import { mainsPsir1, mainsPsir2 } from "./mains-psir";

/**
 * The complete UPSC Civil Services Examination syllabus, structured from the
 * official UPSC notification. Prelims broad headings are expanded into the
 * standard topic breakdown aspirants actually study and track.
 */
export const syllabusTree: SyllabusNodeDef[] = [
  {
    id: "prelims",
    title: "Preliminary Examination",
    description:
      "Objective screening stage: two papers on the same day. Paper I decides the cut-off; CSAT is qualifying.",
    children: [prelimsGS, prelimsCSAT],
  },
  {
    id: "mains",
    title: "Main Examination",
    description:
      "Written descriptive stage: Essay + four GS papers + two optional papers (PSIR), plus two qualifying language papers.",
    children: [
      mainsEssay,
      mainsGS1,
      mainsGS2,
      mainsGS3,
      mainsGS4,
      mainsPsir1,
      mainsPsir2,
      mainsLanguages,
    ],
  },
];

export type { SyllabusNodeDef } from "./types";
