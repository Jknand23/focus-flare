/**
 * AI Classification Test Script
 * 
 * This script helps debug AI classification issues by providing sample data
 * and showing the exact prompts sent to Ollama along with the responses.
 * Use this to test and validate AI classification improvements.
 * 
 * Usage: npm run test-ai-classification
 */

import { 
  OllamaClient, 
  getOllamaClient,
  checkOllamaStatus
} from '../src/main/ai-integration/ollama-client';
import type { RawActivityData } from '../src/shared/types/activity-types';

// === ENHANCED SAMPLE TEST DATA ===

const sampleWorkSession: RawActivityData[] = [
  {
    id: 1,
    timestamp: new Date('2024-01-15T09:00:00'),
    appName: 'Visual Studio Code',
    windowTitle: 'FocusFlare - ollama-client.ts',
    duration: 1800000, // 30 minutes
    createdAt: new Date(),
  },
  {
    id: 2,
    timestamp: new Date('2024-01-15T09:30:00'),
    appName: 'Chrome',
    windowTitle: 'GitHub - Pull Request #23: Add AI classification improvements',
    duration: 600000, // 10 minutes
    createdAt: new Date(),
  },
  {
    id: 3,
    timestamp: new Date('2024-01-15T09:40:00'),
    appName: 'Visual Studio Code',
    windowTitle: 'FocusFlare - session-classifier.ts',
    duration: 1200000, // 20 minutes
    createdAt: new Date(),
  }
];

const sampleResearchSession: RawActivityData[] = [
  {
    id: 4,
    timestamp: new Date('2024-01-15T10:00:00'),
    appName: 'Chrome',
    windowTitle: 'Stack Overflow - How to improve AI classification accuracy',
    duration: 900000, // 15 minutes
    createdAt: new Date(),
  },
  {
    id: 5,
    timestamp: new Date('2024-01-15T10:15:00'),
    appName: 'Chrome',
    windowTitle: 'Wikipedia - Machine Learning Classification Methods',
    duration: 600000, // 10 minutes
    createdAt: new Date(),
  },
  {
    id: 6,
    timestamp: new Date('2024-01-15T10:25:00'),
    appName: 'PDF Reader',
    windowTitle: 'Deep Learning for Activity Recognition.pdf',
    duration: 1200000, // 20 minutes
    createdAt: new Date(),
  }
];

const sampleEntertainmentSession: RawActivityData[] = [
  {
    id: 7,
    timestamp: new Date('2024-01-15T11:00:00'),
    appName: 'Chrome',
    windowTitle: 'YouTube - 10 Hours of Relaxing Cat Videos',
    duration: 600000, // 10 minutes
    createdAt: new Date(),
  },
  {
    id: 8,
    timestamp: new Date('2024-01-15T11:10:00'),
    appName: 'Chrome',
    windowTitle: 'Reddit - r/funny - Hilarious Memes Compilation',
    duration: 300000, // 5 minutes
    createdAt: new Date(),
  },
  {
    id: 9,
    timestamp: new Date('2024-01-15T11:15:00'),
    appName: 'Spotify',
    windowTitle: 'Spotify - Lo-Fi Study Beats Playlist',
    duration: 900000, // 15 minutes
    createdAt: new Date(),
  }
];

const sampleBreakSession: RawActivityData[] = [
  {
    id: 10,
    timestamp: new Date('2024-01-15T12:00:00'),
    appName: 'Chrome',
    windowTitle: 'Gmail - Inbox (3 unread)',
    duration: 120000, // 2 minutes
    createdAt: new Date(),
  },
  {
    id: 11,
    timestamp: new Date('2024-01-15T12:02:00'),
    appName: 'Calendar',
    windowTitle: 'Today\'s Schedule - Microsoft Outlook',
    duration: 60000, // 1 minute
    createdAt: new Date(),
  },
  {
    id: 12,
    timestamp: new Date('2024-01-15T12:03:00'),
    appName: 'System Idle',
    windowTitle: 'Screen Saver Active',
    duration: 180000, // 3 minutes
    createdAt: new Date(),
  }
];

