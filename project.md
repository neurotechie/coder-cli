**Technical Specification: Node.js CLI Agent Tool**

**Version:** 1.0
**Date:** May 16, 2024

**Table of Contents**

1.  Overview
2.  Goals
3.  System Architecture
4.  Project Structure
5.  Components
6.  Detailed Workflow (Plan/Execute Cycle)
7.  Prompting Strategy
8.  Action/Observation Formatting
9.  Output and Logging
10. Handling LLM Limitations
11. Handling Large Files
12. Code Snippets (Illustrative)
13. Technology Stack
14. Test-Driven Development (TDD) Approach
15. Project Implementation Phases
16. Security Considerations
17. Future Enhancements

---

**1. Overview**

This document specifies a Node.js command-line interface (CLI) tool designed to replicate the core task-solving flow of AI agents. The tool will accept a user-defined task, interact with an LLM to break it down into executable steps (planning), generate specific commands based on those steps (execution), execute those steps (shell commands, file operations), observe the results, and iterate until the task is complete or requires user intervention. It incorporates strategies for handling large files and LLM constraints, developed using a Test-Driven Development approach.

**2. Goals**

- Create a Node.js CLI application.
- Implement an iterative Plan -> Act -> Observe loop using an LLM.
- Support executing shell commands and robust file system operations (read, write, chunking for large files).
- Provide clear output mirroring the agent's planning process, actions, and observations.
- Implement strategies for handling LLM rate limits and context window limitations, including for large file contents.
- Allow configuration of the LLM provider and API keys.
- Develop the application using Test-Driven Development (TDD).

**3. System Architecture**

```
+---------------------+      +-----------------+      +-----------------+
|   CLI Interface     |----->| Agent Controller|----->|   LLM Client    |
| (src/cli.js)        |      | (src/core/     |<-----| (src/llm/       |
|                     |      |  AgentController)|      |  LLMClient)     |
+---------------------+      +--------+--------+      +-----------------+
       | User Input                     |
       | Task Definition                | Planner Prompt / Executor Prompt
       |                                | LLM Response (Plan / Action JSON)
       |                                v
       |                      +-----------------+      +--------------------+
       |                      | Action Executor |----->| Environment        |
       |                      | (src/tools/     |      | (Shell, Filesystem)|
       |                      |  ActionExecutor)|      +--------------------+
       |                      +-----------------+
       |                                | Action Result (Observation)
       |                                v
       +--------------------------------+
       | Output to User (console.log, chalk)
```

**4. Project Structure**

```
openhands-node/
├── src/
│   ├── core/
│   │   └── AgentController.js   # Manages the main agent loop (Plan -> Execute -> Observe)
│   ├── llm/
│   │   ├── LLMClient.js         # Interface for LLM API communication
│   │   ├── providers/           # (Optional) Specific provider implementations
│   │   │   └── OpenaiClient.js
│   │   └── Tokenizer.js         # Utility for counting tokens
│   ├── tools/
│   │   ├── ActionExecutor.js    # Executes validated actions
│   │   ├── actions/             # Individual action implementations
│   │   │   ├── shell.js
│   │   │   ├── fileSystem.js    # Includes large file handling logic
│   │   │   └── finish.js
│   │   └── toolSchemas.js       # Action schemas/descriptions for prompts
│   ├── utils/
│   │   ├── logger.js            # Formatted console logging
│   │   └── RateLimiter.js       # Exponential backoff logic
│   └── cli.js                   # Main entry point, CLI argument parsing
├── tests/                      # Unit and Integration tests
│   ├── core/
│   │   └── AgentController.test.js
│   ├── llm/
│   │   └── LLMClient.test.js
│   ├── tools/
│   │   ├── ActionExecutor.test.js
│   │   └── actions/
│   │       ├── shell.test.js
│   │       └── fileSystem.test.js
│   └── utils/
│       ├── logger.test.js
│       └── RateLimiter.test.js
├── config/
│   └── index.js                 # Loads config from .env and args
├── .env                         # API keys, configuration (add to .gitignore)
├── .gitignore
├── jest.config.js               # Jest configuration
├── package.json
└── README.md
```

**5. Components**

- **5.1. CLI Interface (`src/cli.js`)**
  - **Technology:** Node.js, `commander` or `yargs`.
  - **Functionality:** Parses command-line arguments (task, flags), loads configuration, initializes and runs the `AgentController`, handles top-level errors, and displays formatted output via the logger.
