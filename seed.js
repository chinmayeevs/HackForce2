// seed.js
// Optional helper script: inserts one demo project so the app isn't empty
// on a fresh database. Run with: npm run seed

require('dotenv').config();
const connectDB = require('./config/db');
const Project = require('./models/Project');

async function seed() {
  await connectDB();

  const existing = await Project.countDocuments();
  if (existing > 0) {
    console.log(`Database already has ${existing} project(s). Skipping seed.`);
    process.exit(0);
  }

  await Project.create({
    name: 'AI Resume Analyzer',
    description:
      'An application that analyzes developer resumes and projects to identify technical skills and generate structured professional insights for recruiters.',
    owner: { name: 'Alex Developer', email: '' },
    sourceType: 'created',
    files: [
      { name: 'index.html', path: 'index.html', language: 'HTML', content: '<h1>AI Resume Analyzer</h1>' },
      { name: 'app.py', path: 'app.py', language: 'Python', content: '# Entry point for the resume analyzer service' }
    ],
    languages: [
      { name: 'JavaScript', percentage: 45 },
      { name: 'HTML', percentage: 25 },
      { name: 'CSS', percentage: 20 },
      { name: 'Python', percentage: 10 }
    ],
    skills: ['JavaScript', 'HTML', 'CSS', 'Python', 'AI/ML', 'REST API', 'GitHub'],
    technologies: ['JavaScript', 'HTML', 'CSS', 'Python', 'AI/ML', 'REST API', 'GitHub'],
    aiAnalysis: {
      problemStatement:
        'Recruiters often need a structured way to understand a developer\'s practical technical experience beyond a traditional resume.',
      summary:
        'This project analyzes developer information and technical projects to extract skills and present them in a structured format.',
      howItWorks: [
        'User submits a project.',
        'Project files are inspected.',
        'Technologies are detected.',
        'Source code is analyzed.',
        'AI generates a structured project explanation.'
      ],
      generatedBy: 'fallback'
    },
    verification: {
      sourceAvailable: true,
      filesAnalyzed: true,
      technologiesDetected: true,
      submissionVerified: true
    },
    views: 12
  });

  console.log('Demo project seeded.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
