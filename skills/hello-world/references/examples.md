# Hello World Skill - Examples

## Example 1: Basic Hello

```bash
bash scripts/hello.sh
# Output:
# 👋 Hello, World!
# This message is from the hello-world skill.
# Current time: Mon Feb 12 10:30:00 UTC 2026
```

## Example 2: Hello with Name

```bash
bash scripts/hello.sh "Alice"
# Output:
# 👋 Hello, Alice!
# This message is from the hello-world skill.
# Current time: Mon Feb 12 10:30:00 UTC 2026
```

## Example 3: Process JSON Data

```bash
echo '{"name": "test", "value": 42}' | python3 scripts/process.py
# Output:
# {
#   "input": {
#     "name": "test",
#     "value": 42
#   },
#   "processed": true,
#   "timestamp": "2026-02-12T10:30:00.000000",
#   "skill": "hello-world",
#   "keys": ["name", "value"],
#   "key_count": 2
# }
```

## Example 4: Process Complex Data

```bash
cat << 'EOF' | python3 scripts/process.py
{
  "users": [
    {"name": "Alice", "role": "admin"},
    {"name": "Bob", "role": "user"}
  ],
  "count": 2
}
EOF
```

## Best Practices

1. Always use `{baseDir}` placeholder to reference script paths
2. Check script exit codes for error handling
3. Use `python3` explicitly instead of `python`
4. Quote variables in bash scripts to handle spaces