- **5.2. Agent Controller (`src/core/AgentController.js`)**
  - **Technology:** Node.js (Class).
  - **Functionality:** Orchestrates the Plan -> Execute -> Observe loop. Manages agent state (task, history, current plan). Determines whether to request a plan or an action. Formats prompts for the `LLMClient` using planner/executor strategies. Parses LLM responses (plans and action JSON). Invokes `ActionExecutor`. Processes observations. Handles context window management and summarization. Manages loop termination.
- **5.3. LLM Client (`src/llm/LLMClient.js`)**
  - **Technology:** Node.js, `axios`/`node-fetch` or LLM SDKs, `RateLimiter`.
  - **Functionality:** Abstract interface for LLM interaction. Sends formatted prompts, handles authentication, uses `RateLimiter` for API calls, returns LLM responses. Can be implemented with specific providers (`src/llm/providers/`). Uses `Tokenizer` for context estimation.
- **5.4. Action Executor (`src/tools/ActionExecutor.js`)**
  - **Technology:** Node.js, `child_process`, `fs/promises`.
  - **Functionality:** Registry and execution engine for available actions defined in `src/tools/actions/`. Takes parsed action requests (name, parameters) from the `AgentController`, validates them, executes the corresponding action function (e.g., `shell.execute`, `fileSystem.readFileChunk`), and returns the observation object.
- **5.5. State Manager (Integrated within `AgentController`)**
  - **Functionality:** Manages the conversation history array, distinguishing between plans, actions, and observations. Tracks the current plan/sub-task. Implements context window strategies (truncation, summarization) before prompt generation.
- **5.6. Configuration Manager (`config/index.js`)**
  - **Technology:** Node.js, `dotenv`.
  - **Functionality:** Loads and provides access to configuration (API keys, model names, max iterations, file chunk size) from `.env` and CLI flags.
- **5.7. Logger (`src/utils/logger.js`)**
  - **Technology:** Node.js, `chalk`.
  - **Functionality:** Provides standardized, color-coded console output functions (e.g., `log.task`, `log.plan`, `log.action`, `log.observation`, `log.error`, `log.system`).
- **5.8. Tokenizer (`src/llm/Tokenizer.js`)**
  - **Technology:** Node.js, `gpt-3-encoder` or similar library.
  - **Functionality:** Provides utility functions to estimate the token count of prompts and text segments based on the target LLM's tokenization scheme.
- **5.9. Rate Limiter (`src/utils/RateLimiter.js`)**
  - **Technology:** Node.js.
  - **Functionality:** Implements an exponential backoff algorithm with jitter to handle API rate limits gracefully when making calls via `LLMClient`.

**6. Detailed Workflow (Plan/Execute Cycle)**

1.  **Initialization:** User runs `node src/cli.js "Task..."`. `cli.js` parses args, loads config, instantiates `AgentController`.
2.  **Planning Step:** `AgentController` prepares and sends a **Planner Prompt** (Sec 7.2) to `LLMClient`. Receives and parses the textual plan/thought. Logs `[Plan]`. If plan is `finish`, go to step 7.
3.  **Execution Step:** `AgentController` prepares and sends an **Executor Prompt** (Sec 7.3) with the current sub-task to `LLMClient`. Receives and parses the structured action JSON. Logs `[Action]`.
4.  **Action Execution:** `AgentController` passes the validated action JSON to `ActionExecutor.execute(action)`.
5.  **Observation:** `ActionExecutor` performs the action (e.g., runs shell command, reads file chunk) and returns an observation object. `AgentController` logs `[Observation]`.
6.  **State Update & Loop:** `AgentController` updates history, handles context limits (Sec 10.2), checks termination conditions. If continuing, returns to **Step 2 (Planning Step)**.
7.  **Termination:** `AgentController` logs final status and exits.

**7. Prompting Strategy**

- **7.1. Core System Prompt (Base):**
  - Defines the agent's persona ('OpenHands-Node'), goal, loop structure (Plan -> Execute -> Observe), and available actions/tools with detailed schemas (`src/tools/toolSchemas.js`). Emphasizes step-by-step thinking and error analysis. Tool descriptions _must_ include the large file handling actions (See Section 11).
- **7.2. Planner Prompt Structure:**
  - **Goal:** Analyze task, history (summarized), and last observation to determine the next sub-task or completion.
  - **Input:** Core System Prompt (planning focus), User Goal, Summarized History, Last Observation, Instruction ("Review..., decide next sub-task or if goal achieved. Output reasoning and next sub-task description / plan to finish.").
  - **Output:** Natural language plan/thought.
