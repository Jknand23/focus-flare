/**
 * AI Accuracy Analysis Script
 * 
 * Comprehensive analysis tool for understanding AI classification patterns,
 * identifying improvement opportunities, and providing actionable insights
 * for enhancing FocusFlare's AI accuracy.
 * 
 * Usage: npm run analyze-ai-accuracy
 */

import { OllamaClient, checkOllamaStatus } from '../src/main/ai-integration/ollama-client';
import { getDatabaseConnection } from '../src/main/database/connection';
import type { RawActivityData, SessionType } from '../src/shared/types/activity-types';

// === ANALYSIS TYPES ===

interface AccuracyReport {
  overallAccuracy: number;
  categoryAccuracy: Record<SessionType, number>;
  confusionMatrix: Record<SessionType, Record<SessionType, number>>;
  commonMisclassifications: Array<{
    from: SessionType;
    to: SessionType;
    count: number;
    examples: string[];
  }>;
  confidenceAnalysis: {
    averageConfidence: number;
    confidenceByCategory: Record<SessionType, number>;
    lowConfidencePatterns: string[];
  };
  recommendations: string[];
}

interface SessionAnalysis {
  sessionId: number;
  actualType: SessionType;
  predictedType: SessionType;
  confidence: number;
  isCorrect: boolean;
  activities: RawActivityData[];
  userFeedback?: string;
}

// === MAIN ANALYSIS FUNCTIONS ===

/**
 * Analyzes AI classification accuracy from historical data
 */
async function analyzeAIAccuracy(): Promise<AccuracyReport> {
  console.log('🔍 AI Accuracy Analysis');
  console.log('═'.repeat(50));

  const db = getDatabaseConnection();
  
  // Get sessions with user corrections
  const sessionsWithFeedback = await getSessionsWithFeedback(db);
  console.log(`📊 Found ${sessionsWithFeedback.length} sessions with user feedback`);

  if (sessionsWithFeedback.length < 10) {
    console.log('⚠️  Insufficient data for meaningful analysis (need at least 10 corrected sessions)');
    return generateBasicReport();
  }

  // Perform analysis
  const report: AccuracyReport = {
    overallAccuracy: 0,
    categoryAccuracy: {
      'focused-work': 0,
      'research': 0,
      'entertainment': 0,
      'break': 0,
      'unclear': 0
    },
    confusionMatrix: {} as Record<SessionType, Record<SessionType, number>>,
    commonMisclassifications: [],
    confidenceAnalysis: {
      averageConfidence: 0,
      confidenceByCategory: {
        'focused-work': 0,
        'research': 0,
        'entertainment': 0,
        'break': 0,
        'unclear': 0
      },
      lowConfidencePatterns: []
    },
    recommendations: []
  };

  // Calculate overall accuracy
  const correctPredictions = sessionsWithFeedback.filter(s => s.isCorrect).length;
  report.overallAccuracy = correctPredictions / sessionsWithFeedback.length;

  // Build confusion matrix and category accuracy
  const sessionTypes: SessionType[] = ['focused-work', 'research', 'entertainment', 'break', 'unclear'];
  
  // Initialize confusion matrix
  sessionTypes.forEach(actual => {
    report.confusionMatrix[actual] = {};
    sessionTypes.forEach(predicted => {
      report.confusionMatrix[actual][predicted] = 0;
    });
  });

  // Populate confusion matrix and calculate category accuracy
  const categoryStats = {} as Record<SessionType, { correct: number; total: number; confidenceSum: number }>;
  
  sessionTypes.forEach(type => {
    categoryStats[type] = { correct: 0, total: 0, confidenceSum: 0 };
  });

  sessionsWithFeedback.forEach(session => {
    report.confusionMatrix[session.actualType][session.predictedType]++;
    
    categoryStats[session.actualType].total++;
    categoryStats[session.actualType].confidenceSum += session.confidence;
    
    if (session.isCorrect) {
      categoryStats[session.actualType].correct++;
    }
  });

  // Calculate category accuracy and confidence
  sessionTypes.forEach(type => {
    const stats = categoryStats[type];
    report.categoryAccuracy[type] = stats.total > 0 ? stats.correct / stats.total : 0;
    report.confidenceAnalysis.confidenceByCategory[type] = stats.total > 0 ? stats.confidenceSum / stats.total : 0;
  });

  // Calculate average confidence
  const totalConfidence = sessionsWithFeedback.reduce((sum, s) => sum + s.confidence, 0);
  report.confidenceAnalysis.averageConfidence = totalConfidence / sessionsWithFeedback.length;

  // Find common misclassifications
  report.commonMisclassifications = findCommonMisclassifications(sessionsWithFeedback);

  // Identify low confidence patterns
  report.confidenceAnalysis.lowConfidencePatterns = identifyLowConfidencePatterns(sessionsWithFeedback);

  // Generate recommendations
  report.recommendations = generateRecommendations(report, sessionsWithFeedback);
  
  // Enhanced analysis with detailed breakdowns
  console.log(`\n🔍 DETAILED PERFORMANCE BREAKDOWN`);
  console.log('─'.repeat(50));
  
  // Time-based analysis
  const recentSessions = sessionsWithFeedback.filter(s => 
    Date.now() - s.sessionId < 7 * 24 * 60 * 60 * 1000
  );
  if (recentSessions.length > 0) {
    const recentAccuracy = recentSessions.filter(s => s.isCorrect).length / recentSessions.length;
    console.log(`Recent 7-day accuracy: ${(recentAccuracy * 100).toFixed(1)}% (${recentSessions.length} sessions)`);
  }
  
  // Duration-based analysis
  const shortSessions = sessionsWithFeedback.filter(s => s.activities.length <= 3);
  const longSessions = sessionsWithFeedback.filter(s => s.activities.length > 10);
  
  if (shortSessions.length > 0) {
    const shortAccuracy = shortSessions.filter(s => s.isCorrect).length / shortSessions.length;
    console.log(`Short sessions accuracy: ${(shortAccuracy * 100).toFixed(1)}% (≤3 activities)`);
  }
  
  if (longSessions.length > 0) {
    const longAccuracy = longSessions.filter(s => s.isCorrect).length / longSessions.length;
    console.log(`Long sessions accuracy: ${(longAccuracy * 100).toFixed(1)}% (>10 activities)`);
  }

  return report;
}

