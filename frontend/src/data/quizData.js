export const answerScores = {
  'Strongly Agree': 5,
  Agree: 4,
  Neutral: 3,
  Disagree: 2,
};

export const storageKeys = {
  scores: 'careerQuizScores',
  topCategories: 'careerQuizTopCategories',
};

export const categoryOrder = ['Technology', 'Medical', 'Business', 'Arts'];

export const generalQuestions = [
  {
    id: 1,
    category: 'Technology',
    text: 'I enjoy solving problems with computers, apps, or digital tools.',
  },
  {
    id: 2,
    category: 'Business',
    text: 'I like planning projects, organizing tasks, and leading teams.',
  },
  {
    id: 3,
    category: 'Medical',
    text: 'I am interested in helping people stay healthy and feel better.',
  },
  {
    id: 4,
    category: 'Arts',
    text: 'I enjoy drawing, music, writing, or other creative activities.',
  },
  {
    id: 5,
    category: 'Technology',
    text: 'I would like to learn how websites, apps, or games are built.',
  },
  {
    id: 6,
    category: 'Business',
    text: 'I like working with money, sales, marketing, or business ideas.',
  },
  {
    id: 7,
    category: 'Medical',
    text: 'I stay calm and focused when I need to support someone in need.',
  },
  {
    id: 8,
    category: 'Arts',
    text: 'I enjoy expressing ideas through design, performance, or storytelling.',
  },
];

export const specificQuestionsByCategory = {
  Technology: [
    {
      id: 1,
      category: 'Technology',
      text: 'I enjoy learning about coding, software, and new digital tools.',
    },
    {
      id: 2,
      category: 'Technology',
      text: 'I like finding efficient ways to automate repetitive work.',
    },
    {
      id: 3,
      category: 'Technology',
      text: 'I would enjoy building apps, websites, or smart systems.',
    },
    {
      id: 4,
      category: 'Technology',
      text: 'I am curious about data, cybersecurity, or artificial intelligence.',
    },
  ],
  Medical: [
    {
      id: 1,
      category: 'Medical',
      text: 'I enjoy learning about the human body and health science.',
    },
    {
      id: 2,
      category: 'Medical',
      text: 'I would like to care for patients or support their recovery.',
    },
    {
      id: 3,
      category: 'Medical',
      text: 'I can handle careful, detail-oriented work in health-related settings.',
    },
    {
      id: 4,
      category: 'Medical',
      text: 'I am interested in medicine, nursing, or allied health careers.',
    },
  ],
  Business: [
    {
      id: 1,
      category: 'Business',
      text: 'I enjoy making plans, setting goals, and managing resources.',
    },
    {
      id: 2,
      category: 'Business',
      text: 'I like persuading people and sharing ideas clearly.',
    },
    {
      id: 3,
      category: 'Business',
      text: 'I am interested in entrepreneurship, marketing, or finance.',
    },
    {
      id: 4,
      category: 'Business',
      text: 'I enjoy making decisions that help a team or company grow.',
    },
  ],
  Arts: [
    {
      id: 1,
      category: 'Arts',
      text: 'I enjoy creating artwork, music, or visual designs.',
    },
    {
      id: 2,
      category: 'Arts',
      text: 'I like expressing feelings or stories through creative work.',
    },
    {
      id: 3,
      category: 'Arts',
      text: 'I am interested in media, animation, theatre, or content creation.',
    },
    {
      id: 4,
      category: 'Arts',
      text: 'I enjoy thinking creatively and trying original ideas.',
    },
  ],
};

export const careerRecommendations = {
  Technology: 'Software Developer or IT Specialist',
  Medical: 'Doctor, Nurse, or Healthcare Professional',
  Business: 'Business Analyst, Marketer, or Entrepreneur',
  Arts: 'Graphic Designer, Artist, or Creative Professional',
};

export function getEmptyScores() {
  return {
    Technology: 0,
    Medical: 0,
    Business: 0,
    Arts: 0,
  };
}

export function getTopCategories(scores, amount = 2) {
  return Object.entries(scores)
    .sort((first, second) => second[1] - first[1])
    .slice(0, amount)
    .map(([category]) => category);
}

export function getHighestCategory(scores) {
  return Object.entries(scores).sort((first, second) => second[1] - first[1])[0]?.[0] ?? 'Technology';
}