- **7.3. Executor Prompt Structure:**
  - **Goal:** Generate the specific action JSON for a given sub-task.
  - **Input:** Core System Prompt (execution/tool focus), Current Sub-task (from Planner), Detailed Tool Schemas (from `src/tools/toolSchemas.js`), Relevant Recent Context (last 1-2 observations, recent file stats/chunks), Instruction ("Accomplish Current Task: '...'. Select ONE tool. Respond ONLY with valid JSON: `{\"action\": {\"name\": \"tool_name\", \"parameters\": {...}}}`").
  - **Output:** Single, structured JSON object representing the action.
- **7.4. Observation Formatting (Input to Planner):**
  - Standardized string format: `Observation from [Action Name] (Parameters: [...]): [Result Summary]` (e.g., `ExitCode: 0, Stdout: ..., Stderr: ...`, `Success: true, Message: ...`, `Read X bytes from file Y`, `Got file stats for Z`). Errors (stderr) should be included.
- **7.5. Task Completion:** Driven by the Planner deciding the goal is met based on observations, leading to an Executor call for the `finish` action.

**8. Action/Observation Formatting**

- **Actions (LLM Output):** Must strictly adhere to the JSON format requested in the Executor Prompt. Parsed by `AgentController`.
- **Observations (ActionExecutor Output):** Standardized JavaScript objects returned by action functions, formatted into strings (Sec 7.4) by `AgentController` before adding to history/prompts.

**9. Output and Logging**

- Use `logger.js` for consistent, prefixed, color-coded console output: `[Task]`, `[Plan]`, `[Action]`, `[Observation]`, `[System]`, `[Error]`.

**10. Handling LLM Limitations**

- **10.1. Rate Limits:** Use `RateLimiter` utility in `LLMClient` implementing exponential backoff with jitter. Configurable base delay, max retries.
- **10.2. Context Limits:**
  - **Token Counting:** Use `Tokenizer` utility before sending prompts.
  - **Context Management (in `AgentController`):**
    - **Planner:** Prioritize System Prompt, User Goal, _Summarized_ History, Last 1-2 _Detailed_ Observations. Use LLM-based summarization for older history chunks when nearing limit.
    - **Executor:** Prioritize System Prompt (with Tools), Current Sub-task, Last 1-3 _Detailed_ Observations (esp. errors), relevant file stats/chunk data. Older history is less critical and can be aggressively summarized/truncated.
    - **Large Files:** Explicitly handled via specialized actions (See Section 11), avoiding large content in prompts.

**11. Handling Large Files**

- **11.1. Strategy:** Avoid loading entire large files into the agent's context. Provide tools for the LLM to interact with files piece-by-piece or based on metadata.
  1.  **Metadata Action:** `readFileStats(path: string)` returns `{ success: boolean, size?: number, lineCount?: number, exists: boolean, message: string }`.
  2.  **Chunked Reading Action:** `readFileChunk(path: string, startLine: number, lineCount: number)` or `readFileChunk(path: string, startByte: number, byteCount: number)`. Returns `{ success: boolean, content?: string, readLines?: number, readBytes?: number, isEOF: boolean, message: string }`. The LLM specifies the chunk.
  3.  **Append Action:** `appendFileChunk(path: string, content: string)` adds content to the end. Returns `{ success: boolean, message: string }`.
  4.  **LLM Guidance:** Prompts and tool schemas must guide the LLM to use these actions appropriately for large files.
- **11.2. Implementation (`src/tools/actions/fileSystem.js`):** Implement actions using `fs.promises.stat`, `fs.createReadStream`, `readline`, `fs.promises.appendFile`. Handle errors gracefully.
- **11.3. Observation Formatting:** Observations for these actions must clearly state what was done and the key results (bytes read, lines read, EOF status, file stats).

**12. Code Snippets (Illustrative)**

_(See previous responses for illustrative snippets for `cli.js`, `AgentController.js`, `ActionExecutor.js`, `fileSystem.js` handling large files. These serve as conceptual examples, not final code.)_

**13. Technology Stack**

- **Language:** Node.js (Latest LTS)
- **CLI Framework:** `commander` or `yargs`
- **HTTP Client:** `axios` or `node-fetch` / LLM SDKs
- **Async Handling:** `async/await`
- **Filesystem:** `fs/promises`, `fs` (for streams), `readline`
- **Child Process:** `child_process`
- **Configuration:** `dotenv`
- **Output Formatting:** `chalk`
- **Testing:** `jest`
- **Token Counting:** `gpt-3-encoder` or equivalent tokenizer library.

