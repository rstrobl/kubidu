# Issue #002: Build & Runtime Log Streaming

**Priority:** 🔴 P0 (MUST-HAVE)  
**Effort:** 3-4 days  
**Assignee:** TBD  
**Labels:** `feature`, `blocking`, `observability`, `websocket`

---

## 📋 Summary

Implement real-time log streaming for both build processes and running containers. Developers cannot debug without logs - this is the #1 support request for any PaaS.

## 🎯 Acceptance Criteria

- [ ] Build logs stream in real-time during deployment
- [ ] Runtime logs stream from running pods
- [ ] Logs viewable in dashboard UI
- [ ] CLI command `kubidu logs -f` works
- [ ] Log history persisted (last 7 days)
- [ ] Multi-replica log aggregation
- [ ] Log search/filter functionality

## 🔧 Technical Implementation

### 1. WebSocket Gateway for Logs

```typescript
// packages/api/src/modules/logs/logs.gateway.ts
import { WebSocketGateway, SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ 
  namespace: '/logs',
  cors: { origin: '*' }
})
export class LogsGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('subscribe:build')
  async subscribeToBuildLogs(client: Socket, payload: { deploymentId: string }) {
    const { deploymentId } = payload;
    
    // Verify user has access to this deployment
    const canAccess = await this.logsService.verifyAccess(client.user.id, deploymentId);
    if (!canAccess) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    client.join(`build:${deploymentId}`);
    
    // Send historical logs first
    const history = await this.logsService.getBuildLogs(deploymentId);
    client.emit('logs:history', history);
  }

  @SubscribeMessage('subscribe:runtime')
  async subscribeToRuntimeLogs(client: Socket, payload: { serviceId: string }) {
    const { serviceId } = payload;
    
    client.join(`runtime:${serviceId}`);
    
    // Start streaming from K8s
    this.logsService.streamPodLogs(serviceId, (log) => {
      this.server.to(`runtime:${serviceId}`).emit('log', log);
    });
  }
}
```

### 2. Build Log Capture

```typescript
// packages/build-service/src/services/build.service.ts

async buildImage(job: Job<BuildJobData>) {
  const { deploymentId, repoUrl, branch } = job.data;
  
  // Spawn docker build with log streaming
  const buildProcess = spawn('docker', ['build', '-t', imageTag, '.'], {
    cwd: repoPath,
  });

  buildProcess.stdout.on('data', (data) => {
    const line = data.toString();
    this.emitBuildLog(deploymentId, line, 'stdout');
    this.persistBuildLog(deploymentId, line);
  });

  buildProcess.stderr.on('data', (data) => {
    const line = data.toString();
    this.emitBuildLog(deploymentId, line, 'stderr');
    this.persistBuildLog(deploymentId, line);
  });
}

private emitBuildLog(deploymentId: string, message: string, stream: string) {
  // Emit to Redis pub/sub for API to pick up
  this.redis.publish('build-logs', JSON.stringify({
    deploymentId,
    message,
    stream,
    timestamp: new Date().toISOString(),
  }));
}
```

### 3. Runtime Log Streaming from K8s

```typescript
// packages/api/src/modules/logs/logs.service.ts

async streamPodLogs(serviceId: string, callback: (log: LogEntry) => void) {
  const namespace = await this.getNamespaceForService(serviceId);
  const labelSelector = `kubidu.io/service-id=${serviceId}`;
  
  const pods = await this.k8sCoreApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, labelSelector);
  
  for (const pod of pods.body.items) {
    const stream = await this.k8sCoreApi.readNamespacedPodLog(
      pod.metadata.name,
      namespace,
      undefined, // container
      true,      // follow
      undefined, // insecureSkipTLSVerify
      undefined, // limitBytes
      undefined, // pretty
      undefined, // previous
      undefined, // sinceSeconds
      100,       // tailLines
      true,      // timestamps
    );

    stream.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        callback({
          podName: pod.metadata.name,
          message: line,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }
}
```

### 4. Log Persistence

```typescript
// Store logs in Redis with TTL
async persistBuildLog(deploymentId: string, message: string) {
  const key = `logs:build:${deploymentId}`;
  await this.redis.rpush(key, JSON.stringify({
    message,
    timestamp: Date.now(),
  }));
  await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 days TTL
}
```

### 5. CLI Integration

```typescript
// packages/cli/src/commands/logs.ts
export const logsCommand = new Command('logs')
  .description('Stream logs from your service')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <n>', 'Number of lines to show', '100')
  .option('--build', 'Show build logs instead of runtime')
  .action(async (options) => {
    const { serviceId } = requireService();
    
    if (options.build) {
      await streamBuildLogs(serviceId, options);
    } else {
      await streamRuntimeLogs(serviceId, options);
    }
  });

async function streamRuntimeLogs(serviceId: string, options: any) {
  const ws = new WebSocket(`${API_WS_URL}/logs`);
  
  ws.on('open', () => {
    ws.send(JSON.stringify({
      event: 'subscribe:runtime',
      data: { serviceId },
    }));
  });

  ws.on('message', (data) => {
    const log = JSON.parse(data.toString());
    console.log(chalk.dim(log.timestamp), log.message);
  });

  if (!options.follow) {
    setTimeout(() => ws.close(), 5000);
  }
}
```

### 6. UI Component

```tsx
// packages/web/src/components/logs/LogViewer.tsx
export function LogViewer({ serviceId, deploymentId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(`${API_URL}/logs`);
    
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.emit('subscribe:runtime', { serviceId });
    
    socket.on('log', (log: LogEntry) => {
      setLogs(prev => [...prev.slice(-1000), log]); // Keep last 1000
    });

    socket.on('logs:history', (history: LogEntry[]) => {
      setLogs(history);
    });

    return () => socket.disconnect();
  }, [serviceId]);

  // Auto-scroll
  useEffect(() => {
    logContainerRef.current?.scrollTo(0, logContainerRef.current.scrollHeight);
  }, [logs]);

  return (
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400">Logs</span>
        <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>
      <div ref={logContainerRef} className="h-96 overflow-auto">
        {logs.map((log, i) => (
          <div key={i} className="text-gray-300 whitespace-pre-wrap">
            <span className="text-gray-500">{formatTime(log.timestamp)}</span>
            {' '}{log.message}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 📁 Files to Create/Modify

- [ ] `packages/api/src/modules/logs/logs.module.ts` (create)
- [ ] `packages/api/src/modules/logs/logs.gateway.ts` (create)
- [ ] `packages/api/src/modules/logs/logs.service.ts` (create)
- [ ] `packages/build-service/src/services/build.service.ts` (add log emission)
- [ ] `packages/cli/src/commands/logs.ts` (update for streaming)
- [ ] `packages/web/src/components/logs/LogViewer.tsx` (create)
- [ ] `packages/web/src/pages/ServiceDetail.tsx` (add LogViewer)

## 🧪 Test Cases

1. Deploy app → see build logs in real-time
2. App running → see runtime logs
3. Multiple replicas → logs aggregated
4. Disconnect/reconnect → logs resume
5. CLI `kubidu logs -f` → streams continuously

## 🚫 Out of Scope (for now)

- Log export to external systems (Datadog, etc.)
- Log-based alerting
- Structured log parsing

## 📚 References

- [K8s client-node logs](https://github.com/kubernetes-client/javascript/blob/master/examples/follow-logs.js)
- [Socket.IO docs](https://socket.io/docs/v4/)
- [Railway log streaming](https://docs.railway.app/develop/logs)

---

*Created: 2026-02-09*