/**
 * Gets sessions with user feedback from database
 */
async function getSessionsWithFeedback(db: any): Promise<SessionAnalysis[]> {
  const query = `
    SELECT 
      s.id as session_id,
      s.session_type as predicted_type,
      s.confidence_score,
      af.corrected_classification as actual_type,
      af.user_context,
      GROUP_CONCAT(
        a.app_name || '|' || a.window_title || '|' || a.duration,
        ';;'
      ) as activities_data
    FROM sessions s
    JOIN ai_feedback af ON s.id = af.session_id
    LEFT JOIN activities a ON a.session_id = s.id
    WHERE af.corrected_classification IS NOT NULL
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 1000
  `;

  const rows = db.prepare(query).all();

  return rows.map((row: any) => {
    const activities: RawActivityData[] = [];
    
    if (row.activities_data) {
      const activityStrings = row.activities_data.split(';;');
      activityStrings.forEach((activityStr: string, index: number) => {
        const [appName, windowTitle, duration] = activityStr.split('|');
        if (appName && windowTitle) {
          activities.push({
            id: index + 1,
            timestamp: new Date(),
            appName,
            windowTitle,
            duration: parseInt(duration) || 0,
            createdAt: new Date()
          });
        }
      });
    }

    return {
      sessionId: row.session_id,
      actualType: row.actual_type as SessionType,
      predictedType: row.predicted_type as SessionType,
      confidence: row.confidence_score || 0,
      isCorrect: row.actual_type === row.predicted_type,
      activities,
      userFeedback: row.user_context
    };
  });
}

/**
 * Finds the most common misclassification patterns
 */
