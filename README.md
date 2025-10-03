# Focus Metrics Dashboard

A productivity and task-tracking dashboard built with **React (Vite + MUI)** on the frontend and **FastAPI** on the backend.  
The app helps users manage tasks, monitor progress, and get insights into productivity patterns.

---

##  Problem Description

Staying productive is hard when you have multiple tasks spread across different tools.  
There’s no lightweight way to **track tasks, measure completion rates, and get personalized productivity tips** in one place.

---

## Solution

The **Focus Metrics Dashboard** addresses this by:

-  Providing an intuitive **task board** (Active, In-Progress, Done)  
-  Visualizing productivity metrics (weekly progress, completion %, and time spent)  
-  Tracking task history with completion timestamps  
-  Integrating an experimental **chatbot** to answer productivity-related queries  

Currently, tasks are stored in an **in-memory backend** for simplicity, with APIs for:
- Creating / updating / deleting tasks
- Fetching weekly metrics
- Chat endpoint (experimental Gemini API integration)

---

## 🔮 Gemini AI Integration (Work in Progress)

We are currently working on integrating **Google Gemini API** to power the in-app chatbot.  
The chatbot will be able to answer questions like:
- *“Which of my tasks took the longest?”*  
- *“Give me 3 psychological tricks to improve focus.”*  
- *“How can I structure my day better?”*

👉 Integration uses [`google-generativeai`](https://pypi.org/project/google-generativeai/) and will evolve as Gemini adds more stable endpoints.  

Also tagged: [**Google DeepMind Gemini**](https://deepmind.google/technologies/gemini/)  

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Material-UI, Zustand (state), IndexedDB  
- **Backend:** FastAPI, Python 3.13, Uvicorn  
- **AI (WIP):** Google Gemini API (`google-generativeai`)  
- **Other Tools:** dotenv, CORS, Pydantic  

---

## ⚡ Getting Started

1. **Clone repo**
   ```bash
   git clone https://github.com/farheen-shaikh530/focus-metrics-dashboard.git
   cd focus-metrics-dashboard
   

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
