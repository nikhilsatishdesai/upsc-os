/**
 * Raw syllabus definition as authored in the data files.
 * `id` is a short slug that must be unique among its siblings;
 * full node IDs are computed by joining slugs with "." (see src/lib/syllabus.ts).
 */
export type SyllabusNodeDef = {
  id: string;
  title: string;
  description?: string;
  children?: SyllabusNodeDef[];
};
