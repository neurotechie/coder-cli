# Coder CLI

A Node.js command-line interface (CLI) tool designed to replicate the core task-solving flow of AI agents. It accepts a user-defined task, interacts with an LLM to break it down into executable steps, generates and executes commands, observes the results, and iterates until the task is complete.

## Features

- **Iterative Planning & Execution**: Implements a Plan → Act → Observe loop using an LLM
- **Shell Command Execution**: Safely runs commands in your shell
- **File System Operations**: Robust handling of file operations with support for large files
- **Rate Limiting**: Built-in exponential backoff for API rate limits
- **Context Management**: Strategies for handling LLM context window limitations
- **Configurable**: Supports different LLM providers and models
- **User-Friendly Output**: Clear, color-coded console output showing the agent's process

## Installation

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm (comes with Node.js)

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/coder-cli.git
   cd coder-cli
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root by copying `.env.sample`:

   ```bash
   cp .env.sample .env
   ```

4. Edit the `.env` file to add your LLM API key and configure other settings:

   ```
   LLM_API_KEY=your_api_key_here
   LLM_MODEL=your_preferred_model
   MAX_ITERATIONS=50
   RATE_LIMIT_BASE_DELAY=1000
   RATE_LIMIT_MAX_RETRIES=5
   FILE_CHUNK_SIZE=1000
   ```

5. Build the project:

   ```bash
   npm run build
   ```

6. For development, you can use npm link to make the CLI available globally:

   ```bash
   # Inside the coder-cli directory, run:
   npm link

   # This creates a symlink to your local package
   # You can now run the command from anywhere:
   coder-cli "Your task here"

   # To unlink when done:
   npm unlink coder-cli
   ```

## Usage

### Basic Usage

Run the CLI with a task description:

```bash
npm start -- "Create a simple Express.js server with two routes"
```

Or, if you've installed it globally or via npm link:

```bash
coder-cli "Create a simple Express.js server with two routes"
```

### Command-Line Options

```bash
coder-cli <task> [options]
```

Options:

- `-k, --llm-api-key <key>`: API key for the LLM provider
- `-m, --llm-model <model>`: Model name to use
- `-r, --rate-limit-base-delay <ms>`: Base delay for rate limiting in milliseconds
- `-x, --rate-limit-max-retries <count>`: Maximum retry attempts for rate limiting
- `-c, --file-chunk-size <lines>`: Size of file chunks to process
- `-i, --max-iterations <count>`: Maximum iterations for the agent loop
- `--confirm-actions`: Require confirmation before executing actions

Example with options:

```bash
coder-cli "Refactor this JavaScript code to use async/await" --llm-model "gpt-4" --max-iterations 30 --confirm-actions
```

### Output

The CLI provides color-coded output showing:

- **[Task]**: The main task being performed
- **[Plan]**: The agent's plan for next steps
- **[Action]**: The specific action being taken
- **[Observation]**: Results from actions
- **[System]**: Internal system messages
- **[Error]**: Error messages

## Development

See [development.md](development.md) for detailed development documentation.

### Running Tests

```bash
npm test
```

### Project Structure

```
coder-cli/
├── src/               # Source code
│   ├── core/          # Agent controller and core logic
│   ├── llm/           # LLM client and providers
│   ├── tools/         # Action executor and actions
│   │   └── actions/   # Individual action implementations
│   ├── utils/         # Utility functions
│   └── cli.ts         # Main entry point
├── tests/             # Test files
├── config/            # Configuration
└── ...
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