const sampleMixedSession: RawActivityData[] = [
  {
    id: 13,
    timestamp: new Date('2024-01-15T13:00:00'),
    appName: 'Chrome',
    windowTitle: 'Amazon - Shopping for Office Supplies',
    duration: 300000, // 5 minutes
    createdAt: new Date(),
  },
  {
    id: 14,
    timestamp: new Date('2024-01-15T13:05:00'),
    appName: 'Notepad',
    windowTitle: 'Meeting Notes - Project Discussion.txt',
    duration: 420000, // 7 minutes
    createdAt: new Date(),
  },
  {
    id: 15,
    timestamp: new Date('2024-01-15T13:12:00'),
    appName: 'Chrome',
    windowTitle: 'LinkedIn - Professional Networking',
    duration: 180000, // 3 minutes
    createdAt: new Date(),
  }
];

// === NEW EDGE CASE TEST DATA ===

const ambiguousWorkResearchSession: RawActivityData[] = [
  {
    id: 16,
    timestamp: new Date('2024-01-15T14:00:00'),
    appName: 'Chrome',
    windowTitle: 'Medium - How to Build Better React Components (Tutorial)',
    duration: 900000, // 15 minutes
    createdAt: new Date(),
  },
  {
    id: 17,
    timestamp: new Date('2024-01-15T14:15:00'),
    appName: 'Visual Studio Code',
    windowTitle: 'practice-project - components/Button.tsx',
    duration: 1200000, // 20 minutes
    createdAt: new Date(),
  }
];

const entertainmentResearchBoundary: RawActivityData[] = [
  {
    id: 18,
    timestamp: new Date('2024-01-15T15:00:00'),
    appName: 'Chrome',
    windowTitle: 'YouTube - JavaScript Tutorial: Advanced Concepts (1 hour)',
    duration: 3600000, // 60 minutes
    createdAt: new Date(),
  }
];

const quickTaskSession: RawActivityData[] = [
  {
    id: 19,
    timestamp: new Date('2024-01-15T16:00:00'),
    appName: 'Chrome',
    windowTitle: 'Gmail - Quick Reply to Client',
    duration: 90000, // 1.5 minutes
    createdAt: new Date(),
  },
  {
    id: 20,
    timestamp: new Date('2024-01-15T16:02:00'),
    appName: 'Slack',
    windowTitle: 'Team Channel - Status Update',
    duration: 60000, // 1 minute
    createdAt: new Date(),
  },
  {
    id: 21,
    timestamp: new Date('2024-01-15T16:03:00'),
    appName: 'Calendar',
    windowTitle: 'Schedule Tomorrow\'s Meeting',
    duration: 120000, // 2 minutes
    createdAt: new Date(),
  }
];

const focusedResearchSession: RawActivityData[] = [
  {
    id: 22,
    timestamp: new Date('2024-01-15T17:00:00'),
    appName: 'Chrome',
    windowTitle: 'Stack Overflow - TypeScript Generic Constraints Best Practices',
    duration: 600000, // 10 minutes
    createdAt: new Date(),
  },
  {
    id: 23,
    timestamp: new Date('2024-01-15T17:10:00'),
    appName: 'Chrome',
    windowTitle: 'TypeScript Handbook - Advanced Types Documentation',
    duration: 900000, // 15 minutes
    createdAt: new Date(),
  },
  {
    id: 24,
    timestamp: new Date('2024-01-15T17:25:00'),
    appName: 'Visual Studio Code',
    windowTitle: 'learning-typescript - generics-practice.ts',
    duration: 1800000, // 30 minutes
    createdAt: new Date(),
  }
];

