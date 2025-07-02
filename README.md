# FocusFlare - Your Digital Compass
*"Illuminate your focus. Navigate your day."*

[![Windows](https://img.shields.io/badge/Platform-Windows-blue.svg)](https://www.microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Built%20with-Electron-47848F.svg)](https://electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Privacy First](https://img.shields.io/badge/Privacy-First-green.svg)](#privacy--security)

FocusFlare is a privacy-first Windows desktop application that intelligently and passively tracks your computer usage, leveraging AI-powered local workflows to analyze your work and focus patterns. It generates private, editable daily summaries with subtle visual feedback and guided self-reflection to help you understand your digital habits and gently steer towards more productive flow states.

## ✨ Key Features

### 🧭 **Intelligent Passive Activity Logging**
- Runs silently in the background from system tray
- Automatically logs user-interactive applications and active windows
- Contextual awareness of background audio/video vs. active engagement
- Intelligent idle period and session length detection
- Local storage in SQLite format

### 🤖 **AI-Based Session Classification**
- Local AI processing using Ollama + Llama 3.2 (3B model)
- Intelligently labels usage blocks (Focused Work, Research, Entertainment, etc.)
- Self-refinement through guided user feedback
- No cloud dependencies - completely offline

### ☀️ **Daily FocusFlare Summary Dashboard**
- Intuitive, non-intrusive dashboard via system tray
- Visual timeline with customizable color-coding
- At-a-glance metrics and "small win" recognition
- Session filtering, grouping, and correction capabilities
- Time since last break indicator

### 🛠️ **Optional Background Automations**
- Local N8N workflow integration
- Customizable automations (file organization, calendar integration)
- User-configured and locally run
- Complete control with toggle on/off capabilities

## 🏗️ Tech Stack

### **Core Framework**
- **Electron** - Desktop application framework with Windows optimization
- **React 18 + TypeScript 5** - Modern UI development with strong typing
- **Vite** - Fast development builds and excellent TypeScript support

### **UI & Styling**
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui + Radix UI** - Accessible, customizable component library
- **Recharts + D3** - Advanced data visualization for timeline charts

### **Data Management**
- **SQLite + better-sqlite3** - Local database with excellent performance
- **Zustand** - Simple, TypeScript-first state management

### **AI & Automation**
- **Ollama + Llama 3.2** - Local AI processing for session classification
- **N8N** - Local workflow automation engine

### **System Integration**
- **Native Node.js Addons** - Windows API integration for activity monitoring
- **PowerShell Integration** - Enhanced system monitoring capabilities

## 🚀 Getting Started

### Prerequisites
- **Windows 10/11** (64-bit)
- **Node.js 18+** and npm/yarn
- **Visual Studio Build Tools** (for native modules)
- **Ollama** ([Download here](https://ollama.ai/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/focusflare.git
   cd focusflare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Ollama**
   ```bash
   # Install and start Ollama
   ollama pull llama3.2:3b
   ollama serve
   ```

4. **Initialize database**
   ```bash
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Build for Production
```bash
npm run build
npm run dist
```

## 📁 Project Structure

```
FocusFlare/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── system-monitoring/   # Native system integration
│   │   ├── database/           # SQLite data layer
│   │   ├── ai-integration/     # Local AI processing
│   │   └── automation/         # N8N workflow integration
│   ├── renderer/               # Electron renderer process
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Top-level page components
│   │   ├── stores/            # Zustand state management
│   │   ├── hooks/             # Custom React hooks
│   │   └── utils/             # Utility functions
│   ├── shared/                # Shared code between processes
│   └── preload/               # Electron preload scripts
├── _docs/                     # Project documentation
├── tests/                     # Test files
└── config/                    # Configuration files
```

## 🎯 Development Conventions

### **AI-First Codebase Principles**
- **500-line file maximum** for AI tool compatibility
- **Feature-based organization** over file type grouping
- **Comprehensive JSDoc/TSDoc documentation** for all functions
- **Descriptive naming** with auxiliary verbs (isLoading, hasError)
- **Functional programming patterns** - avoid classes where possible

### **Code Style Standards**
- **TypeScript strict mode** enabled
- **Functional and declarative patterns** preferred
- **Pure functions** using `function` keyword
- **Maps over enums** for better type safety
- **Error throwing** instead of fallback values

### **File Naming Conventions**
- **kebab-case for files**: `window-tracker.ts`, `session-classifier.ts`
- **PascalCase for React components**: `DashboardPage.tsx`, `TimelineChart.tsx`
- **Descriptive, specific names**: Avoid generic names like `utils.ts`
- **Consistent suffixes**: `.store.ts`, `.hook.ts`, `.types.ts`

## 🔒 Privacy & Security

FocusFlare is built on privacy-first principles:

- ✅ **No cloud sync** - All data remains on your device
- ✅ **Local AI processing** - No external API calls for classification
- ✅ **Transparent data handling** - All logged data is visible and editable
- ✅ **User-controlled automation** - You decide what gets automated
- ✅ **Minimal permissions** - Only requests necessary system access
- ✅ **Encrypted storage** - Sensitive data encrypted using Electron's safeStorage

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests  
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run all tests with coverage
npm run test:coverage
```

## 📖 Documentation

- **[Project Overview](_docs/project-overview.md)** - Detailed project description and goals
- **[User Flow](_docs/user-flow.md)** - Complete user journey documentation
- **[Tech Stack](_docs/tech-stack.md)** - Technology decisions and best practices
- **[Project Rules](_docs/project-rules.md)** - Development standards and conventions
- **[Development Phases](_docs/phases/)** - Implementation roadmap

## 🤝 Contributing

1. **Follow project conventions** outlined in [Project Rules](_docs/project-rules.md)
2. **Maintain file size limits** (500 lines maximum)
3. **Include comprehensive documentation** with JSDoc comments
4. **Write tests** for new functionality
5. **Ensure TypeScript strict mode compliance**
6. **Follow functional programming patterns**

### Development Workflow
1. Create feature branch with descriptive name
2. Follow conventional commit format
3. Ensure all tests pass
4. Submit PR with comprehensive description
5. Address code review feedback

## 📊 Architecture Overview

```
┌─────────────────────────────────────────┐
│           Electron Main Process         │
├─────────────────────────────────────────┤
│ System Monitoring │ SQLite │ N8N Instance│
└─────────────────────────────────────────┘
                    │
                    │ IPC Communication
                    │
┌─────────────────────────────────────────┐
│         Electron Renderer Process       │
├─────────────────────────────────────────┤
│      React + TypeScript + Tailwind     │
│            Zustand State Management     │
└─────────────────────────────────────────┘
                    │
                    │ HTTP Requests
                    │
┌─────────────────────────────────────────┐
│          Ollama Local Server            │
├─────────────────────────────────────────┤
│    Llama 3.2 Model Classification      │
└─────────────────────────────────────────┘
```

## 🐛 Known Issues & Limitations

- **Hardware Requirements**: Minimum 8GB RAM recommended for local AI model
- **Windows Only**: Currently supports Windows 10/11 exclusively  
- **Cold Start**: First AI classification takes 5-10 seconds after model load
- **Native Dependencies**: Requires Visual Studio Build Tools for compilation

## 📝 License

[Add your license information here]

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/your-org/focusflare/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/focusflare/discussions)
- **Documentation**: Check the `_docs/` folder for detailed guides

---

**FocusFlare** - Illuminate your focus, navigate your day with privacy-first AI assistance! 🧭✨

*Built with ❤️ for mindful productivity and digital self-awareness* 