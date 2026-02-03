# Problem

LLMs cannot directly analyze the site contents to understand the data models used and their schema, thus not able generate malloy queries.

## Propasal

Create `llms.txt` build at build time that uses the internal vite import.meta to gather context of malloy models and schema. Structure this for llm consumption in a single file so that llms can fully comprehend the data models support by the site, the site sturcture, how to issue arbitary queries and download data.
