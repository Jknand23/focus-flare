/**
 * Development Script - Runs FocusFlare in development mode
 * 
 * Handles starting the Vite development server and Electron application
 * with proper environment configuration and hot reloading support.
 * 
 * @module DevScript
 * @author FocusFlare Team
 * @since 0.1.0
 */

import { spawn } from 'child_process';

/**
 * Starts the development server and Electron application
 */
async function startDevelopment() {
  console.log('🚀 Starting FocusFlare in development mode...');
  
  // Set development environment
  process.env.NODE_ENV = 'development';
  
  try {
    // Start the Vite development server
    console.log('📦 Starting Vite development server...');
    
    const viteProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true
    });
    
    // Handle process cleanup
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down development server...');
      viteProcess.kill();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      viteProcess.kill();
      process.exit(0);
    });
    
    viteProcess.on('close', (code) => {
      console.log(`Development server exited with code ${code}`);
      process.exit(code || 0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start development mode:', error);
    process.exit(1);
  }
}

// Start development
startDevelopment(); 