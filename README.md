# Cyberpunk Full-Stack Developer Portfolio

Welcome to the central repository for my interactive, sci-fi themed digital portfolio. This project represents a complete full-stack web application designed from the ground up to showcase advanced modern web development capabilities, focusing on premium aesthetics, complex animations, and robust backend engineering.

## 🌐 Project Architecture

This is a monorepo containing both the state-of-the-art cyberpunk frontend experience and its supporting backend API.

| Component | Description | Technologies |
| :--- | :--- | :--- |
| **[Frontend](./Frontend/README.md)** | An immersive, HUD-style interactive experience featuring glow effects, particle systems, and complex framer-motion animations. | React 19, Vite 8, Tailwind CSS 4, Framer Motion, Radix UI |
| **[Backend](./Backend/README.md)** | A scalable, type-safe RESTful API integrating a relational database to power dynamic portfolio content. | Node.js 22, Express 5, TypeScript 6, PostgreSQL 16 (Neon), Drizzle ORM, Zod |

### 🚀 Getting Started

The application is designed to be run locally in development mode by starting both isolated environments.

**1. Start the Backend API Server:**
Navigate to the `Backend` directory, configure your `.env`, run database migrations, and start the development server. Complete details are located in the [Backend Documentation](./Backend/README.md).

**2. Start the Frontend Experience:**
Navigate to the `Frontend` directory, install dependencies, and launch Vite. Complete details are located in the [Frontend Documentation](./Frontend/README.md).

## 💡 Engineering Highlights

- **Shared Type Safety:** Utilizes a workspace-managed `@portfolio/shared` package to seamlessly align Zod schema validations and Drizzle ORM definitions directly across frontend API consumers and backend route handlers.
- **Premium User Experience:** Implements complex visual features like glitch hover artifacts, floating ambient particles, responsive layout morphing, and a completely custom-styled interactive cursor to match the cyberpunk theme.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---
Designed and Developed by [Abdhesh Sah](mailto:contact@abdheshsah.com.np)