**14. Test-Driven Development (TDD) Approach**

This project follows TDD using **Jest**. The cycle is Red -> Green -> Refactor.

- **Types of Tests:** Unit Tests (mocking external dependencies like `fs`, `child_process`, LLM APIs), Integration Tests (verifying interactions between components like `AgentController` -> `LLMClient` (mocked) -> `ActionExecutor` (mocked)), Minimal E2E Tests (optional, for critical CLI flows).
- **Focus:** Input/output validation, edge case handling, error handling, parsing logic, action execution results (mocked), interaction between components.

**15. Project Implementation Phases**

Development proceeds in phases, each with specific goals, TDD focus, and acceptance criteria.

- **Phase 1: Project Foundation & Core Utilities**
  - **Goal:** Setup structure, CLI parsing, config, logging, rate limiter, testing environment.
  - **TDD:** Unit tests for config, logger, rate limiter, basic CLI args.
  - **Criteria:** Structure exists, Jest runs, basic CLI works, config loads, logger formats, rate limiter delays (mocked).
- **Phase 2: Action Execution Engine**
  - **Goal:** Implement `ActionExecutor` and core actions (`shell`, basic `fileSystem`, `finish`).
  - **TDD:** Unit tests for actions (mocking `fs`/`child_process`), `ActionExecutor` tests.
  - **Criteria:** Executor registers/calls actions, actions interact with mocks correctly, handle errors, return observation objects.
- **Phase 3: Basic Agent Loop & LLM Integration**
  - **Goal:** Implement `AgentController` basics, history, `LLMClient`, `Tokenizer`. Execute one action via (mocked) LLM.
  - **TDD:** Unit tests for `LLMClient` (mocking API), `Tokenizer`. Integration tests for `AgentController` one-step flow (Prompt -> Mock LLM -> Parse -> Mock Execute -> History).
  - **Criteria:** `LLMClient` sends prompts (mocked), `Tokenizer` estimates, `AgentController` formats simple prompt, parses JSON, calls Executor, updates history for one iteration.
- **Phase 4: Plan/Execute Cycle & Prompt Strategy**
  - **Goal:** Implement distinct Plan/Execute logic in `AgentController`, develop Planner/Executor prompts.
  - **TDD:** Unit tests for prompt generation, `AgentController` integration tests for Plan -> Execute cycle (mocking LLM plan/action responses).
  - **Criteria:** `AgentController` handles Plan/Execute states, generates correct prompts, parses plans/actions, transitions correctly, loop runs multiple iterations (mocked).
- **Phase 5: Context Management & Large File Handling**
  - **Goal:** Implement context window limits (truncation/summarization) and large file actions (`readFileStats`, `readFileChunk`, `appendFileChunk`).
  - **TDD:** Unit tests for context logic, large file actions (mocking `fs`). Integration tests for agent using chunking (mocked LLM guidance). Test `Tokenizer`.
  - **Criteria:** Context limits enforced, large file actions work (mocked), schemas updated, agent uses chunking actions in relevant test scenarios (mocked).
- **Phase 6: Refinement & Error Handling**
  - **Goal:** Improve robustness, error handling, UX (e.g., action confirmation), prompt tuning.
  - **TDD:** Tests for specific errors, user interactions (`--confirm-actions`), edge cases. E2E tests (optional).
  - **Criteria:** Graceful error handling, clear user feedback, agent attempts recovery, confirmation flag works, prompts refined.

**16. Security Considerations**

- **API Keys:** **CRITICAL.** Never hardcode. Use `.env` securely, add to `.gitignore`. Load via `config`.
- **Shell Command Execution:** **HIGHEST RISK.** Sanitize all inputs rigorously. Avoid direct injection of user/LLM output. Use least privilege principle. Implement an optional `--confirm-actions` flag requiring explicit user approval for shell commands and potentially destructive file operations. Consider sandboxing (e.g., Docker) for untrusted tasks or production environments.
- **File System Access:** Validate paths received from the LLM. Prevent directory traversal attacks (`../../`). Limit agent's write access to designated workspace directories if possible. Prefer `appendFileChunk` over actions that overwrite arbitrary parts of files.

**17. Future Enhancements**

- Add more complex actions (web browsing via Puppeteer/Playwright, Git operations).
- Implement sophisticated context summarization techniques.
- Allow user interaction during loops for clarification or confirmation.
- Develop a plugin architecture for easily adding new LLM providers or tools.
- Implement state persistence to resume tasks.
- Build a comprehensive testing framework covering more complex scenarios.
