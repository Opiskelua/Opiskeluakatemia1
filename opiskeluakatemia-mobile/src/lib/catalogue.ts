import type { Choice } from './exercise-model';

// Metadata only; ready-made exercise contents come from the website API without answer keys
// (graded server-side).
const baseChoices: Choice[] = [
  {
    "id": "grammar-synonym",
    "title": "Synonyymit",
    "category": "grammar",
    "type": "synonym"
  },
  {
    "id": "grammar-error-correction",
    "title": "Virheiden korjaus",
    "category": "grammar",
    "type": "error-correction"
  },
  {
    "id": "grammar-cloze-dropdown",
    "title": "Aukkojen täyttö",
    "category": "grammar",
    "type": "cloze-dropdown"
  },
  {
    "id": "grammar-fill-blank-clue",
    "title": "Aukot vihjeillä",
    "category": "grammar",
    "type": "fill-blank-clue"
  },
  {
    "id": "grammar-articles",
    "title": "Artikkelit",
    "category": "grammar",
    "type": "articles"
  },
  {
    "id": "grammar-prepositions",
    "title": "Prepositiot",
    "category": "grammar",
    "type": "prepositions"
  },
  {
    "id": "grammar-verb-tenses",
    "title": "Aikamuodot",
    "category": "grammar",
    "type": "verb-tenses"
  },
  {
    "id": "grammar-subject-verb-agreement",
    "title": "Subjekti ja predikaatti",
    "category": "grammar",
    "type": "subject-verb-agreement"
  },
  {
    "id": "grammar-conditionals",
    "title": "Ehtolauseet",
    "category": "grammar",
    "type": "conditionals"
  },
  {
    "id": "grammar-modal-verbs",
    "title": "Modaaliverbit",
    "category": "grammar",
    "type": "modal-verbs"
  },
  {
    "id": "grammar-relative-clauses",
    "title": "Relatiivilauseet",
    "category": "grammar",
    "type": "relative-clauses"
  },
  {
    "id": "grammar-word-order",
    "title": "Sanajärjestys",
    "category": "grammar",
    "type": "word-order"
  },
  {
    "id": "reading-mc-open",
    "title": "Monivalinta ja avoimet vastaukset",
    "category": "reading",
    "type": "mc-open"
  },
  {
    "id": "reading-gap-fill",
    "title": "Luetun aukkotäydennys",
    "category": "reading",
    "type": "gap-fill"
  },
  {
    "id": "grammar-static-cloze-dropdown-set-1",
    "title": "Preface to Electromagnetism",
    "category": "grammar",
    "type": "cloze-dropdown",
    "path": "/api/abikurssi/course-exercises/grammar-exercises/cloze-dropdown-set-1.json"
  },
  {
    "id": "grammar-static-error-correction-set-1",
    "title": "I Stand Corrected",
    "category": "grammar",
    "type": "error-correction",
    "path": "/api/abikurssi/course-exercises/grammar-exercises/error-correction-set-1.json"
  },
  {
    "id": "grammar-static-fill-blank-clue-set-1",
    "title": "About Time",
    "category": "grammar",
    "type": "fill-blank-clue",
    "path": "/api/abikurssi/course-exercises/grammar-exercises/fill-blank-clue-set-1.json"
  },
  {
    "id": "grammar-static-synonyms-set-1",
    "title": "Word Meanings: Nature and Science",
    "category": "grammar",
    "type": "synonym",
    "path": "/api/abikurssi/course-exercises/grammar-exercises/synonyms-set-1.json"
  },
  {
    "id": "reading-static-climate-article",
    "title": "The Hidden Impact of Fast Fashion",
    "category": "reading",
    "type": "reading-comprehension",
    "path": "/api/abikurssi/course-exercises/reading-exercises/climate-article.json"
  },
  {
    "id": "reading-static-cultural-heritage",
    "title": "The Lost Languages of Europe",
    "category": "reading",
    "type": "reading-comprehension",
    "path": "/api/abikurssi/course-exercises/reading-exercises/cultural-heritage.json"
  },
  {
    "id": "reading-static-medical-breakthrough",
    "title": "The Gut-Brain Connection",
    "category": "reading",
    "type": "reading-comprehension",
    "path": "/api/abikurssi/course-exercises/reading-exercises/medical-breakthrough.json"
  },
  {
    "id": "reading-static-technology-ethics",
    "title": "AI in Healthcare: Promise and Peril",
    "category": "reading",
    "type": "reading-comprehension",
    "path": "/api/abikurssi/course-exercises/reading-exercises/technology-ethics.json"
  },
  {
    "id": "reading-static-urban-planning",
    "title": "The 15-Minute City",
    "category": "reading",
    "type": "reading-comprehension",
    "path": "/api/abikurssi/course-exercises/reading-exercises/urban-planning.json"
  },
  {
    "id": "listening-static-climate-change",
    "title": "Climate Scientist's Perspective",
    "category": "listening",
    "type": "open-ended",
    "path": "/api/abikurssi/course-exercises/listening-exercises/climate-change.json"
  },
  {
    "id": "listening-static-elderly-wisdom",
    "title": "Reflections on Life",
    "category": "listening",
    "type": "open-ended",
    "path": "/api/abikurssi/course-exercises/listening-exercises/elderly-wisdom.json"
  },
  {
    "id": "listening-static-musician-journey",
    "title": "Becoming a Professional Musician",
    "category": "listening",
    "type": "open-ended",
    "path": "/api/abikurssi/course-exercises/listening-exercises/musician-journey.json"
  },
  {
    "id": "listening-static-santa-reflection",
    "title": "Santa's Reflection",
    "category": "listening",
    "type": "open-ended",
    "path": "/api/abikurssi/course-exercises/listening-exercises/santa-reflection.json"
  },
  {
    "id": "listening-static-social-media-impact",
    "title": "Social Media and Mental Health",
    "category": "listening",
    "type": "open-ended",
    "path": "/api/abikurssi/course-exercises/listening-exercises/social-media-impact.json"
  },
  {
    "id": "listening-static-startup-founder",
    "title": "Tech Entrepreneur from India",
    "category": "listening",
    "type": "open-ended",
    "path": "/api/abikurssi/course-exercises/listening-exercises/startup-founder.json"
  },
  {
    "id": "listening-static-teacher-burnout",
    "title": "Teacher's Reflection",
    "category": "listening",
    "type": "open-ended",
    "path": "/api/abikurssi/course-exercises/listening-exercises/teacher-burnout.json"
  },
  {
    "id": "listening-static-arctic-expedition",
    "title": "Arctic Research Expedition",
    "category": "listening",
    "type": "multiple-choice",
    "path": "/api/abikurssi/course-exercises/listening-exercises-mc/arctic-expedition.json"
  },
  {
    "id": "listening-static-coffee-shop-owner",
    "title": "Opening a Coffee Shop",
    "category": "listening",
    "type": "multiple-choice",
    "path": "/api/abikurssi/course-exercises/listening-exercises-mc/coffee-shop-owner.json"
  },
  {
    "id": "listening-static-digital-nomad",
    "title": "Life as a Digital Nomad",
    "category": "listening",
    "type": "multiple-choice",
    "path": "/api/abikurssi/course-exercises/listening-exercises-mc/digital-nomad.json"
  },
  {
    "id": "listening-static-hospital-volunteer",
    "title": "Hospital Volunteer Experience",
    "category": "listening",
    "type": "multiple-choice",
    "path": "/api/abikurssi/course-exercises/listening-exercises-mc/hospital-volunteer.json"
  },
  {
    "id": "listening-static-marathon-runner",
    "title": "Training for a Marathon",
    "category": "listening",
    "type": "multiple-choice",
    "path": "/api/abikurssi/course-exercises/listening-exercises-mc/marathon-runner.json"
  }
];

export const choices: Choice[] = [
  ...baseChoices.filter(c => c.category === 'reading' && c.path).map(c => ({ ...c, id: `${c.id}-mc`, title: `${c.title} · monivalinta`, multipleChoiceOnly: true })),
  ...baseChoices.filter(c => c.path),
  ...baseChoices.filter(c => !c.path),
];
