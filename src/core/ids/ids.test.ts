import { describe, expect, it } from 'vitest';

import * as ContentIds from './content.js';
import * as SystemIds from './system.js';

describe('SystemIds', () => {
  it('should export core entity types', () => {
    expect(SystemIds.PERSON_TYPE).toBe('7ed45f2bc48b419e8e4664d5ff680b0d');
    expect(SystemIds.COMPANY_TYPE).toBe('e059a29e6f6b437bbc15c7983d078c0d');
    expect(SystemIds.EVENT_TYPE).toBe('4d876b81787e41fcab5d075d4da66a3f');
    expect(SystemIds.INSTITUTION_TYPE).toBe('7f5433a40628498f9de6311cb14709a8');
  });

  it('should export temporal properties', () => {
    expect(SystemIds.START_DATE_PROPERTY).toBe('eed03a040acd4a9e81e08272ed70a817');
    expect(SystemIds.END_DATE_PROPERTY).toBe('b08b8f63dc1e41568b0819946f2b011c');
    expect(SystemIds.DATE_FOUNDED_PROPERTY).toBe('41aa3d9847b64a97b7ec427e575b910e');
  });

  it('should export work/education relation types', () => {
    expect(SystemIds.WORKS_AT_PROPERTY).toBe('dac6e89e76be4f7788e10f556ceb6869');
    expect(SystemIds.WORKED_AT_PROPERTY).toBe('3e1f6873f4e8480da4ce447092a684fa');
    expect(SystemIds.STUDIED_AT_PROPERTY).toBe('3c8a7056fba7463cbdee319c835f2563');
    expect(SystemIds.TEAM_MEMBERS_PROPERTY).toBe('a09625a4b98448768f0da28a65e47f85');
  });
});

describe('ContentIds', () => {
  it('should export content entity types', () => {
    expect(ContentIds.ARTICLE_TYPE).toBe('a2a5ed0cacef46b1835de457956ce915');
    expect(ContentIds.TALK_TYPE).toBe('86db141cf7cb471194ed39088926adb8');
    expect(ContentIds.PODCAST_TYPE).toBe('4c81561d1f9541319cdddd20ab831ba2');
    expect(ContentIds.EPISODE_TYPE).toBe('972d201ad78045689e01543f67b26bee');
  });
});
