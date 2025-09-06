const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Initializing VPay database...')
  
  try {
    // Create sample achievements
    const achievements = [
      {
        title: 'First Payment',
        description: 'Complete your first payment transaction',
        icon: '💳',
        points: 100,
        condition: JSON.stringify({ type: 'transaction_count', value: 1 })
      },
      {
        title: 'Task Master',
        description: 'Complete 10 tasks successfully',
        icon: '🏆',
        points: 500,
        condition: JSON.stringify({ type: 'completed_tasks', value: 10 })
      },
      {
        title: 'Early Adopter',
        description: 'Join VPay in the first month',
        icon: '🌟',
        points: 250,
        condition: JSON.stringify({ type: 'registration_date', value: '2024-01-31' })
      },
      {
        title: 'Wallet Warrior',
        description: 'Connect your wallet and verify identity',
        icon: '🔒',
        points: 150,
        condition: JSON.stringify({ type: 'kyc_verified', value: true })
      }
    ]

    for (const achievement of achievements) {
      await prisma.achievement.upsert({
        where: { title: achievement.title },
        update: achievement,
        create: achievement
      })
    }

    // Create sample rewards
    const rewards = [
      {
        title: 'VRC Token Bonus',
        description: '100 VRC tokens added to your wallet',
        type: 'TOKEN',
        cost: 500,
        value: 100,
        stock: 1000
      },
      {
        title: 'Premium Features',
        description: '30 days of premium features access',
        type: 'FEATURE_ACCESS',
        cost: 750,
        value: 29.99,
        stock: null
      },
      {
        title: 'VPay NFT Badge',
        description: 'Exclusive VPay community NFT badge',
        type: 'NFT',
        cost: 1000,
        value: 50,
        stock: 500
      },
      {
        title: 'Transaction Fee Discount',
        description: '50% off transaction fees for 1 month',
        type: 'DISCOUNT',
        cost: 300,
        value: 15,
        stock: null
      }
    ]

    for (const reward of rewards) {
      await prisma.reward.upsert({
        where: { title: reward.title },
        update: reward,
        create: reward
      })
    }

    console.log('✅ Database initialized successfully!')
    console.log(`📊 Created ${achievements.length} achievements`)
    console.log(`🎁 Created ${rewards.length} rewards`)
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
