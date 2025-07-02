FocusFlare - Your Digital Compass: Project Overview
"Illuminate your focus. Navigate your day."

Purpose
FocusFlare is a Windows desktop application designed to intelligently and passively track your computer usage. It leverages AI-powered local workflows to analyze your work and focus patterns, generating private, editable daily summaries. Its core purpose is to provide immediate, subtle visual feedback and guided self-reflection, helping you understand your digital habits and gently steer towards more productive "flow states." FocusFlare uniquely addresses the nuance of digital multitasking, understanding that some background activities don't always equal distraction.

The goal is to support mindful productivity and self-awareness for all users, particularly benefiting those with attentional differences like ADHD, by offering insights that are easy to digest, actionable, and positively reinforcing, minimizing friction and overwhelm.

Problem It Solves
Traditional productivity tools often:

Demand constant manual input, which is a barrier to sustained use.

Distract with intrusive notifications and alerts.

Fail to provide clear, actionable insights into actual work patterns, often misinterpreting background activities as distractions.

Lack customizable visual feedback tailored to individual needs.

Compromise privacy with cloud-based analytics.

You want a tool that:

Respects your attention with a silent, background operation.

Intelligently understands context, differentiating between productive background use and true distraction.

Provides intuitive, visual feedback on your focus patterns.

Empowers self-correction through guided, optional reflection.

Celebrates small wins to encourage positive habits.

Learns gently over time with your feedback.

Upholds strict privacy standards with local processing.

Core Features
1. 🧭 Intelligent Passive Activity Logging (The "Flare" Collection)
Runs silently in the background from the system tray.

Automatically logs user-interactive application usage and active windows (timestamp, duration, application name, window title), ignoring background system processes.

Contextual Awareness: Beyond just detecting active windows, FocusFlare also monitors background application audio and video playback. This allows the AI to later differentiate between active engagement with a distracting app (e.g., watching a YouTube video in the foreground) versus background ambient use (e.g., listening to a YouTube playlist while working in a document).

Stores all logs locally in JSON or SQLite format.

Intelligently detects idle periods and session lengths to differentiate active work from breaks.

2. 🤖 AI-Based Session Labeling (Local "Compass" Analysis)
Utilizes LangGraph to analyze raw activity data, incorporating contextual cues (foreground vs. background, audio/video playback status) to intelligently label usage blocks (e.g., "Focused Work," "Research & Reading," "Entertainment," "Background Audio/Video," "Break Time," "Unclear").

Employs advanced heuristics like app name, duration, co-occurring applications, and user-defined rules, now enhanced by the new background activity detection.

Self-Refinement & Guided Learning: Improves classification accuracy over time as the user corrects mislabeled sessions. When a user corrects a label, a subtle, optional prompt may appear asking "What led to this change?" or "How would you describe this activity?", allowing for deeper, private self-reflection and valuable AI training data. This feedback is crucial for fine-tuning the AI's understanding of "ambient" versus "distracting" background activity.

3. ☀️ Daily "FocusFlare" Summary Dashboard
An intuitive, non-intrusive dashboard accessible via the system tray icon, providing:

Visual Timeline: A clear, color-coded daily timeline of all recorded sessions, visually distinguishing between foreground "active" use and background "ambient" activity for certain applications.

Customizable Color-Coding: Users can easily define and customize the colors associated with each AI-generated session label (e.g., "Focused Work" = green, "Entertainment" = red, "Background Audio/Video" = light blue), aiding quick visual pattern recognition.

At-a-Glance Metrics: Displays key metrics like total "Focused Work" time, total "Research & Reading" time, total "Break Time", etc.

"Time Since Last Break" Indicator: A subtle, dynamic counter indicating how long it's been since the last recognized break or idle period, encouraging mindful pacing without interruption.

"Small Win" Recognition: Gentle, positive affirmations displayed when opening the summary, celebrating achievements like "Great focus today!", "You consistently stayed engaged!", or "Your insights are helping the AI learn brilliantly!".

Session Filtering & Grouping: Easy controls to filter the timeline (e.g., "Show only Focused Work," "Exclude Entertainment") or group sessions by application, providing immediate ways to explore specific patterns.

Corrections & Feedback: Users can easily review and correct any AI-generated labels, directly contributing to the AI's learning process.


4. 🛠️ Optional Background Automations (Powered by N8N - Local & Modular)
Integrate highly customizable, locally run workflows for enhanced utility. Examples include:

A gentle, opt-in daily reminder to review yesterday's "FocusFlare" summary.

Automating simple file organization based on active app (e.g., move downloads to project folders).

Integrating with local calendar data (e.g., "You had a meeting during this period").

All N8N automations are user-configured, run locally, and can be toggled on/off for complete control and privacy.

Privacy & Design Philosophy
FocusFlare is meticulously built on principles of:

Privacy-First Architecture: Absolutely no cloud sync, no tracking, no ads. All data remains on the user's device.

User-Led Control: The application never dictates; it informs. You trigger reviews or corrections when you want to, and automate only what you choose.

Transparency: All logged data is fully visible, understandable, and editable by you.

Minimalism & Non-Intrusion: It never interrupts your focus. Insights are available when you seek them, and feedback mechanisms are designed to be subtle and optional, avoiding cognitive overload, especially beneficial for individuals managing ADHD.

Positive Reinforcement: Focuses on acknowledging progress and providing gentle guidance rather than prescriptive rules. 