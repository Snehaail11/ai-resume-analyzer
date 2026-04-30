import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 2000;

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_INTERVAL_MS) {
    const waitTime = MIN_INTERVAL_MS - timeSinceLastRequest;
    console.log(`Rate limit: waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

export async function analyzeResume(resumeText: string, jdText: string) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("❌ Missing Groq API Key!");
    return getDynamicAnalysis(resumeText, jdText);
  }

  await waitForRateLimit();

  const prompt = `You are an expert ATS resume screener. Compare the RESUME vs JOB DESCRIPTION. Return ONLY valid JSON.

--- JOB DESCRIPTION ---
${jdText.substring(0, 4000)}

--- RESUME ---
${resumeText.substring(0, 4000)}

Return EXACT JSON only, based on ACTUAL content from both documents:

{
  "overallScore": 0-100,
  "scores": {"skills": 0-100, "experience": 0-100, "education": 0-100, "format": 0-100},
  "matchingKeywords": ["keyword1", "keyword2", "keyword3"],
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "gaps": [
    {"requirement": "exact requirement from JD", "candidate": "exact from resume", "severity": "high/medium/low", "action": "specific fix"}
  ],
  "recommendations": {
    "highPriority": ["fix1", "fix2"],
    "mediumPriority": ["fix3", "fix4"],
    "quickWins": ["fix5", "fix6"]
  }
}

CRITICAL RULES:
1. ONLY extract keywords that ACTUALLY appear in the documents
2. matchingKeywords: MUST appear in BOTH resume AND JD
3. missingKeywords: MUST appear in JD but NOT in resume
4. Do NOT invent or assume keywords
5. If a keyword is not in resume, put it in missingKeywords, not matchingKeywords
6. Be honest - if no skills match, matchingKeywords should be empty
7. Score based on actual match percentage

Example: If resume has Python and JD has Python → matchingKeywords includes "Python"
If resume has NO HR terms but JD has "Recruitment" → missingKeywords includes "Recruitment"

Return ONLY the JSON, no other text.`;

  try {
    console.log("Sending to Groq API...");
    
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    
    const content = response.choices[0]?.message?.content || "";
    console.log("Response received from Groq");
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("Groq API Success!");
      return parsed;
    }
    return getDynamicAnalysis(resumeText, jdText);
  } catch (error: any) {
    console.error("Groq API Error:", error);
    if (error.status === 429) {
      console.log("Rate limit hit. Waiting 3 seconds...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      return analyzeResume(resumeText, jdText);
    }
    return getDynamicAnalysis(resumeText, jdText);
  }
}

// NEW: Dynamically analyzes without hardcoded keywords
function getDynamicAnalysis(resumeText: string, jdText: string) {
  const resume = resumeText.toLowerCase();
  const jd = jdText.toLowerCase();
  
  // Extract skills from JD (look for common patterns)
  const jdSkills = extractSkillsFromText(jd);
  const resumeSkills = extractSkillsFromText(resume);
  
  // Find actual matches (keywords that appear in BOTH)
  const matchingKeywords: string[] = [];
  const missingKeywords: string[] = [];
  
  for (const jdSkill of jdSkills) {
    // Check if this skill appears in resume
    let found = false;
    for (const resumeSkill of resumeSkills) {
      if (resumeSkill.includes(jdSkill) || jdSkill.includes(resumeSkill) || 
          resume.includes(jdSkill) || (jdSkill.length > 3 && resume.includes(jdSkill))) {
        found = true;
        if (!matchingKeywords.includes(jdSkill)) {
          matchingKeywords.push(jdSkill);
        }
        break;
      }
    }
    if (!found && !missingKeywords.includes(jdSkill) && jdSkill.length > 3) {
      missingKeywords.push(jdSkill);
    }
  }
  
  // Also check JD-specific terms not in skills list
  const jdSpecificTerms = extractSpecificTerms(jd);
  for (const term of jdSpecificTerms) {
    if (term.length > 3 && !resume.includes(term) && !missingKeywords.includes(term)) {
      missingKeywords.push(term);
    }
  }
  
  // Calculate score based on actual match percentage
  const totalJDSkills = jdSkills.length + jdSpecificTerms.length;
  const matchCount = matchingKeywords.length;
  const matchPercentage = totalJDSkills > 0 ? (matchCount / totalJDSkills) * 100 : 50;
  
  const overallScore = Math.min(95, Math.max(25, Math.round(matchPercentage + 15)));
  const skillsScore = Math.min(95, Math.max(25, Math.round(matchPercentage + 10)));
  
  // Detect experience from resume
  const hasExperience = /experience|internship|work|job|role/i.test(resume);
  const hasEducation = /education|degree|bachelor|master|diploma|university|college/i.test(resume);
  
  // Find gaps from JD
  const gaps = [];
  
  // Check for education requirement
  if (jd.includes('graduate') || jd.includes('degree') || jd.includes('pursuing')) {
    if (!hasEducation) {
      gaps.push({
        requirement: "Educational qualification",
        candidate: "Not clearly stated",
        severity: "medium",
        action: "Add your educational background"
      });
    }
  }
  
  // Check for year requirements
  const yearMatch = jd.match(/(\d+)[\s\-]*\+?\s*(?:years?|yrs?)/i);
  if (yearMatch && !resume.includes(yearMatch[1])) {
    gaps.push({
      requirement: `${yearMatch[1]}+ years experience`,
      candidate: "Based on resume content",
      severity: "medium",
      action: `Highlight experience demonstrating ${yearMatch[1]}+ years`
    });
  }
  
  if (gaps.length === 0 && missingKeywords.length > 0) {
    gaps.push({
      requirement: "Key skills from job description",
      candidate: `Missing: ${missingKeywords.slice(0, 3).join(", ")}`,
      severity: "medium",
      action: "Add relevant skills to your resume"
    });
  }
  
  return {
    overallScore: overallScore,
    scores: {
      skills: skillsScore,
      experience: hasExperience ? 65 : 45,
      education: hasEducation ? 70 : 50,
      format: 70
    },
    matchingKeywords: matchingKeywords.slice(0, 6),
    missingKeywords: missingKeywords.slice(0, 6),
    gaps: gaps.slice(0, 3),
    recommendations: {
      highPriority: missingKeywords.length > 0 ? 
        [`Add these keywords to your resume: ${missingKeywords.slice(0, 3).join(", ")}`] : 
        ["Customize your resume for this specific role"],
      mediumPriority: [
        "Quantify your achievements with specific metrics",
        "Tailor your professional summary to the job"
      ],
      quickWins: [
        "Use standard section headings (Experience, Education, Skills)",
        "Remove graphics for better ATS parsing"
      ]
    }
  };
}

// Helper: Extract skills from text
function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    "python", "sql", "excel", "power bi", "tableau", "react", "node.js", "javascript",
    "html", "css", "aws", "azure", "git", "docker", "kubernetes", "java", "c++", "c#",
    "php", "ruby", "swift", "kotlin", "typescript", "angular", "vue", "django", "flask",
    "mongodb", "postgresql", "mysql", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn",
    "hr", "recruitment", "onboarding", "microsoft office", "word", "powerpoint", "outlook",
    "communication", "leadership", "project management", "agile", "scrum", "jira", "confluence",
    "photoshop", "illustrator", "figma", "sketch", "seo", "google analytics", "social media",
    "content writing", "copywriting", "marketing", "sales", "customer service", "negotiation",
    "accounting", "quickbooks", "sage", "data analysis", "machine learning", "deep learning",
    "nlp", "computer vision", "api", "rest", "graphql", "redux", "next.js", "express.js",
    "english proficiency", "administrative support", "resume screening", "candidate databases"
  ];
  
  const foundSkills: string[] = [];
  for (const skill of commonSkills) {
    if (text.includes(skill)) {
      foundSkills.push(skill);
    }
  }
  
  // Also extract capitalized phrases that might be skills
  const capsMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (capsMatches) {
    for (const match of capsMatches) {
      const lowerMatch = match.toLowerCase();
      if (lowerMatch.length > 3 && !foundSkills.includes(lowerMatch) && 
          !commonSkills.includes(lowerMatch)) {
        // Only add if it appears in JD context
        if (text.includes('skill') || text.includes('experience') || text.includes('knowledge')) {
          foundSkills.push(lowerMatch);
        }
      }
    }
  }
  
  return [...new Set(foundSkills)];
}

// Helper: Extract specific terms from JD
function extractSpecificTerms(text: string): string[] {
  const terms: string[] = [];
  
  // Look for bullet points or list items
  const bulletPoints = text.match(/[•\-*]\s*([^.\n]+)/g);
  if (bulletPoints) {
    for (const bullet of bulletPoints) {
      const clean = bullet.replace(/[•\-*]\s*/, '').toLowerCase();
      if (clean.length > 5 && clean.length < 50) {
        terms.push(clean);
      }
    }
  }
  
  // Look for phrases after "Requirements:", "Skills:", "Qualifications:"
  const sections = text.match(/(?:requirements|skills|qualifications)['\s:]*([^.\n]+)/gi);
  if (sections) {
    for (const section of sections) {
      const clean = section.toLowerCase().replace(/(?:requirements|skills|qualifications)['\s:]*/, '');
      if (clean.length > 3 && clean.length < 50) {
        terms.push(clean);
      }
    }
  }
  
  return [...new Set(terms)].slice(0, 10);
}