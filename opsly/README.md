# Opsly

Opsly is a backend-first TypeScript monorepo project designed to showcase software engineering skills and provide a solid foundation for building real-world applications. This project aims to demonstrate proficiency in backend engineering, TypeScript, API design, and clean project structure.

## Project Goals

- **Backend Engineering Skills**: Build a robust backend system that goes beyond simple CRUD operations.
- **TypeScript Knowledge**: Utilize TypeScript for type safety and better development experience.
- **Monorepo Setup**: Organize the project using a pnpm workspace for better management of shared code and dependencies.
- **Testing**: Implement tests to ensure the reliability and correctness of the application.
- **API Design**: Create a well-structured API with clear endpoints and validation.
- **Clean Project Structure**: Maintain a clean and organized codebase that is easy to navigate and extend.

## Project Structure

```
opsly
├── apps
│   └── api
│       ├── src
│       │   ├── domain          # Business logic related to items
│       │   ├── data            # Data access layer (in-memory repository)
│       │   ├── routes          # API route definitions
│       │   ├── app.ts          # Express app initialization
│       │   └── server.ts       # Entry point for starting the server
│       ├── tests               # Integration tests for the API
│       ├── package.json        # API application configuration
│       └── tsconfig.json       # TypeScript configuration for the API
├── packages
│   └── shared                  # Shared types and interfaces
│       ├── src
│       │   └── index.ts        # Exports shared types
│       ├── package.json        # Shared package configuration
│       └── tsconfig.json       # TypeScript configuration for the shared package
├── package.json                # Root workspace configuration
├── pnpm-workspace.yaml         # Workspace configuration for pnpm
├── tsconfig.json               # Root TypeScript configuration
└── README.md                   # Documentation for the Opsly project
```

## Getting Started

1. **Clone the Repository**: 
   ```bash
   git clone <repository-url>
   cd opsly
   ```

2. **Install Dependencies**: 
   ```bash
   pnpm install
   ```

3. **Run the API**: 
   ```bash
   pnpm --filter api run dev
   ```

4. **Run Tests**: 
   ```bash
   pnpm --filter api run test
   ```

## Features

- **Health Check Endpoint**: A simple `/health` endpoint to verify that the API is running.
- **Items Management**: Endpoints for creating and retrieving items with validation.
- **In-Memory Storage**: An in-memory repository for items, with plans to implement persistent storage in the future.

## Future Improvements

- Implement a repository layer for better data abstraction.
- Add error handling and improve API responses.
- Expand the feature set to include more complex operations and business logic.

## Conclusion

Opsly serves as a portfolio project to demonstrate the ability to build a real backend system using modern technologies and best practices. It aims to impress recruiters and hiring managers by showcasing a solid understanding of software engineering principles.