const backgroundMusicWorkSession: RawActivityData[] = [
  {
    id: 25,
    timestamp: new Date('2024-01-15T18:00:00'),
    appName: 'Spotify',
    windowTitle: 'Deep Focus Programming Music - 2 Hours',
    duration: 300000, // 5 minutes (initial setup)
    createdAt: new Date(),
  },
  {
    id: 26,
    timestamp: new Date('2024-01-15T18:05:00'),
    appName: 'Visual Studio Code',
    windowTitle: 'main-project - database/migrations/add-user-settings.sql',
    duration: 2700000, // 45 minutes
    createdAt: new Date(),
  },
  {
    id: 27,
    timestamp: new Date('2024-01-15T18:50:00'),
    appName: 'Chrome',
    windowTitle: 'PostgreSQL Documentation - Migration Best Practices',
    duration: 600000, // 10 minutes
    createdAt: new Date(),
  }
];

// === ADDITIONAL COMPREHENSIVE EDGE CASES ===

const deepResearchSession: RawActivityData[] = [
  {
    id: 28,
    timestamp: new Date('2024-01-15T19:00:00'),
    appName: 'Chrome',
    windowTitle: 'Google Scholar - AI Classification Algorithms Research Papers',
    duration: 1200000, // 20 minutes
    createdAt: new Date(),
  },
  {
    id: 29,
    timestamp: new Date('2024-01-15T19:20:00'),
    appName: 'PDF Reader',
    windowTitle: 'Attention Is All You Need - Transformer Architecture.pdf',
    duration: 1800000, // 30 minutes
    createdAt: new Date(),
  },
  {
    id: 30,
    timestamp: new Date('2024-01-15T19:50:00'),
    appName: 'Notion',
    windowTitle: 'Research Notes - Modern AI Classification Methods',
    duration: 600000, // 10 minutes
    createdAt: new Date(),
  }
];

const multitaskingBreakSession: RawActivityData[] = [
  {
    id: 31,
    timestamp: new Date('2024-01-15T20:00:00'),
    appName: 'Gmail',
    windowTitle: 'Quick Email Check',
    duration: 45000, // 45 seconds
    createdAt: new Date(),
  },
  {
    id: 32,
    timestamp: new Date('2024-01-15T20:01:00'),
    appName: 'WhatsApp',
    windowTitle: 'Personal Messages',
    duration: 120000, // 2 minutes
    createdAt: new Date(),
  },
  {
    id: 33,
    timestamp: new Date('2024-01-15T20:03:00'),
    appName: 'Chrome',
    windowTitle: 'Weather.com - Today\'s Forecast',
    duration: 30000, // 30 seconds
    createdAt: new Date(),
  },
  {
    id: 34,
    timestamp: new Date('2024-01-15T20:04:00'),
    appName: 'Spotify',
    windowTitle: 'Change Playlist',
    duration: 60000, // 1 minute
    createdAt: new Date(),
  }
];

const educationalYouTubeSession: RawActivityData[] = [
  {
    id: 35,
    timestamp: new Date('2024-01-15T21:00:00'),
    appName: 'Chrome',
    windowTitle: 'YouTube - Complete TypeScript Course (3 hours) - Advanced Patterns',
    duration: 2700000, // 45 minutes
    createdAt: new Date(),
  },
  {
    id: 36,
    timestamp: new Date('2024-01-15T21:45:00'),
    appName: 'Visual Studio Code',
    windowTitle: 'typescript-practice - advanced-patterns.ts',
    duration: 900000, // 15 minutes
    createdAt: new Date(),
  }
];

const quickWorkTasksSession: RawActivityData[] = [
  {
    id: 37,
    timestamp: new Date('2024-01-15T22:00:00'),
    appName: 'Gmail',
    windowTitle: 'Response to Client Project Update',
    duration: 150000, // 2.5 minutes
    createdAt: new Date(),
  },
  {
    id: 38,
    timestamp: new Date('2024-01-15T22:03:00'),
    appName: 'Slack',
    windowTitle: 'Dev Team - Daily Standup Notes',
    duration: 90000, // 1.5 minutes
    createdAt: new Date(),
  },
  {
    id: 39,
    timestamp: new Date('2024-01-15T22:05:00'),
    appName: 'Jira',
    windowTitle: 'Update Task Status: Fix Bug #456',
    duration: 120000, // 2 minutes
    createdAt: new Date(),
  }
];

