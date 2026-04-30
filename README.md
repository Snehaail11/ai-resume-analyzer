# 🤖 AI Resume Analyzer
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-green)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq-API-purple)](https://groq.com)
[![Vite](https://img.shields.io/badge/Vite-5.4-yellow)](https://vitejs.dev/)

> 🎯 **Smart AI tool that compares your resume against any job description and provides actionable feedback to improve your ATS score.**


## ✨ Features

### Core Features
| Feature | Description | Status |
|---------|-------------|--------|
| 📄 **Resume Upload** | PDF, DOCX, TXT support with drag & drop | ✅ |
| 💼 **JD Upload** | PDF, DOCX, TXT support with drag & drop | ✅ |
| ✍️ **Text Paste** | Manual text input as alternative | ✅ |
| 🤖 **AI Analysis** | Powered by Groq Llama 3.3 70B | ✅ |
| 📊 **Match Score** | 0-100 score based on JD alignment | ✅ |
| 🔑 **Keyword Analysis** | Found vs Missing keywords | ✅ |
| ⚠️ **Gap Detection** | Specific requirement mismatches | ✅ |
| 💡 **Recommendations** | Prioritized actionable tips | ✅ |
| 🎯 **Domain Detection** | Finance, Tech, HR, Marketing | ✅ |

### UX Features
- 🎨 Modern, responsive design
- 📱 Mobile-friendly interface
- ⚡ Fast loading with Vite
- 🔄 Real-time analysis status
- 📁 Drag & drop file upload
- 🧹 Clean error handling
- 🔒 Privacy-focused (no data storage)

---

## 🛠️ Tech Stack

### Frontend
```json
{
  "framework": "React 18.3.1",
  "language": "TypeScript 5.6.2",
  "buildTool": "Vite 5.4.10",
  "styling": "Tailwind CSS 3.4.17",
  "fileUpload": "react-dropzone"
}
