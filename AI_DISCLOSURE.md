# AI Disclosure Form

**Project:** Volunteer Service Management System (VSMS)  
**Course:** Computer Application Development — Capstone  
**Institution:** Conestoga College  
**Date:** April 2026  

**Team Members:**
- Bo Yang
- Bo Zhang
- Chunxi Zhang
- Marieth Perez Zevallos

---

## Purpose

This document discloses the use of Artificial Intelligence (AI) tools during the development of the VSMS capstone project, in accordance with Conestoga College's academic integrity policies regarding generative AI. It covers both AI tools used to assist development and AI technology integrated as a feature within the product itself.

---

## Section A — AI Tools Used During Development

The following AI tools were used to assist team members during the design, development, and documentation phases of this project. All AI-generated content was reviewed, validated, and modified by team members before being incorporated into the codebase or documentation.

| Tool | Provider | Primary Use |
|------|----------|-------------|
| Claude / Claude Code | Anthropic | Code generation, code review, architecture analysis, debugging, technical documentation |
| ChatGPT / GPT-4 | OpenAI | Problem-solving, research, explaining concepts |
| Codex | OpenAI | Code autocompletion and generation |
| Lovable | Lovable Technologies | UI/UX design mockup generation |
| Antigravity | Antigravity AI | AI coding assistant — autonomous code generation and task execution |
| Gemini | Google | Code generation, problem-solving, research |

### How AI Tools Were Used

- **Code Assistance**: Generating boilerplate, suggesting implementations, and debugging specific components. All generated code was reviewed, tested, and adapted by the team.
- **Architecture & Design**: Consulting AI tools to evaluate design decisions, review patterns (CQRS, Orleans actor model), and explore alternatives.
- **Documentation**: Drafting sections of technical documentation, README files, and comments. All content was reviewed and edited for accuracy.
- **Learning & Research**: Using AI to understand unfamiliar technologies (e.g., Microsoft Orleans, Amazon Bedrock, EF Core) and validate approaches.

### Scope and Limitations

AI tools were **not** used to:
- Complete assignments, reports, or deliverables submitted for evaluation without disclosure
- Replace original thinking in system design and architecture decisions
- Generate test data or simulate results that misrepresent actual system behavior

---

## Section B — AI Integrated in the Product

The VSMS platform includes an AI-powered assistant as a **product feature**. This is distinct from AI tools used during development.

| Component | Technology | Description |
|-----------|-----------|-------------|
| In-App AI Assistant | Amazon Bedrock (AWS) | Conversational assistant accessible to volunteers, coordinators, and admins within the platform |
| LLM Model | Amazon Nova Lite (`us.amazon.nova-2-lite-v1:0`) | Hosted on AWS ca-central-1 region |
| API Endpoints | `POST /api/ai/chat`, `GET /api/ai/tools`, `POST /api/ai/tools/run` | Backend-proxied endpoints; no API keys are exposed to the browser |

The AI assistant provides role-aware help for:
- **Volunteers**: Finding opportunities, tracking applications, understanding check-in requirements
- **Coordinators**: Managing events, reviewing applications, configuring approval policies
- **Admins**: System oversight, dispute resolution, user and organization management

All LLM inference is processed server-side through AWS IAM roles; no model API keys are stored in frontend code.

---

## Section C — Human Review and Verification

The team ensured that AI-assisted work met quality and correctness standards through the following practices:

- **Code Review**: All code, whether AI-assisted or manually written, was subject to peer review via pull requests before merging.
- **Manual Testing**: Core features (geo check-in, application workflows, certificate generation, attendance disputes) were tested end-to-end against a live backend environment.
- **Architecture Validation**: System design decisions were validated by the full team and not delegated solely to AI suggestions.
- **Documentation Accuracy**: AI-drafted documentation was verified against the actual implementation for correctness.
- **Security Review**: Authentication flows, JWT handling, and API exposure were reviewed manually to ensure no AI-introduced vulnerabilities.

---

## Section D — Academic Integrity Statement

We, the undersigned, declare that:

1. The use of AI tools disclosed in this document was conducted in accordance with Conestoga College's policies on generative AI and academic integrity.
2. AI tools were used as assistants to support our learning and development process, not to replace our own understanding, judgment, or original contributions.
3. All final code, design decisions, and deliverables represent the genuine work of our team, informed and shaped by our own knowledge and critical review.
4. Any AI-generated content included in this project has been clearly attributed, reviewed, and modified as appropriate.
5. We take full responsibility for the accuracy, correctness, and integrity of all work submitted as part of this capstone project.

---

**Bo Yang** 

**Bo Zhang** 
**Chunxi Zhang** 

**Marieth Perez Zevallos** — 

---

*This disclosure was prepared in April 2026 for the Conestoga College CAD Capstone project.*
