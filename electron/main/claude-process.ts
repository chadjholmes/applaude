import * as pty from 'node-pty'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { execSync } from 'child_process'

export interface ClaudeProcess {
  id: string
  sessionId: string
  pty: pty.IPty
  cwd: string
  state: 'idle' | 'running' | 'waiting_input' | 'waiting_permission'
}

export interface StartSessionOptions {
  cwd: string
  sessionId?: string
  cliSessionId: string  // Claude CLI session ID for conversation continuity
  isFirstMessage: boolean  // Whether this is the first message in the session
  permissionMode?: string
  model?: string
  prompt?: string
}

// Find the claude executable path - called lazily
let cachedClaudePath: string | null = null

function findClaudePath(): string {
  if (cachedClaudePath) return cachedClaudePath

  // Common paths to check first (fastest)
  const home = process.env.HOME || ''
  const commonPaths = [
    `${home}/.nvm/versions/node/v20.19.2/bin/claude`,
    `${home}/.local/bin/claude`,
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ]

  for (const p of commonPaths) {
    try {
      require('fs').accessSync(p, require('fs').constants.X_OK)
      cachedClaudePath = p
      console.log('Found claude at:', p)
      return p
    } catch {
      // Continue
    }
  }

  // Try which command as fallback
  try {
    const result = execSync('bash -l -c "which claude"', { encoding: 'utf8' }).trim()
    if (result) {
      cachedClaudePath = result
      console.log('Found claude via which:', result)
      return result
    }
  } catch (e) {
    console.error('which claude failed:', e)
  }

  // Last resort
  console.warn('Could not find claude, using bare command')
  cachedClaudePath = 'claude'
  return 'claude'
}

export class ClaudeProcessManager extends EventEmitter {
  private processes: Map<string, ClaudeProcess> = new Map()

  /**
   * Start a new Claude CLI session
   */
  startSession(options: StartSessionOptions): string {
    const processId = uuidv4()
    const sessionId = options.sessionId || uuidv4()

    const args: string[] = [
      '--output-format', 'stream-json',
      '--verbose',
    ]

    // For first message, just set session ID
    // For subsequent messages, use --continue to resume the conversation
    if (options.isFirstMessage) {
      args.push('--session-id', options.cliSessionId)
    } else {
      args.push('--continue')
    }

    // Set permission mode - default to accepting edits for smoother UX
    // In -p mode with stream-json, interactive permission prompts don't work
    const permMode = options.permissionMode || 'bypassPermissions'
    args.push('--permission-mode', permMode)

    if (options.model) {
      args.push('--model', options.model)
    }

    // Use -p flag with prompt for non-interactive mode
    if (options.prompt) {
      args.push('-p', options.prompt)
    }

    // Get the user's shell environment PATH
    let envPath = process.env.PATH || ''
    try {
      const shellPath = execSync('echo $PATH', { encoding: 'utf8', shell: '/bin/bash' }).trim()
      if (shellPath) {
        envPath = shellPath
      }
    } catch {
      // Use default PATH
    }

    const claudePath = findClaudePath()
    console.log('Starting Claude with path:', claudePath)
    console.log('Args:', args)
    console.log('CWD:', options.cwd)

    // Build the command string for bash
    const escapedArgs = args.map(a => {
      if (a.includes(' ') || a.includes("'") || a.includes('"')) {
        return `'${a.replace(/'/g, "'\\''")}'`
      }
      return a
    })

    // Build command - Claude CLI already handles streaming well
    const cmd = `${claudePath} ${escapedArgs.join(' ')}`
    console.log('Command:', cmd)

    const ptyProcess = pty.spawn('/bin/bash', ['-l', '-c', cmd], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: options.cwd,
      env: {
        ...process.env,
        PATH: envPath,
        TERM: 'xterm-256color',
        // Force unbuffered output
        PYTHONUNBUFFERED: '1',
      } as { [key: string]: string },
    })

    const claudeProcess: ClaudeProcess = {
      id: processId,
      sessionId,
      pty: ptyProcess,
      cwd: options.cwd,
      state: 'running',
    }

    this.processes.set(processId, claudeProcess)

    // Handle output - emit immediately for real-time streaming
    ptyProcess.onData((data: string) => {
      try {
        console.log('Claude output:', data.slice(0, 200))
        this.emit('data', { processId, sessionId, data })
      } catch (error) {
        console.error('Error emitting data:', error)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      try {
        console.log(`Process ${processId} exited with code ${exitCode}`)
        this.emit('exit', { processId, sessionId, exitCode })
        this.processes.delete(processId)
      } catch (error) {
        console.error('Error handling process exit:', error)
      }
    })

    return processId
  }

  /**
   * Send input to a running Claude process
   */
  sendInput(processId: string, input: string): void {
    const proc = this.processes.get(processId)
    if (!proc) throw new Error(`Process ${processId} not found`)

    proc.pty.write(input + '\n')
  }

  /**
   * Send a permission response
   */
  sendPermissionResponse(processId: string, allow: boolean): void {
    const proc = this.processes.get(processId)
    if (!proc) {
      console.error(`Process ${processId} not found for permission response`)
      throw new Error(`Process ${processId} not found`)
    }

    console.log(`Sending permission response: ${allow ? 'ALLOW' : 'DENY'} to process ${processId}`)

    if (allow) {
      // Try multiple ways to allow - Enter key
      proc.pty.write('\r')
    } else {
      // Escape key to deny
      proc.pty.write('\x1b')
    }
  }

  /**
   * Resize the PTY
   */
  resize(processId: string, cols: number, rows: number): void {
    const proc = this.processes.get(processId)
    if (proc) {
      proc.pty.resize(cols, rows)
    }
  }

  /**
   * Kill a specific process
   */
  kill(processId: string): void {
    const proc = this.processes.get(processId)
    if (proc) {
      proc.pty.kill()
      this.processes.delete(processId)
    }
  }

  /**
   * Kill all processes (for cleanup)
   */
  killAll(): void {
    for (const proc of this.processes.values()) {
      proc.pty.kill()
    }
    this.processes.clear()
  }

  getProcess(processId: string): ClaudeProcess | undefined {
    return this.processes.get(processId)
  }

  getAllProcesses(): ClaudeProcess[] {
    return Array.from(this.processes.values())
  }
}
