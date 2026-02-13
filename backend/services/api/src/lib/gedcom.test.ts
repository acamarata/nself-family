import { describe, it, expect } from 'vitest';
import { parseGedcom, generateGedcom } from './gedcom.js';

describe('gedcom', () => {
  describe('parseGedcom', () => {
    const sampleGedcom = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 BIRT
2 DATE 15 JAN 1950
2 PLAC New York
1 DEAT
2 DATE 1 MAR 2020
1 FAMS @F1@
0 @I2@ INDI
1 NAME Jane /Doe/
1 SEX F
1 BIRT
2 DATE 20 MAR 1952
1 FAMS @F1@
0 @I3@ INDI
1 NAME Bob /Smith/
1 SEX M
1 BIRT
2 DATE 5 JUN 1975
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR`;

    it('parses individuals', () => {
      const data = parseGedcom(sampleGedcom);
      expect(data.individuals).toHaveLength(3);

      const john = data.individuals[0];
      expect(john.fullName).toBe('John Smith');
      expect(john.gender).toBe('male');
      expect(john.birthDate).toBe('15 JAN 1950');
      expect(john.birthPlace).toBe('New York');
      expect(john.deathDate).toBe('1 MAR 2020');
    });

    it('parses families', () => {
      const data = parseGedcom(sampleGedcom);
      expect(data.families).toHaveLength(1);

      const family = data.families[0];
      expect(family.husbandId).toBe('I1');
      expect(family.wifeId).toBe('I2');
      expect(family.childIds).toContain('I3');
    });

    it('parses female individuals', () => {
      const data = parseGedcom(sampleGedcom);
      const jane = data.individuals[1];
      expect(jane.fullName).toBe('Jane Doe');
      expect(jane.gender).toBe('female');
    });

    it('handles empty content', () => {
      const data = parseGedcom('0 HEAD\n0 TRLR');
      expect(data.individuals).toHaveLength(0);
      expect(data.families).toHaveLength(0);
    });

    it('tracks family associations', () => {
      const data = parseGedcom(sampleGedcom);
      const john = data.individuals[0];
      expect(john.familyIds).toContain('F1');
    });
  });

  describe('generateGedcom', () => {
    it('generates valid GEDCOM', () => {
      const profiles = [
        { id: 'p1', full_name: 'John Smith', gender: 'male', birth_date: '1950-01-15' },
        { id: 'p2', full_name: 'Jane Doe', gender: 'female', birth_date: '1952-03-20' },
      ];
      const relationships = [
        { user_a_id: 'p1', user_b_id: 'p2', relation_type: 'spouse' },
      ];

      const gedcom = generateGedcom(profiles, relationships);
      expect(gedcom).toContain('0 HEAD');
      expect(gedcom).toContain('0 @p1@ INDI');
      expect(gedcom).toContain('1 NAME John Smith');
      expect(gedcom).toContain('1 SEX M');
      expect(gedcom).toContain('0 @F1@ FAM');
      expect(gedcom).toContain('1 HUSB @p1@');
      expect(gedcom).toContain('1 WIFE @p2@');
      expect(gedcom).toContain('0 TRLR');
    });

    it('handles profiles without optional fields', () => {
      const profiles = [{ id: 'p1', full_name: 'Unknown Person' }];
      const gedcom = generateGedcom(profiles, []);
      expect(gedcom).toContain('1 NAME Unknown Person');
      expect(gedcom).not.toContain('1 SEX');
      expect(gedcom).not.toContain('1 BIRT');
    });

    it('generates child references in families', () => {
      const profiles = [
        { id: 'p1', full_name: 'Dad', gender: 'male' },
        { id: 'p2', full_name: 'Mom', gender: 'female' },
        { id: 'p3', full_name: 'Kid', gender: 'male' },
      ];
      const relationships = [
        { user_a_id: 'p1', user_b_id: 'p2', relation_type: 'spouse' },
        { user_a_id: 'p3', user_b_id: 'p1', relation_type: 'child' },
      ];

      const gedcom = generateGedcom(profiles, relationships);
      expect(gedcom).toContain('1 CHIL @p3@');
    });
  });
});
