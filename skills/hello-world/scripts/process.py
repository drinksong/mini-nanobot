#!/usr/bin/env python3
"""
Data processor for hello-world skill.
Reads JSON from stdin and processes it.
"""

import json
import sys

def process_data(data):
    """Process input data and add metadata."""
    result = {
        "input": data,
        "processed": True,
        "timestamp": __import__('datetime').datetime.now().isoformat(),
        "skill": "hello-world"
    }
    
    # Add some computed fields
    if isinstance(data, dict):
        result["keys"] = list(data.keys())
        result["key_count"] = len(data.keys())
    
    return result

def main():
    try:
        # Read JSON from stdin
        input_data = json.load(sys.stdin)
        
        # Process
        result = process_data(input_data)
        
        # Output
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON - {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
