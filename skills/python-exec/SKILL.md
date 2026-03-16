---
name: python-exec
description: Execute Python code safely in a sandboxed environment (E2B). Use for calculations, data processing, code execution, analysis, and Python scripts.
triggers: ["execute python", "run python code", "python execution", "calculate", "process data", "python script", "analyze data", "compute"]
negative_triggers: ["install packages", "deploy code"]
allowed_tools: ["python_exec"]
category: execution
dependencies: []
---

## Workflow

1. Receive Python code request from user
2. Validate code syntax and safety
3. Execute Python code in E2B sandbox (30s timeout)
4. Capture stdout and stderr output
5. Present results with error handling

## Example Use Cases

- Math calculations: `import math; print(math.sqrt(144))`
- Data processing: Process lists and arrays
- Statistics: Calculate mean, median, standard deviation
- File parsing: JSON, CSV data analysis


# Python Code Execution Skill

## Purpose
Execute Python code in a secure, isolated sandbox environment using E2B.
This skill handles one-off Python scripts, calculations, data processing, and code execution.

## Workflow

### Step 1: Validate Code
- Ensure the user's code is syntactically valid Python
- Check for obvious security issues (file deletion, network access restrictions)

### Step 2: Execute Python Code
- Call `python_exec` tool with the user's code
- Include required imports (if needed)
- Set appropriate timeout

### Step 3: Parse Output
- Capture stdout and stderr
- Format results clearly
- Include error messages if execution failed

### Step 4: Respond to User
- Show execution results
- Explain what the code did
- Provide interpretation of the output

## Tools Available
- `python_exec(code)` - Execute Python code safely in E2B sandbox

## Example Use Cases

### Mathematical Calculation
User: "Calculate the square root of 144 and cube root of 27"
```python
import math
print(f"√144 = {math.sqrt(144)}")
print(f"∛27 = {27**(1/3)}")
```

### Data Processing
User: "Process this list: [1, 2, 3, 4, 5]. Find mean, median, max, min"
```python
import statistics
data = [1, 2, 3, 4, 5]
print(f"Mean: {statistics.mean(data)}")
print(f"Median: {statistics.median(data)}")
print(f"Max: {max(data)}")
print(f"Min: {min(data)}")
```

### JSON Processing
User: "Parse this JSON and extract the name field"
```python
import json
data = json.loads('{"name": "John", "age": 30}')
print(data["name"])
```

## Constraints
- Code execution timeout: 30 seconds
- Sandboxed environment (no system access)
- No permanent file storage
- Output limited to text/stdout

## When to Use This Skill
✓ User explicitly asks to run Python code
✓ Calculations or data processing needed
✓ Code execution for learning/testing
✓ Data analysis or parsing

## When NOT to Use
✗ User just wants Python explanation (not execution)
✗ Complex multi-file projects
✗ Code requiring external packages beyond stdlib
✗ Anything requiring permanent storage
