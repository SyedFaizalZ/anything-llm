---
name: bash-exec
description: Execute bash/shell commands safely in a sandboxed environment (E2B). Use for system info, commands, listing files, checking disk space, date/time, directory operations.
triggers: ["execute bash", "run bash command", "bash script", "shell command", "system info", "list files", "check disk", "current directory"]
negative_triggers: ["install software", "delete files", "modify system"]
allowed_tools: ["bash_exec"]
category: execution
dependencies: []
---

## Workflow

1. Receive shell command request from user
2. Validate command safety and security
3. Execute bash command in E2B sandbox
4. Capture stdout and stderr output
5. Present results to user with explanation

## Example Commands

- Show current directory and date: `pwd && date`
- List files: `ls -lah`
- Check disk space: `df -h`
- Show system info: `uname -a`


# Bash/Shell Command Execution Skill

## Purpose
Execute shell commands and bash scripts in a secure, isolated sandbox environment using E2B.
This skill handles one-off shell commands, system information queries, and file operations.

## Workflow

### Step 1: Validate Command
- Ensure the command is safe and appropriate
- Check for destructive operations (deletion, modifications)
- Reject commands requiring elevated privileges

### Step 2: Execute Bash Command
- Call `bash_exec` tool with the user's command
- Set appropriate timeout (15 seconds)

### Step 3: Parse Output
- Capture stdout and stderr
- Format results clearly
- Include error messages if execution failed

### Step 4: Respond to User
- Show command output
- Explain what the command did
- Provide interpretation if needed

## Tools Available
- `bash_exec(command)` - Execute bash command safely in E2B sandbox

## Example Use Cases

### System Information
User: "Show me current directory, date/time, and available disk space"
```bash
echo "Current directory: $(pwd)"
echo "Date and time: $(date)"
echo "Available disk space: $(df -h)"
```

### File Operations
User: "List all files in current directory"
```bash
ls -lah
```

### System Status
User: "Show memory usage and uptime"
```bash
uname -a
free -h
uptime
```

### Directory Navigation
User: "How many files are in this directory?"
```bash
ls | wc -l
```

## Constraints
- Command execution timeout: 15 seconds
- Sandboxed environment (no real system access)
- No permanent file modifications
- Output limited to text/stdout
- Restricted commands (sudo, rm, etc.) blocked

## When to Use This Skill
✓ User asks to run a bash/shell command
✓ System information query (disk, memory, files)
✓ File listing or inspection
✓ Quick command execution
✓ Directory operations

## When NOT to Use
✗ User wants explanation of bash syntax (not execution)
✗ Complex shell scripts with multiple dependencies
✗ Commands requiring elevated privileges
✗ Anything destructive (file deletion, system modification)
