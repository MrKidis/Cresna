# Optional Ollama adapter

Cresna’s default production AI path is the server-side OpenRouter adapter in `server/_core/llm.ts`. Ollama is an optional self-hosted adapter for teams that explicitly provide a persistent machine with enough CPU/GPU capacity. GitHub stores this configuration, but GitHub Pages and a Vercel serverless function do not run a persistent Ollama process.

## Tool contract

Any Ollama adapter must accept the same evidence-bound request shape as the OpenRouter path: a system message, a merchant-authorized evidence snapshot, a user request, and optional tool definitions. Tools must be allowlisted server functions. A model response may propose a tool call, but the Cresna server must validate arguments, enforce workspace ownership, execute only approved read operations, and append the result as a tool message before asking for the final response. Write operations always require an explicit merchant approval mutation and an audit record.

The minimum safe tool names are `read_connected_store_snapshot`, `calculate_growth_rate`, `compare_price_position`, and `draft_reviewable_change`. There is no generic shell, HTTP, filesystem, SQL, or arbitrary code-execution tool exposed to a model.

## Local or private-network service definition

The optional compose file is intentionally separate from the Vercel deployment and does not publish Ollama to the public internet:

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    volumes:
      - ollama-data:/root/.ollama
    networks:
      - cresna-ai

networks:
  cresna-ai:
    internal: true

volumes:
  ollama-data:
```

The Cresna API adapter must run on the same private network and use an internal URL such as `http://ollama:11434`. Never place that URL or an Ollama credential in the browser bundle. For production, configure a firewall or private-network policy so port `11434` is not reachable from the public internet, add request authentication at the adapter boundary, and set a model allowlist. If those requirements are unavailable, leave Ollama disabled and use OpenRouter through Vercel.

## Vercel behavior

Vercel remains the production host for the frontend, API routes, token verification, webhooks, database access, and server-side OpenRouter calls. It does not host an always-on Ollama model process in this project. The optional adapter must never block the default deployment or silently fall back to an unauthenticated public model endpoint.
