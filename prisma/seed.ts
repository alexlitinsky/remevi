import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create achievements
  const achievements = [
    // Quiz Achievements
    {
      name: 'Quiz Novice',
      description: 'Complete your first quiz with 80% accuracy',
      category: 'quiz',
      type: 'milestone',
      requirements: {
        quizScore: 80
      },
      badgeIcon: '/achievements/quiz-novice.svg',
      pointsAwarded: 100
    },
    {
      name: 'Quiz Master',
      description: 'Complete a quiz with 100% accuracy',
      category: 'quiz',
      type: 'milestone',
      requirements: {
        quizScore: 100
      },
      badgeIcon: '/achievements/quiz-master.svg',
      pointsAwarded: 250
    },
    {
      name: 'Perfect Streak',
      description: 'Get 10 correct answers in a row',
      category: 'quiz',
      type: 'milestone',
      requirements: {
        correctAnswers: 10
      },
      badgeIcon: '/achievements/perfect-streak.svg',
      pointsAwarded: 150
    },

    // Study Achievements
    {
      name: 'Study Starter',
      description: 'Study your first 10 cards',
      category: 'study',
      type: 'milestone',
      requirements: {
        cardsStudied: 10
      },
      badgeIcon: '/achievements/study-starter.svg',
      pointsAwarded: 50
    },
    {
      name: 'Dedicated Learner',
      description: 'Study 100 cards',
      category: 'study',
      type: 'milestone',
      requirements: {
        cardsStudied: 100
      },
      badgeIcon: '/achievements/dedicated-learner.svg',
      pointsAwarded: 200
    },

    // Streak Achievements
    {
      name: 'Consistency',
      description: 'Maintain a 3-day study streak',
      category: 'streak',
      type: 'milestone',
      requirements: {
        streakDays: 3
      },
      badgeIcon: '/achievements/consistency.svg',
      pointsAwarded: 100
    },
    {
      name: 'Weekly Warrior',
      description: 'Maintain a 7-day study streak',
      category: 'streak',
      type: 'milestone',
      requirements: {
        streakDays: 7
      },
      badgeIcon: '/achievements/weekly-warrior.svg',
      pointsAwarded: 250
    },
    {
      name: 'Monthly Master',
      description: 'Maintain a 30-day study streak',
      category: 'streak',
      type: 'milestone',
      requirements: {
        streakDays: 30
      },
      badgeIcon: '/achievements/monthly-master.svg',
      pointsAwarded: 1000
    },

    // Mastery Achievements
    {
      name: 'Knowledge Seeker',
      description: 'Create your first deck',
      category: 'mastery',
      type: 'milestone',
      requirements: {
        decksCreated: 1
      },
      badgeIcon: '/achievements/knowledge-seeker.svg',
      pointsAwarded: 50
    },
    {
      name: 'Master of Many',
      description: 'Create 5 decks',
      category: 'mastery',
      type: 'milestone',
      requirements: {
        decksCreated: 5
      },
      badgeIcon: '/achievements/master-of-many.svg',
      pointsAwarded: 200
    },
    {
      name: "Rising Star",
      description: "Earn your first 100 points",
      category: "points", 
      type: "milestone",
      requirements: { pointThreshold: 100 },
      badgeIcon: "/achievements/rising-star.svg",
      pointsAwarded: 50
    },
    {
      name: "Knowledge Seeker",
      description: "Reach 500 points",
      category: "points",
      type: "milestone", 
      requirements: { pointThreshold: 500 },
      badgeIcon: "/achievements/knowledge-seeker.svg",
      pointsAwarded: 100
    },
    {
      name: "Master Scholar",
      description: "Achieve 1,000 points",
      category: "points",
      type: "milestone",
      requirements: { pointThreshold: 1000 },
      badgeIcon: "/achievements/master-scholar.svg",
      pointsAwarded: 200
    },
    {
      name: "Learning Legend",
      description: "Reach 5,000 points", 
      category: "points",
      type: "milestone",
      requirements: { pointThreshold: 5000 },
      badgeIcon: "/achievements/learning-legend.svg",
      pointsAwarded: 500
    },
    {
      name: "Grand Master",
      description: "Achieve 10,000 points",
      category: "points",
      type: "milestone",
      requirements: { pointThreshold: 10000 },
      badgeIcon: "/achievements/grand-master.svg",
      pointsAwarded: 1000
    }
  ];

  console.log('Starting seed...');

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: achievement,
      create: achievement
    });
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 