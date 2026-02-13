/**
 * GEDCOM 5.5.1 parser and generator for genealogy import/export.
 * Supports basic individual, family, and relationship records.
 */

interface GedcomIndividual {
  id: string;
  fullName: string;
  gender: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  familyIds: string[];
}

interface GedcomFamily {
  id: string;
  husbandId: string | null;
  wifeId: string | null;
  childIds: string[];
}

interface GedcomData {
  individuals: GedcomIndividual[];
  families: GedcomFamily[];
}

/**
 * Parse a GEDCOM 5.5.1 file content into structured data.
 * @param content - Raw GEDCOM text content
 * @returns Parsed GEDCOM data
 */
export function parseGedcom(content: string): GedcomData {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const individuals: GedcomIndividual[] = [];
  const families: GedcomFamily[] = [];

  let currentRecord: 'INDI' | 'FAM' | null = null;
  let currentIndividual: Partial<GedcomIndividual> | null = null;
  let currentFamily: Partial<GedcomFamily> | null = null;
  let currentTag: string | null = null;

  for (const line of lines) {
    const match = line.match(/^(\d+)\s+(@\S+@\s+)?(\S+)\s*(.*)?$/);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const xref = match[2]?.trim();
    const tag = match[3];
    const value = match[4]?.trim() ?? '';

    if (level === 0) {
      // Save previous record
      if (currentIndividual?.id) {
        individuals.push({
          id: currentIndividual.id,
          fullName: currentIndividual.fullName ?? 'Unknown',
          gender: currentIndividual.gender ?? null,
          birthDate: currentIndividual.birthDate ?? null,
          birthPlace: currentIndividual.birthPlace ?? null,
          deathDate: currentIndividual.deathDate ?? null,
          deathPlace: currentIndividual.deathPlace ?? null,
          familyIds: currentIndividual.familyIds ?? [],
        });
      }
      if (currentFamily?.id) {
        families.push({
          id: currentFamily.id,
          husbandId: currentFamily.husbandId ?? null,
          wifeId: currentFamily.wifeId ?? null,
          childIds: currentFamily.childIds ?? [],
        });
      }

      currentIndividual = null;
      currentFamily = null;
      currentTag = null;

      if (tag === 'INDI') {
        currentRecord = 'INDI';
        currentIndividual = { id: xref?.replace(/@/g, '') ?? '', familyIds: [] };
      } else if (tag === 'FAM') {
        currentRecord = 'FAM';
        currentFamily = { id: xref?.replace(/@/g, '') ?? '', childIds: [] };
      } else {
        currentRecord = null;
      }
      continue;
    }

    if (currentRecord === 'INDI' && currentIndividual) {
      if (level === 1) {
        currentTag = tag;
        if (tag === 'NAME') {
          currentIndividual.fullName = value.replace(/\//g, '').trim();
        } else if (tag === 'SEX') {
          currentIndividual.gender = value === 'M' ? 'male' : value === 'F' ? 'female' : 'other';
        } else if (tag === 'FAMS' || tag === 'FAMC') {
          currentIndividual.familyIds?.push(value.replace(/@/g, ''));
        }
      } else if (level === 2 && currentTag) {
        if (currentTag === 'BIRT') {
          if (tag === 'DATE') currentIndividual.birthDate = value;
          if (tag === 'PLAC') currentIndividual.birthPlace = value;
        } else if (currentTag === 'DEAT') {
          if (tag === 'DATE') currentIndividual.deathDate = value;
          if (tag === 'PLAC') currentIndividual.deathPlace = value;
        }
      }
    }

    if (currentRecord === 'FAM' && currentFamily) {
      if (level === 1) {
        if (tag === 'HUSB') currentFamily.husbandId = value.replace(/@/g, '');
        if (tag === 'WIFE') currentFamily.wifeId = value.replace(/@/g, '');
        if (tag === 'CHIL') currentFamily.childIds?.push(value.replace(/@/g, ''));
      }
    }
  }

  // Save last record
  if (currentIndividual?.id) {
    individuals.push({
      id: currentIndividual.id,
      fullName: currentIndividual.fullName ?? 'Unknown',
      gender: currentIndividual.gender ?? null,
      birthDate: currentIndividual.birthDate ?? null,
      birthPlace: currentIndividual.birthPlace ?? null,
      deathDate: currentIndividual.deathDate ?? null,
      deathPlace: currentIndividual.deathPlace ?? null,
      familyIds: currentIndividual.familyIds ?? [],
    });
  }
  if (currentFamily?.id) {
    families.push({
      id: currentFamily.id,
      husbandId: currentFamily.husbandId ?? null,
      wifeId: currentFamily.wifeId ?? null,
      childIds: currentFamily.childIds ?? [],
    });
  }

  return { individuals, families };
}

/**
 * Generate GEDCOM 5.5.1 content from genealogy profiles and relationships.
 * @param profiles - Genealogy profiles
 * @param relationships - Family relationships
 * @returns GEDCOM formatted string
 */
export function generateGedcom(
  profiles: Array<{ id: string; full_name: string; gender?: string; birth_date?: string; birth_place?: string; death_date?: string; death_place?: string }>,
  relationships: Array<{ user_a_id: string; user_b_id: string; relation_type: string }>,
): string {
  const lines: string[] = [];
  lines.push('0 HEAD');
  lines.push('1 SOUR nSelf-Family');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');

  // Individuals
  for (const p of profiles) {
    lines.push(`0 @${p.id}@ INDI`);
    lines.push(`1 NAME ${p.full_name}`);
    if (p.gender) {
      lines.push(`1 SEX ${p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : 'U'}`);
    }
    if (p.birth_date || p.birth_place) {
      lines.push('1 BIRT');
      if (p.birth_date) lines.push(`2 DATE ${p.birth_date}`);
      if (p.birth_place) lines.push(`2 PLAC ${p.birth_place}`);
    }
    if (p.death_date || p.death_place) {
      lines.push('1 DEAT');
      if (p.death_date) lines.push(`2 DATE ${p.death_date}`);
      if (p.death_place) lines.push(`2 PLAC ${p.death_place}`);
    }
  }

  // Families from spouse relationships
  let familyIdx = 1;
  const spouseRels = relationships.filter((r) => r.relation_type === 'spouse');
  for (const rel of spouseRels) {
    const famId = `F${familyIdx++}`;
    lines.push(`0 @${famId}@ FAM`);
    lines.push(`1 HUSB @${rel.user_a_id}@`);
    lines.push(`1 WIFE @${rel.user_b_id}@`);

    // Find children of this couple
    const childRels = relationships.filter(
      (r) => r.relation_type === 'child' &&
        (r.user_b_id === rel.user_a_id || r.user_b_id === rel.user_b_id),
    );
    for (const c of childRels) {
      lines.push(`1 CHIL @${c.user_a_id}@`);
    }
  }

  lines.push('0 TRLR');
  return lines.join('\n');
}

export type { GedcomData, GedcomIndividual, GedcomFamily };
