---
name: hello-world
description: A demo skill showing how to bundle scripts with skills.
metadata:
  octobot:
    emoji: "👋"
---

# Hello World Skill

This is a demo skill showing the complete skill structure with scripts.

## Quick Start

Run the hello script:

```bash
bash {baseDir}/scripts/hello.sh
```

Run with a name:

```bash
bash {baseDir}/scripts/hello.sh "Alice"
```

## Process Data

Use the Python script to process JSON data:

```bash
echo '{"name": "test", "value": 42}' | python3 {baseDir}/scripts/process.py
```

## Available Scripts

- `scripts/hello.sh` - Bash hello script
- `scripts/process.py` - Python data processor

## References

See `references/examples.md` for more usage examples.