function findCommonMisclassifications(sessions: SessionAnalysis[]) {
  const misclassifications = new Map<string, {
    from: SessionType;
    to: SessionType;
    count: number;
    examples: string[];
  }>();

  sessions.filter(s => !s.isCorrect).forEach(session => {
    const key = `${session.actualType}→${session.predictedType}`;
    
    if (!misclassifications.has(key)) {
      misclassifications.set(key, {
        from: session.actualType,
        to: session.predictedType,
        count: 0,
        examples: []
      });
    }

    const entry = misclassifications.get(key)!;
    entry.count++;
    
    // Add example if we have activity data
    if (session.activities.length > 0 && entry.examples.length < 3) {
      const example = session.activities
        .slice(0, 2)
        .map(a => `${a.appName}: ${a.windowTitle}`)
        .join(', ');
      entry.examples.push(example);
    }
  });

  return Array.from(misclassifications.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Identifies patterns in low confidence classifications
 */
function identifyLowConfidencePatterns(sessions: SessionAnalysis[]): string[] {
  const lowConfidenceSessions = sessions.filter(s => s.confidence < 0.6);
  const patterns: string[] = [];

  if (lowConfidenceSessions.length === 0) {
    return ['No low confidence patterns found'];
  }

  // Analyze common characteristics
  const appFrequency = new Map<string, number>();
  const titleKeywords = new Map<string, number>();

  lowConfidenceSessions.forEach(session => {
    session.activities.forEach(activity => {
      // Count apps
      const app = activity.appName.toLowerCase();
      appFrequency.set(app, (appFrequency.get(app) || 0) + 1);

      // Count title keywords
      const keywords = activity.windowTitle.toLowerCase().split(/\s+/);
      keywords.forEach(keyword => {
        if (keyword.length > 3) {
          titleKeywords.set(keyword, (titleKeywords.get(keyword) || 0) + 1);
        }
      });
    });
  });

  // Identify most common low-confidence apps
  const topApps = Array.from(appFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topApps.length > 0) {
    patterns.push(`Common low-confidence apps: ${topApps.map(([app, count]) => `${app} (${count}x)`).join(', ')}`);
  }

  // Identify common keywords in low-confidence classifications
  const topKeywords = Array.from(titleKeywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topKeywords.length > 0) {
    patterns.push(`Low-confidence keywords: ${topKeywords.map(([word, count]) => `${word} (${count}x)`).join(', ')}`);
  }

  return patterns;
}

/**
 * Generates actionable recommendations based on analysis
 */
function generateRecommendations(report: AccuracyReport, sessions: SessionAnalysis[]): string[] {
  const recommendations: string[] = [];

  // Overall accuracy recommendations
  if (report.overallAccuracy < 0.7) {
    recommendations.push('🚨 CRITICAL: Overall accuracy is below 70%. Consider prompt engineering improvements.');
  } else if (report.overallAccuracy < 0.8) {
    recommendations.push('⚠️  MODERATE: Accuracy could be improved. Focus on edge cases and context enhancement.');
  } else if (report.overallAccuracy < 0.9) {
    recommendations.push('✅ GOOD: Accuracy is acceptable. Fine-tune specific categories for excellence.');
  } else {
    recommendations.push('🌟 EXCELLENT: High accuracy achieved. Focus on maintaining consistency.');
  }

  // Category-specific recommendations
  Object.entries(report.categoryAccuracy).forEach(([category, accuracy]) => {
    if (accuracy < 0.6) {
      recommendations.push(`📍 Poor ${category} classification (${(accuracy * 100).toFixed(1)}%). Review ${category} indicators in prompt.`);
    }
  });

  // Misclassification recommendations
  if (report.commonMisclassifications.length > 0) {
    const topMisclassification = report.commonMisclassifications[0];
    recommendations.push(`🔄 Most common error: ${topMisclassification.from} → ${topMisclassification.to} (${topMisclassification.count} times). Add specific examples to prompt.`);
  }

  // Confidence recommendations
  if (report.confidenceAnalysis.averageConfidence < 0.7) {
    recommendations.push('📉 Low average confidence. Consider improving prompt clarity and adding more examples.');
  }

  // Pattern-specific recommendations
  const browserSessions = sessions.filter(s => 
    s.activities.some(a => a.appName.toLowerCase().includes('chrome') || a.appName.toLowerCase().includes('firefox'))
  );
  
  if (browserSessions.length > 0) {
    const browserAccuracy = browserSessions.filter(s => s.isCorrect).length / browserSessions.length;
    if (browserAccuracy < 0.8) {
      recommendations.push('🌐 Browser sessions show lower accuracy. Enhance browser content analysis rules.');
    }
  }

  // Data volume recommendations
  if (sessions.length < 50) {
    recommendations.push('📊 Limited feedback data. Encourage more user corrections to improve analysis.');
  }

  return recommendations;
}

/**
 * Generates a basic report when insufficient data is available
 */
function generateBasicReport(): AccuracyReport {
  return {
    overallAccuracy: 0,
    categoryAccuracy: {} as Record<SessionType, number>,
    confusionMatrix: {} as Record<SessionType, Record<SessionType, number>>,
    commonMisclassifications: [],
    confidenceAnalysis: {
      averageConfidence: 0,
      confidenceByCategory: {} as Record<SessionType, number>,
      lowConfidencePatterns: ['Insufficient data for pattern analysis']
    },
    recommendations: [
      'Collect more user feedback data to enable meaningful analysis',
      'Ensure users are correcting AI classifications when incorrect',
      'Run the system for at least 1-2 weeks to gather sufficient data'
    ]
  };
}

/**
 * Displays the analysis report in a formatted way
 */
function displayReport(report: AccuracyReport): void {
  console.log('\n📈 ACCURACY ANALYSIS REPORT');
  console.log('═'.repeat(60));

  // Overall metrics
  console.log(`\n📊 OVERALL PERFORMANCE`);
  console.log(`Overall Accuracy: ${(report.overallAccuracy * 100).toFixed(1)}%`);
  console.log(`Average Confidence: ${(report.confidenceAnalysis.averageConfidence * 100).toFixed(1)}%`);

  // Category breakdown
  console.log(`\n🎯 CATEGORY ACCURACY`);
  console.log('─'.repeat(40));
  Object.entries(report.categoryAccuracy).forEach(([category, accuracy]) => {
    const percentage = (accuracy * 100).toFixed(1);
    const confidence = (report.confidenceAnalysis.confidenceByCategory[category] * 100).toFixed(1);
    console.log(`${category.padEnd(15)}: ${percentage.padStart(5)}% (conf: ${confidence}%)`);
  });

  // Confusion matrix
  if (Object.keys(report.confusionMatrix).length > 0) {
    console.log(`\n🔄 CONFUSION MATRIX`);
    console.log('─'.repeat(40));
    console.log('Actual \\ Predicted:', Object.keys(report.confusionMatrix).join('\t'));
    Object.entries(report.confusionMatrix).forEach(([actual, predictions]) => {
      const row = Object.values(predictions).join('\t\t');
      console.log(`${actual}:\t${row}`);
    });
  }

  // Common errors
  if (report.commonMisclassifications.length > 0) {
    console.log(`\n❌ COMMON MISCLASSIFICATIONS`);
    console.log('─'.repeat(40));
    report.commonMisclassifications.slice(0, 5).forEach((error, index) => {
      console.log(`${index + 1}. ${error.from} → ${error.to} (${error.count} times)`);
      if (error.examples.length > 0) {
        console.log(`   Example: ${error.examples[0]}`);
      }
    });
  }

  // Low confidence patterns
  console.log(`\n📉 LOW CONFIDENCE PATTERNS`);
  console.log('─'.repeat(40));
  report.confidenceAnalysis.lowConfidencePatterns.forEach(pattern => {
    console.log(`• ${pattern}`);
  });

  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS`);
  console.log('═'.repeat(40));
  report.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });

  console.log('\n✨ Analysis complete! Use these insights to improve AI accuracy.');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    // Check if Ollama is available for potential live testing
    console.log('Checking system status...');
    const ollamaAvailable = await checkOllamaStatus();
    console.log(`Ollama Status: ${ollamaAvailable ? '✅ Available' : '❌ Unavailable'}`);

    // Perform analysis
    const report = await analyzeAIAccuracy();
    
    // Display results
    displayReport(report);

    // Optional: Save report to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `accuracy-report-${timestamp}.json`;
    
    try {
      const fs = require('fs');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved to: ${reportPath}`);
    } catch (error) {
      console.log('\n⚠️  Could not save report to file');
    }

  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run the analysis
if (require.main === module) {
  main();
}

export { analyzeAIAccuracy, type AccuracyReport }; 