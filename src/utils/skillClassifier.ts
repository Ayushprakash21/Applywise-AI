/**
 * Skill Classification & Taxonomy Engine for ApplyVise AI
 * 
 * Accurately classifies extracted job requirements into verified skill buckets:
 * 1. Technical Skills
 * 2. Tools & Technologies
 * 3. Functional Skills
 * 4. Industry Knowledge
 * 5. Other Extracted Phrases / Recruiter Tags (e.g. "JCP Growth")
 * 
 * Validates phrases against the employer's authentic text so that recruiter campaign codes
 * or untruthful tags are never surfaced as verified required technologies.
 */

export type SkillCategory =
  | 'technical_skills'
  | 'tools_and_technologies'
  | 'functional_skills'
  | 'industry_knowledge'
  | 'other_extracted_phrases';

export interface ClassifiedSkill {
  name: string;
  category: SkillCategory;
  categoryLabel: string;
  isVerifiedInText: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface ClassifiedSkillsSummary {
  technicalSkills: ClassifiedSkill[];
  toolsAndTechnologies: ClassifiedSkill[];
  functionalSkills: ClassifiedSkill[];
  industryKnowledge: ClassifiedSkill[];
  otherPhrases: ClassifiedSkill[];
  totalClassified: number;
}

// 1. Technical Skills Taxonomy (Languages, Algorithms, Data Science, Infrastructure)
const TECHNICAL_TAXONOMY = new Set([
  'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'golang', 'go', 'rust',
  'ruby', 'php', 'swift', 'kotlin', 'sql', 'nosql', 'r', 'scala', 'bash', 'shell',
  'data science', 'machine learning', 'deep learning', 'artificial intelligence', 'ai',
  'nlp', 'computer vision', 'data analytics', 'data analysis', 'analytics', 'statistics',
  'data modeling', 'data models', 'data engineering', 'data engineer', 'data engineers', 'etl', 'data pipelines', 'big data',
  'react', 'next.js', 'vue', 'angular', 'node.js', 'express', 'django', 'fastapi',
  'spring boot', 'graphql', 'rest api', 'microservices', 'distributed systems',
  'system architecture', 'cloud architecture', 'devops', 'ci/cd', 'linux',
  'database design', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch'
]);

// 2. Tools and Technologies Taxonomy (Specific products, platforms, vendors)
const TOOLS_TAXONOMY = new Set([
  'docker', 'kubernetes', 'aws', 'amazon web services', 'azure', 'gcp', 'google cloud',
  'cloudflare', 'terraform', 'git', 'github', 'gitlab', 'jira', 'confluence',
  'tableau', 'power bi', 'looker', 'snowflake', 'databricks', 'spark', 'kafka',
  'airflow', 'dbt', 'hadoop', 'scikit-learn', 'tensorflow', 'pytorch', 'pandas',
  'numpy', 'scipy', 'jupyter', 'postman', 'figma', 'jetbrains', 'jetbrains air',
  'intellij', 'pycharm', 'linear', 'asana', 'notion', 'slack'
]);

// 3. Functional Skills Taxonomy (Disciplines, leadership, management, methodologies)
const FUNCTIONAL_TAXONOMY = new Set([
  'leadership', 'team leadership', 'people management', 'engineering management', 'mentorship',
  'project management', 'product management', 'product strategy', 'stakeholder management',
  'experimentation', 'a/b testing', 'experimentation culture', 'hypothesis testing',
  'metric frameworks', 'kpi design', 'self-service reporting', 'reporting',
  'agile', 'scrum', 'kanban', 'sprint planning', 'cross-functional collaboration',
  'communication', 'problem solving', 'strategic planning', 'decision making',
  'budgeting', 'cost control', 'resource allocation', 'quality assurance', 'compliance',
  'data governance', 'operations', 'customer journey analysis', 'retention analysis'
]);

// 4. Industry Knowledge Taxonomy (Business models, sectors, market domains)
const INDUSTRY_TAXONOMY = new Set([
  'developer tools', 'dev tools', 'saas', 'b2b saas', 'enterprise software',
  'fintech', 'e-commerce', 'healthcare', 'cybersecurity', 'edtech',
  'open source', 'venture capital', 'subscription models', 'growth marketing'
]);

// Known recruiter / job-board tags that are NOT technical skills
const KNOWN_RECRUITER_TAGS = new Set([
  'jcp growth', 'growth', 'urgent', 'urgent hire', 'featured', 'remote ok',
  'visa', 'sponsor', 'senior level', 'entry level', 'mid level', 'full time',
  'internship', 'new grad', 'contractor', 'arbeitnow', 'jobicy', 'greenhouse'
]);

/**
 * Checks whether a phrase is present in the authentic job description
 */
function verifyPhraseInText(phrase: string, descriptionText: string): boolean {
  if (!phrase || !descriptionText) return false;
  const cleanPhrase = phrase.toLowerCase().trim();
  const cleanText = descriptionText.toLowerCase();

  // Exact phrase match
  if (cleanText.includes(cleanPhrase)) return true;

  // Individual token coverage for multi-word phrases (e.g. "Data Analytics" -> "data" and "analytics")
  const tokens = cleanPhrase.split(/\s+/).filter(t => t.length > 2);
  if (tokens.length > 1) {
    return tokens.every(token => cleanText.includes(token));
  }

  return false;
}

/**
 * Classifies a single skill or phrase into its verified taxonomy bucket
 */
export function classifySkill(phrase: string, descriptionText: string = ''): ClassifiedSkill {
  const normalized = phrase.toLowerCase().trim();
  const isVerifiedInText = descriptionText ? verifyPhraseInText(phrase, descriptionText) : false;

  // Explicit check for known arbitrary recruiter/internal tags
  if (KNOWN_RECRUITER_TAGS.has(normalized) || normalized.includes('growth') && !normalized.includes('marketing')) {
    return {
      name: phrase.trim(),
      category: 'other_extracted_phrases',
      categoryLabel: 'Recruiter / Category Tag',
      isVerifiedInText,
      confidence: 'low',
    };
  }

  // 1. Technical Skills
  if (TECHNICAL_TAXONOMY.has(normalized) || Array.from(TECHNICAL_TAXONOMY).some(t => normalized === t || (t.length > 3 && normalized.includes(t)))) {
    return {
      name: phrase.trim(),
      category: 'technical_skills',
      categoryLabel: 'Technical Skill',
      isVerifiedInText,
      confidence: isVerifiedInText ? 'high' : 'medium',
    };
  }

  // 2. Tools & Technologies
  if (TOOLS_TAXONOMY.has(normalized) || Array.from(TOOLS_TAXONOMY).some(t => normalized === t || (t.length > 3 && normalized.includes(t)))) {
    return {
      name: phrase.trim(),
      category: 'tools_and_technologies',
      categoryLabel: 'Tool & Technology',
      isVerifiedInText,
      confidence: isVerifiedInText ? 'high' : 'medium',
    };
  }

  // 3. Functional Skills
  if (FUNCTIONAL_TAXONOMY.has(normalized) || Array.from(FUNCTIONAL_TAXONOMY).some(t => normalized === t || (t.length > 4 && normalized.includes(t)))) {
    return {
      name: phrase.trim(),
      category: 'functional_skills',
      categoryLabel: 'Functional Competency',
      isVerifiedInText,
      confidence: isVerifiedInText ? 'high' : 'medium',
    };
  }

  // 4. Industry Knowledge
  if (INDUSTRY_TAXONOMY.has(normalized) || Array.from(INDUSTRY_TAXONOMY).some(t => normalized === t || (t.length > 4 && normalized.includes(t)))) {
    return {
      name: phrase.trim(),
      category: 'industry_knowledge',
      categoryLabel: 'Domain Knowledge',
      isVerifiedInText,
      confidence: isVerifiedInText ? 'high' : 'medium',
    };
  }

  // Unclassified phrases
  return {
    name: phrase.trim(),
    category: 'other_extracted_phrases',
    categoryLabel: 'Additional Tag',
    isVerifiedInText,
    confidence: 'low',
  };
}

/**
 * Extracts and classifies all skills from both the structured requirements list
 * and directly from the authentic job description text if structured requirements are sparse or unverified.
 */
export function classifyJobSkills(
  rawRequirements: string[] = [],
  descriptionText: string = ''
): ClassifiedSkillsSummary {
  const seen = new Set<string>();
  const classified: ClassifiedSkill[] = [];

  // First classify explicitly provided requirements
  for (const req of rawRequirements) {
    if (!req || typeof req !== 'string' || !req.trim()) continue;
    const clean = req.trim();
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    classified.push(classifySkill(clean, descriptionText));
  }

  // If provided requirements are sparse (<= 2 items) or only contain recruiter tags (like "JCP Growth"),
  // scan the authentic description text for prominent technical, functional, and tool skills.
  const verifiedTechCount = classified.filter(c => c.category === 'technical_skills' || c.category === 'tools_and_technologies').length;
  if (verifiedTechCount === 0 && descriptionText) {
    const descLower = descriptionText.toLowerCase();

    // Check technical taxonomy against authentic description
    for (const tech of TECHNICAL_TAXONOMY) {
      if (tech.length > 3 && descLower.includes(tech)) {
        if (!seen.has(tech)) {
          seen.add(tech);
          classified.push({
            name: tech.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            category: 'technical_skills',
            categoryLabel: 'Technical Skill (Extracted from Description)',
            isVerifiedInText: true,
            confidence: 'high',
          });
        }
      }
    }

    // Check tools taxonomy against authentic description
    for (const tool of TOOLS_TAXONOMY) {
      if (tool.length > 2 && descLower.includes(tool)) {
        if (!seen.has(tool)) {
          seen.add(tool);
          classified.push({
            name: tool.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            category: 'tools_and_technologies',
            categoryLabel: 'Tool (Extracted from Description)',
            isVerifiedInText: true,
            confidence: 'high',
          });
        }
      }
    }

    // Check functional taxonomy against authentic description
    for (const func of FUNCTIONAL_TAXONOMY) {
      if (func.length > 4 && descLower.includes(func)) {
        if (!seen.has(func)) {
          seen.add(func);
          classified.push({
            name: func.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            category: 'functional_skills',
            categoryLabel: 'Functional Skill (Extracted from Description)',
            isVerifiedInText: true,
            confidence: 'high',
          });
        }
      }
    }
  }

  return {
    technicalSkills: classified.filter(c => c.category === 'technical_skills'),
    toolsAndTechnologies: classified.filter(c => c.category === 'tools_and_technologies'),
    functionalSkills: classified.filter(c => c.category === 'functional_skills'),
    industryKnowledge: classified.filter(c => c.category === 'industry_knowledge'),
    otherPhrases: classified.filter(c => c.category === 'other_extracted_phrases'),
    totalClassified: classified.length,
  };
}