// === ENHANCED TEST RUNNER ===

async function runTestSuite() {
  console.log('🤖 Enhanced AI Classification Test Suite');
  console.log('==========================================\n');

  // Check Ollama status
  console.log('Checking Ollama status...');
  const isOllamaAvailable = await checkOllamaStatus();
  
  if (!isOllamaAvailable) {
    console.error('❌ Ollama is not available. Please ensure:');
    console.error('   1. Ollama is installed and running');
    console.error('   2. Llama 3.2 model is downloaded (ollama pull llama3.2:3b)');
    console.error('   3. Ollama server is accessible at http://localhost:11434');
    return;
  }
  
  console.log('✅ Ollama is available\n');

  const client = new OllamaClient();
  
  // Basic test sessions
  const basicTests = [
    { name: 'Clear Work Session', data: sampleWorkSession, expected: 'focused-work' },
    { name: 'Clear Research Session', data: sampleResearchSession, expected: 'research' },
    { name: 'Clear Entertainment Session', data: sampleEntertainmentSession, expected: 'entertainment' },
    { name: 'Clear Break Session', data: sampleBreakSession, expected: 'break' },
    { name: 'Mixed/Unclear Session', data: sampleMixedSession, expected: 'unclear' },
    { name: 'Deep Research Session', data: deepResearchSession, expected: 'research' }
  ];

  // Edge case test sessions
  const edgeCaseTests = [
    { 
      name: 'Work+Research Boundary', 
      data: ambiguousWorkResearchSession, 
      expected: ['focused-work', 'research'], // Either acceptable
      description: 'Learning tutorial followed by applying knowledge'
    },
    { 
      name: 'Educational YouTube Learning', 
      data: educationalYouTubeSession, 
      expected: 'research',
      description: 'Educational video content with practice - should be research'
    },
    { 
      name: 'Entertainment vs Research Boundary', 
      data: entertainmentResearchBoundary, 
      expected: 'research',
      description: 'Long educational video - should lean research for learning intent'
    },
    { 
      name: 'Quick Work Tasks', 
      data: quickWorkTasksSession, 
      expected: ['break', 'focused-work'], // Either could be valid
      description: 'Short work-related tasks - could be break or light work'
    },
    { 
      name: 'Research to Practice', 
      data: focusedResearchSession, 
      expected: ['research', 'focused-work'],
      description: 'Research followed by practical application'
    },
    { 
      name: 'Background Music + Work', 
      data: backgroundMusicWorkSession, 
      expected: 'focused-work',
      description: 'Music should not interfere with work classification'
    },
    {
      name: 'Multitasking Break',
      data: multitaskingBreakSession,
      expected: 'break',
      description: 'Very short activities across multiple apps - typical break behavior'
    }
  ];

  let correctClassifications = 0;
  let totalTests = basicTests.length + edgeCaseTests.length;
  const results: Array<{test: string, expected: string|string[], got: string, correct: boolean, confidence: number}> = [];

  console.log('🧪 BASIC CLASSIFICATION TESTS');
  console.log('═'.repeat(50));

  for (const test of basicTests) {
    console.log(`\n📋 Testing ${test.name}`);
    console.log('─'.repeat(40));
    
    try {
      const result = await client.classifySession({
        activities: test.data,
        context: `Test session for ${test.name.toLowerCase()}`
      });

      console.log(`Expected: ${test.expected}`);
      console.log(`Got: ${result.type}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Reasoning: ${result.reasoning}`);

      const isCorrect = result.type === test.expected;
      console.log(`Result: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
      
      if (isCorrect) {
        correctClassifications++;
      }

      results.push({
        test: test.name,
        expected: test.expected,
        got: result.type,
        correct: isCorrect,
        confidence: result.confidence
      });

    } catch (error) {
      console.error(`❌ Classification failed: ${error}`);
      results.push({
        test: test.name,
        expected: test.expected,
        got: 'ERROR',
        correct: false,
        confidence: 0
      });
    }
  }

  console.log('\n🔬 EDGE CASE TESTS');
  console.log('═'.repeat(50));

  for (const test of edgeCaseTests) {
    console.log(`\n📋 Testing ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    console.log('─'.repeat(40));
    
    try {
      const result = await client.classifySession({
        activities: test.data,
        context: `Edge case test: ${test.description}`
      });

      const expectedArray = Array.isArray(test.expected) ? test.expected : [test.expected];
      console.log(`Expected: ${expectedArray.join(' OR ')}`);
      console.log(`Got: ${result.type}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Reasoning: ${result.reasoning}`);

      const isCorrect = expectedArray.includes(result.type);
      console.log(`Result: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
      
      if (isCorrect) {
        correctClassifications++;
      }

      results.push({
        test: test.name,
        expected: expectedArray.join('|'),
        got: result.type,
        correct: isCorrect,
        confidence: result.confidence
      });

    } catch (error) {
      console.error(`❌ Classification failed: ${error}`);
      results.push({
        test: test.name,
        expected: Array.isArray(test.expected) ? test.expected.join('|') : test.expected,
        got: 'ERROR',
        correct: false,
        confidence: 0
      });
    }
  }

  // Detailed results analysis
  console.log('\n📊 DETAILED TEST RESULTS');
  console.log('═'.repeat(70));
  console.log('Test Name'.padEnd(25) + 'Expected'.padEnd(15) + 'Got'.padEnd(15) + 'Confidence'.padEnd(12) + 'Result');
  console.log('─'.repeat(70));
  
  results.forEach(result => {
    const confidence = `${(result.confidence * 100).toFixed(1)}%`.padEnd(10);
    const status = result.correct ? '✅' : '❌';
    const expectedStr = typeof result.expected === 'string' ? result.expected : result.expected.toString();
    console.log(
      result.test.padEnd(25) + 
      expectedStr.padEnd(15) + 
      result.got.padEnd(15) + 
      confidence.padEnd(12) + 
      status
    );
  });

  console.log('\n📈 SUMMARY ANALYSIS');
  console.log('═'.repeat(50));
  console.log(`Overall Accuracy: ${correctClassifications}/${totalTests} (${((correctClassifications / totalTests) * 100).toFixed(1)}%)`);
  
  const basicAccuracy = results.slice(0, basicTests.length).filter(r => r.correct).length / basicTests.length;
  const edgeAccuracy = results.slice(basicTests.length).filter(r => r.correct).length / edgeCaseTests.length;
  
  console.log(`Basic Tests Accuracy: ${(basicAccuracy * 100).toFixed(1)}%`);
  console.log(`Edge Cases Accuracy: ${(edgeAccuracy * 100).toFixed(1)}%`);
  
  const avgConfidence = results.filter(r => r.got !== 'ERROR').reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.got !== 'ERROR').length;
  console.log(`Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('═'.repeat(50));
  
  if (correctClassifications === totalTests) {
    console.log('🎉 Perfect score! AI classification is working excellently.');
  } else if (correctClassifications >= totalTests * 0.9) {
    console.log('🌟 Excellent performance! Minor edge case improvements possible.');
  } else if (correctClassifications >= totalTests * 0.8) {
    console.log('⚠️  Good performance. Some fine-tuning recommended for edge cases.');
  } else if (correctClassifications >= totalTests * 0.7) {
    console.log('🔧 Moderate performance. Prompt engineering improvements needed.');
  } else {
    console.log('🚨 Low performance. Significant improvements needed in prompt or data preprocessing.');
  }

  // Specific failure analysis
  const failures = results.filter(r => !r.correct);
  if (failures.length > 0) {
    console.log('\n🔍 FAILURE ANALYSIS:');
    failures.forEach(failure => {
      console.log(`• ${failure.test}: Expected ${failure.expected}, got ${failure.got}`);
    });
  }
}

async function showDetailedPrompt() {
  console.log('\n🔍 Detailed Prompt Analysis');
  console.log('═'.repeat(50));
  
  const client = new OllamaClient();
  
  // Create a mock prepareActivitySummary method for testing
  const prepareActivitySummary = (activities: RawActivityData[]): string => {
    // This mirrors the enhanced implementation
    const groupedActivities = activities.reduce((groups, activity) => {
      const app = activity.appName;
      if (!groups[app]) groups[app] = [];
      groups[app].push(activity);
      return groups;
    }, {} as Record<string, RawActivityData[]>);
    
    let summary = `Session contains ${activities.length} activities across ${Object.keys(groupedActivities).length} applications:\n\n`;
    
    Object.entries(groupedActivities).forEach(([app, acts], index) => {
      const totalDuration = acts.reduce((sum, a) => sum + a.duration, 0);
      const durationMinutes = Math.round(totalDuration / (1000 * 60));
      
      summary += `${index + 1}. ${app} (${durationMinutes}m)\n`;
      summary += `   Windows: ${acts.map(a => `"${a.windowTitle}"`).join(', ')}\n\n`;
    });
    
    return summary;
  };

  const sampleData = sampleWorkSession;
  const activitySummary = prepareActivitySummary(sampleData);
  const duration = Math.round(sampleData.reduce((sum, a) => sum + a.duration, 0) / (1000 * 60));
  
  console.log('📝 Sample Activity Summary Sent to AI:');
  console.log('─'.repeat(40));
  console.log(activitySummary);
  console.log(`Duration: ${duration} minutes\n`);
  
  console.log('💡 Tips for improving accuracy:');
  console.log('- Window titles should contain meaningful context');
  console.log('- App names should be descriptive');
  console.log('- Session duration should be realistic');
  console.log('- Activities should be grouped logically\n');
}

/**
 * Simple debug test to verify basic AI communication
 */
async function testBasicAI(): Promise<void> {
  console.log('\n🔧 Testing Basic AI Communication...\n');
  
  const client = new OllamaClient();
  
  // Test 1: Health check
  try {
    const isHealthy = await client.checkHealth();
    console.log(`✅ Ollama Health Check: ${isHealthy ? 'PASSED' : 'FAILED'}`);
    
    if (!isHealthy) {
      console.log('❌ Ollama is not available - skipping AI tests');
      return;
    }
  } catch (error) {
    console.log('❌ Ollama Health Check Failed:', error);
    return;
  }

  // Test 2: Simple classification with minimal data
  const simpleTest = {
    activities: [
      {
        appName: 'Visual Studio Code',
        windowTitle: 'main.tsx - FocusFlare',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        duration: 1800000 // 30 minutes
      }
    ],
    context: 'Simple VS Code test'
  };

  try {
    console.log('📝 Testing simple VS Code classification...');
    console.log('Input:', JSON.stringify(simpleTest, null, 2));
    
    const result = await client.classifySession(simpleTest);
    console.log('✅ AI Response:', JSON.stringify(result, null, 2));
    
    if (result.type === 'focused-work') {
      console.log('🎉 Simple test PASSED!');
    } else {
      console.log(`⚠️ Simple test unexpected result: expected 'focused-work', got '${result.type}'`);
    }
  } catch (error) {
    console.log('❌ Simple test FAILED:', error);
  }
}

/**
 * Main test execution function
 */
async function main(): Promise<void> {
  console.log('🧪 FocusFlare AI Classification Test Suite');
  console.log('==========================================\n');

  try {
    // Step 1: Run basic communication test
    await testBasicAI();
    
    // Step 2: Check Ollama status
    console.log('\n🔍 Checking Ollama Status...');
    const isOllamaAvailable = await checkOllamaStatus();
    
    if (!isOllamaAvailable) {
      console.log('❌ Ollama is not available. Please ensure:');
      console.log('   1. Ollama is installed and running');
      console.log('   2. llama3.2:3b model is downloaded');
      console.log('   3. Server is accessible at http://localhost:11434');
      process.exit(1);
    }
    
    console.log('✅ Ollama is available\n');

    // Step 3: Run comprehensive test suite
    await runTestSuite();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { runTestSuite, showDetailedPrompt }; 